import json
import asyncio
from datetime import datetime
from app.config import settings
from app.services.chroma_service import get_doc_collection, get_corpus_collection
from app.services.ollama_service import ollama_generate
from app.services.embedding_service import embed, embed_batch
from app.services.corpus_service import load_corpus_controls
from app.services import storage_service
import os

# How many controls to check via semantic retrieval — kept small so analysis finishes fast
MAX_CONTROLS_TO_CHECK = 20


def create_analysis(document_id: str, document_title: str, language: str) -> str:
    import uuid
    analysis_id = str(uuid.uuid4())
    analysis = {
        "id": analysis_id,
        "document_id": document_id,
        "document_title": document_title,
        "detected_language": language,
        "status": "queued",
        "progress": 0,
        "message": "Sıraya alındı...",
        "started_at": datetime.now().isoformat(),
        "completed_at": None,
        "executive_summary": "",
        "risk_level": "medium",
        "total_controls": 0,
        "compliant_count": 0,
        "partial_count": 0,
        "missing_count": 0,
        "gaps": [],
        "recommendations": [],
        "document_classification": None,
        "error": None,
    }
    storage_service.save_analysis(analysis)
    return analysis_id


def get_progress(analysis_id: str) -> dict | None:
    a = storage_service.get_analysis(analysis_id)
    if not a:
        return None
    return {
        "id": a["id"],
        "status": a["status"],
        "progress": a["progress"],
        "message": a.get("message", ""),
        "started_at": a["started_at"],
        "completed_at": a.get("completed_at"),
        "error": a.get("error"),
    }


def get_result(analysis_id: str) -> dict | None:
    return storage_service.get_analysis(analysis_id)


def _update(analysis_id: str, **kwargs):
    a = storage_service.get_analysis(analysis_id)
    if not a:
        return
    a.update(kwargs)
    storage_service.save_analysis(a)


async def run_analysis(analysis_id: str):
    analysis = storage_service.get_analysis(analysis_id)
    if not analysis:
        return

    document_id = analysis["document_id"]
    language    = "en" if analysis.get("detected_language") == "en" else "az"

    try:
        _update(analysis_id, status="parsing", progress=10, message="Sənəd emal edilir...")

        doc_record = storage_service.get_document(document_id)
        extracted = doc_record.get("extracted_text") if doc_record else None
        doc_texts = [extracted] if extracted and extracted.strip() else []

        if not doc_texts:
            try:
                doc_collection = get_doc_collection(document_id)
                doc_chunks = doc_collection.get(include=["documents"])
                doc_texts = doc_chunks.get("documents", []) if doc_chunks else []
            except Exception as exc:
                print(f"[Analysis] Document index unavailable: {exc}")

        if not doc_texts:
            _update(analysis_id, status="failed", error="Sənəd mətninə daxil olmaq mümkün olmadı", progress=0)
            return

        _update(analysis_id, status="embedding", progress=20, message="Sənəd analiz edilir...")

        # Use multiple representative queries to get broad coverage from corpus
        doc_context_full = " ".join(doc_texts)
        # Build 3 different query perspectives for better recall
        query_snippets = [
            doc_context_full[:1500],
            doc_context_full[1500:3000] if len(doc_context_full) > 1500 else doc_context_full[:1500],
            doc_context_full[-1500:] if len(doc_context_full) > 3000 else doc_context_full[:1500],
        ]

        _update(analysis_id, status="analyzing", progress=30, message="Uyğun nəzarətlər seçilir...")

        seen_ids: set[str] = set()
        controls_to_check: list[dict] = []

        try:
            corpus_collection = get_corpus_collection()
            # Query corpus with each snippet to get diverse, relevant controls
            for snippet in query_snippets:
                emb = await embed(snippet)
                results = corpus_collection.query(
                    query_embeddings=[emb],
                    n_results=10,
                    include=["documents", "metadatas", "distances"],
                )
                if results and results.get("metadatas"):
                    for meta, doc in zip(results["metadatas"][0], results["documents"][0]):
                        meta = meta or {}
                        cid = meta.get("control_id", "")
                        if cid and cid not in seen_ids and len(controls_to_check) < MAX_CONTROLS_TO_CHECK:
                            seen_ids.add(cid)
                            controls_to_check.append({
                                "id": cid,
                                "source": meta.get("source", ""),
                                "category": meta.get("category", ""),
                                "requirement_text": doc,
                                "language": meta.get("language", "en"),
                            })
        except Exception as exc:
            print(f"[Analysis] Corpus index unavailable: {exc}")

        if not controls_to_check:
            controls_to_check = load_corpus_controls()[:MAX_CONTROLS_TO_CHECK]

        _update(analysis_id, progress=38, message=f"Phase 1: Sənəd klassifikasiyası... ({len(controls_to_check)} nəzarət seçildi)")

        doc_context_short = doc_context_full[:3000]
        classification = await _classify_document(doc_context_short, language)
        _update(analysis_id, document_classification=classification, progress=45,
                message=f"Klassifikasiya: {classification.get('detected_type', '?')}")

        # Filter controls to only those matching the detected applicable standard
        detected_standard = (classification.get("applicable_standard") or "").strip()
        if detected_standard and controls_to_check:
            filtered = [
                c for c in controls_to_check
                if detected_standard.lower() in c.get("source", "").lower()
                or c.get("source", "").lower() in detected_standard.lower()
            ]
            if filtered:
                controls_to_check = filtered

        # Phase 2: Gap analysis — run controls concurrently in small batches
        total = len(controls_to_check)
        gaps: list[dict] = []
        compliant = partial = missing = 0

        lang_name    = "Azərbaycan" if language == "az" else "English"
        respond_lang = f"Yalnız {lang_name} dilində cavab ver." if language == "az" else f"Respond ONLY in {lang_name}."

        # Compact doc context for per-control checks (keep it short for speed)
        doc_context_compact = _build_analysis_context(doc_context_full)

        CONCURRENT = 3  # run 3 LLM calls in parallel
        batch_size = CONCURRENT
        for batch_start in range(0, total, batch_size):
            batch = controls_to_check[batch_start: batch_start + batch_size]
            pct   = 45 + int(40 * (batch_start / total))
            _update(analysis_id, progress=pct,
                    message=f"Phase 2: Gap analiz: {batch_start + len(batch)}/{total}")

            tasks = [
                _analyze_single_control(ctrl, doc_context_compact, language, respond_lang)
                for ctrl in batch
            ]
            results_batch = await asyncio.gather(*tasks, return_exceptions=True)

            for ctrl, res in zip(batch, results_batch):
                if isinstance(res, Exception):
                    gap = _fallback_gap(ctrl, language)
                else:
                    gap = res
                gaps.append(gap)
                if gap["status"] == "compliant":
                    compliant += 1
                elif gap["status"] == "partial":
                    partial += 1
                else:
                    missing += 1

            # Save partial results after each batch — enables real-time viewing
            _update(analysis_id, gaps=gaps, compliant_count=compliant,
                    partial_count=partial, missing_count=missing,
                    total_controls=len(gaps))

        _update(analysis_id, status="generating_report", progress=88,
                message="Hesabat hazırlanır...")

        risk_level = _calculate_risk(compliant, partial, missing, len(doc_context_full))
        executive_summary = await _generate_executive_summary(
            analysis["document_title"], classification, gaps,
            compliant, partial, missing, risk_level, language, respond_lang
        )
        recommendations = await _generate_recommendations(gaps, language, respond_lang)

        _update(
            analysis_id,
            status="completed", progress=100, message="Analiz tamamlandı",
            completed_at=datetime.now().isoformat(),
            executive_summary=executive_summary, risk_level=risk_level,
            total_controls=total, compliant_count=compliant,
            partial_count=partial, missing_count=missing,
            gaps=gaps, recommendations=recommendations,
            document_classification=classification,
        )

        if settings.cleanup_temp_files:
            for f in settings.uploads_dir.glob(f"{document_id}*"):
                try:
                    os.remove(f)
                except Exception:
                    pass

    except Exception as e:
        _update(analysis_id, status="failed", error=str(e), progress=0,
                message=f"Xəta: {str(e)[:200]}")


# ── Phase 1: Classification ──

async def _classify_document(doc_context: str, language: str) -> dict:
    if language == "az":
        system = (
            "Sən IT Audit ekspertisən. Sənədin növünü, uyğun standartı və əsas bendləri müəyyən et. "
            "Yalnız JSON formatında cavab ver."
        )
        prompt = f"""Sənəd mətni:
{doc_context[:2000]}

Cavabı bu JSON formatında ver (başqa heç nə yazma):
{{"detected_type": "sənəd növü", "applicable_standard": "standart adı", "primary_clauses": ["bend 1", "bend 2"]}}"""
    else:
        system = (
            "You are an IT Audit expert. Identify the document type, applicable standard and primary clauses. "
            "Respond ONLY in JSON format."
        )
        prompt = f"""Document text:
{doc_context[:2000]}

Respond in this JSON format (nothing else):
{{"detected_type": "document type", "applicable_standard": "standard name", "primary_clauses": ["clause 1", "clause 2"]}}"""

    try:
        response = await ollama_generate(prompt, system)
        response = response.strip()
        for marker in ("```json", "```"):
            if marker in response:
                response = response.split(marker)[1].split("```")[0].strip()
                break
        result = json.loads(response)
        return {
            "detected_type":       result.get("detected_type", ""),
            "applicable_standard": result.get("applicable_standard", ""),
            "primary_clauses":     result.get("primary_clauses", []),
        }
    except Exception:
        return {"detected_type": "", "applicable_standard": "", "primary_clauses": []}


# ── Phase 2: Per-control gap check ──

async def _analyze_single_control(
    control: dict, doc_context: str, language: str, respond_lang: str
) -> dict:
    control_text = control["requirement_text"]

    if language == "az":
        system = (
            "Sən qabaqcıl IT Audit və GRC ekspertisən. Vəzifən müəyyən bir nəzarət tələbini sənəd mətninə qarşı DƏQİQ qiymətləndirməkdir. "
            "Hər qiymətləndirmə sənəd mətnindən KONKRET sübutla əsaslandırılmalıdır. "
            "Status meyarları: "
            "- compliant: Sənəddə bu tələb tam örtülür, konkret mətn və ya prosedur mövcuddur. "
            "- partial: Sənəddə tələb qismən örtülür, bəzi elementlər yoxdur və ya qeyri-səlisdir. "
            "- missing: Sənəddə bu tələb üçün heç bir sübut yoxdur. "
            "Yalnız JSON formatında cavab ver."
        )
        prompt = f"""NƏZARƏT TƏLƏBİ (standartdan):
{control_text[:600]}

SƏNƏD MƏTNİ (analiz edilən):
{doc_context[:2000]}

DƏQİQ qiymətləndirmə et. Sənəd mətnində konkret sübut axtar.

JSON formatında cavab ver (başqa heç nə yazma):
{{"status":"compliant|partial|missing","justification":"dəqiq izah - sənəddə nə var/yox","standard_requirement":"tələbin qısa xülasəsi","current_document_text":"sənəddən uyğun mətn və ya 'tapılmadı'","gap_analysis":"boşluq varsa detallı təsviri","remediation_proposal":"tövsiyə","potential_risks":"bu boşluq hansı risklər yaradır (qısa)","evidence_snippet":"sənəddən sübut hissəsi və ya boş","evidence_reference":"sənəddə harada tapıldı"}}"""
    else:
        system = (
            "You are a senior IT Audit and GRC expert. Your task is to PRECISELY evaluate a specific control requirement against document text. "
            "Every assessment MUST be justified with CONCRETE evidence from the document. "
            "Status criteria: "
            "- compliant: The document fully covers this requirement with specific text or procedures. "
            "- partial: The document partially covers the requirement, some elements are missing or vague. "
            "- missing: No evidence for this requirement exists in the document. "
            "Respond ONLY in JSON format."
        )
        prompt = f"""CONTROL REQUIREMENT (from standard):
{control_text[:600]}

DOCUMENT TEXT (under analysis):
{doc_context[:2000]}

Evaluate PRECISELY. Search for concrete evidence in the document text.

Respond in JSON (nothing else):
{{"status":"compliant|partial|missing","justification":"detailed explanation - what exists/missing in document","standard_requirement":"brief summary of requirement","current_document_text":"relevant text from document or 'not found'","gap_analysis":"detailed gap description if any","remediation_proposal":"recommendation","potential_risks":"what risks this gap creates (brief)","evidence_snippet":"evidence excerpt from document or empty","evidence_reference":"where in document it was found"}}"""

    try:
        response = await ollama_generate(prompt, system)
        response = response.strip()
        for marker in ("```json", "```"):
            if marker in response:
                response = response.split(marker)[1].split("```")[0].strip()
                break
        result   = json.loads(response)
        status   = result.get("status", "missing")
        if status not in ("compliant", "partial", "missing"):
            status = "missing"
        return {
            "control_id":            control["id"],
            "control_source":        control["source"],
            "control_category":      control["category"],
            "control_text":          control_text,
            "status":                status,
            "standard_requirement":  result.get("standard_requirement", control_text),
            "current_document_text": result.get("current_document_text", ""),
            "justification":         result.get("justification", ""),
            "gap_analysis":          result.get("gap_analysis", ""),
            "remediation_proposal":  result.get("remediation_proposal", ""),
            "potential_risks":       result.get("potential_risks", ""),
            "evidence_snippet":      result.get("evidence_snippet", ""),
            "evidence_reference":    result.get("evidence_reference", ""),
        }
    except Exception:
        return _fallback_gap(control, language)


def _fallback_gap(control: dict, language: str) -> dict:
    return {
        "control_id":            control["id"],
        "control_source":        control["source"],
        "control_category":      control["category"],
        "control_text":          control["requirement_text"],
        "status":                "missing",
        "standard_requirement":  control["requirement_text"],
        "current_document_text": "",
        "justification":         "Qiymətləndirmə zamanı xəta" if language == "az" else "Error during assessment",
        "gap_analysis":          "",
        "remediation_proposal":  "",
        "potential_risks":       "",
        "evidence_snippet":      "",
        "evidence_reference":    "",
    }


def _build_analysis_context(document_text: str, limit: int = 7000) -> str:
    if len(document_text) <= limit:
        return document_text
    head = int(limit * 0.6)
    tail = limit - head
    return f"{document_text[:head]}\n\n[ Sənədin orta hissəsi ixtisar edilib ]\n\n{document_text[-tail:]}"


def _calculate_risk(compliant: int, partial: int, missing: int, doc_size: int = 0) -> str:
    total = compliant + partial + missing
    if total == 0:
        return "medium"

    missing_ratio = missing / total
    non_compliant = missing + partial
    non_compliant_ratio = non_compliant / total

    # Partial findings alone do not justify a critical classification.
    if missing == 0:
        return "medium" if partial_ratio(partial, total) >= 0.5 else "low"
    if missing >= 8 and missing_ratio >= 0.6:
        return "critical"
    if missing >= 4 and missing_ratio >= 0.4:
        return "high"
    if missing >= 2 and (missing_ratio >= 0.2 or non_compliant_ratio >= 0.5):
        return "high"
    if missing_ratio >= 0.1 or partial >= 2:
        return "medium"
    return "low"


def partial_ratio(partial: int, total: int) -> float:
    return partial / total if total else 0.0


async def _generate_executive_summary(
    title: str, classification: dict, gaps: list[dict],
    compliant: int, partial: int, missing: int,
    risk: str, language: str, respond_lang: str,
) -> str:
    cls_type    = classification.get("detected_type", "")
    cls_std     = classification.get("applicable_standard", "")
    cls_clauses = ", ".join(classification.get("primary_clauses", []))

    if language == "az":
        prompt = (
            f"Sənəd: {title}. Növü: {cls_type}. Standart: {cls_std}. Bendlər: {cls_clauses}.\n"
            f"Uyğun: {compliant}, Qismən: {partial}, Yoxdur: {missing}. Risk: {risk}.\n"
            f"2-3 cümlə ilə icraçı xülasə yaz. {respond_lang}"
        )
    else:
        prompt = (
            f"Document: {title}. Type: {cls_type}. Standard: {cls_std}. Clauses: {cls_clauses}.\n"
            f"Compliant: {compliant}, Partial: {partial}, Missing: {missing}. Risk: {risk}.\n"
            f"Write a 2-3 sentence executive summary. {respond_lang}"
        )
    try:
        return await ollama_generate(prompt)
    except Exception:
        if language == "az":
            return (f"{title} sənədi analiz edildi. {compliant} uyğun, "
                    f"{partial} qismən, {missing} yoxdur. Risk: {risk}.")
        return (f"Analysis of {title} completed. {compliant} compliant, "
                f"{partial} partial, {missing} missing. Risk level: {risk}.")


async def _generate_recommendations(
    gaps: list[dict], language: str, respond_lang: str
) -> list[str]:
    critical = [g for g in gaps if g["status"] in ("missing", "partial")][:8]
    lines = []
    for g in critical:
        r = g.get("remediation_proposal", "") or g.get("justification", "")
        if r:
            lines.append(f"- {g['control_category']}: {r[:150]}")

    if not lines:
        return (["Kritik boşluq tapılmadı."] if language == "az"
                else ["No critical gaps found."])

    if language == "az":
        prompt = (
            f"Aşağıdakı gap-analiz tapıntılarına əsasən 5-7 qısa tövsiyə yaz (hər biri yeni sətirdə):\n"
            f"{chr(10).join(lines)}\n{respond_lang}"
        )
    else:
        prompt = (
            f"Based on these gap-analysis findings, write 5-7 short recommendations (one per line):\n"
            f"{chr(10).join(lines)}\n{respond_lang}"
        )
    try:
        resp = await ollama_generate(prompt)
        recs = [ln.strip().lstrip("-• ") for ln in resp.strip().splitlines() if ln.strip()]
        return recs[:8] if recs else [resp[:300]]
    except Exception:
        return (["Tövsiyə hazırlana bilmədi."] if language == "az"
                else ["Could not generate recommendations."])
