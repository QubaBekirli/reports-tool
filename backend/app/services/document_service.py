import json
from app.services.corpus_service import load_corpus_controls
from app.services.ollama_service import ollama_generate
from app.config import settings


DOC_TYPES = {
    "policy": {
        "label_az": "Siyasət (Policy)",
        "label_en": "Policy",
        "sections": [
            "Məqsəd və Əhatə Dairəsi",
            "Tərifs və Qısaltmalar",
            "Rollar və Məsuliyyətlər",
            "Tələblər və Nəzarətlər",
            "Uyğunluq və İstisnalar",
            "İcraat və Monitorinq",
            "Hadisə İdarəetmə",
            "Sənədin İncelemesi və Yenilənməsi",
        ],
    },
    "procedure": {
        "label_az": "Prosedur (Procedure)",
        "label_en": "Procedure",
        "sections": [
            "Məqsəd",
            "Əhatə Dairəsi",
            "Rollar və Cavabdehliklər",
            "Proses Addımları",
            "Input və Outputlar",
            "Kontrol Nöqtələri",
            "İstisnalar və Eskalasiya",
            "Əlaqəli Sənədlər",
        ],
    },
    "guideline": {
        "label_az": "Bələdçi (Guideline)",
        "label_en": "Guideline",
        "sections": [
            "Giriş",
            "Əsas Prinsiplər",
            "Tövsiyə Olunan Təcrübələr",
            "Detallı Təlimatlar",
            "Nümunələr",
            "Uyğunluq Göstəriciləri",
        ],
    },
    "standard": {
        "label_az": "Standart (Standard)",
        "label_en": "Standard",
        "sections": [
            "Ümumi Müqəddimə",
            "Tətbiq Sahəsi",
            "Normativ İstinadlar",
            "Tələblər",
            "Qiymətləndirmə Kriteriyaları",
            "Uyğunluq Sübutları",
        ],
    },
    "regulation": {
        "label_az": "Qayda (Regulation)",
        "label_en": "Regulation",
        "sections": [
            "Ümumi Müqəddimə",
            "Tərifs və Anlayışlar",
            "Tətbiq Dairəsi",
            "Ümumi Tələblər",
            "Xüsusi Tələblər",
            "Müvafiqlik və Nəzarət",
            "Məsuliyyət və Sanksiyalar",
        ],
    },
}


def _filter_controls_by_topic(topic: str, standards: list[str], limit: int = 15) -> list[dict]:
    all_controls = load_corpus_controls()
    topic_lower = topic.lower()
    matched: list[dict] = []
    matched_ids: set[str] = set()
    for c in all_controls:
        if standards and c.get("source", "") not in standards:
            continue
        text = c.get("requirement_text", "").lower()
        cat = c.get("category", "").lower()
        if topic_lower in text or topic_lower in cat:
            cid = c.get("id", "")
            if cid not in matched_ids:
                matched.append(c)
                matched_ids.add(cid)
        if len(matched) >= limit:
            break
    if len(matched) < limit:
        for c in all_controls:
            cid = c.get("id", "")
            if cid in matched_ids:
                continue
            if standards and c.get("source", "") not in standards:
                continue
            matched.append(c)
            matched_ids.add(cid)
            if len(matched) >= limit:
                break
    return matched[:limit]


async def generate_document(
    topic: str,
    doc_type: str,
    language: str,
    standards: list[str],
    organization: str = "",
) -> dict:
    doc_type_info = DOC_TYPES.get(doc_type, DOC_TYPES["policy"])
    sections = doc_type_info["sections"]

    controls = _filter_controls_by_topic(topic, standards, limit=15)
    controls_text = "\n".join(
        f"- [{c.get('source', '')}] {c.get('category', '')}: {c.get('requirement_text', '')[:200]}"
        for c in controls
    )

    if language == "az":
        system = (
            "Sən qabaqcıl GRC ekspertisən və texniki yazıçısən. "
            "Sənəd hazırlayarkən mütləq beynəlxalq standartlara (ISO, NIST, COBIT) "
            "və Azərbaycan qanunvericiliyinə / CBAR tələblərinə istinad et. "
            "Hər bölmə detallı, praktik və dərhal tətbiq edilə bilən olmalıdır. "
            "Tövsiyələr 'edilməlidir', 'tətbiq edilməlidir', 'detallandırılmalıdır' formatında olmalıdır. "
            "Formal, professional dil istifadə et."
        )
        prompt = f"""Aşağıdakı parametrlərlə tam bir {doc_type_info['label_az']} sənədi hazırla:

MÖVZU: {topic}
TƏŞKİLAT: {organization or 'Ümumi'}
DİL: Azərbaycanca
STANDARTLAR: {', '.join(standards) if standards else 'Bütün mövcud standartlar'}

ƏMƏLİ GƏLƏCƏK STANDART TƏLƏBLƏRİ (istinad üçün):
{controls_text}

SƏNƏD BÖLÜMLƏRİ (hər birini tam və detallı yaz):
{chr(10).join(f'{i+1}. {s}' for i, s in enumerate(sections))}

HƏR BÖLMƏ ÜÇÜN:
- Beynəlxalq standartlara konkret istinad (məs: "ISO 27001 A.5.1 tələbinə əsasən...")
- CBAR və ya Azərbaycan qanunvericiliyinə istinad where applicable
- Dərhal tətbiq edilə bilən konkret addımlar
- Məsuliyyət təyin edilmiş rollar
- Dəqiq mejler və göstəricilər

JSON formatında cavab ver:
{{"title":"sənəd başlığı","sections":[{{"heading":"bölmə adı","content":"tam məzmun markdown formatında"}}],"references":["istinad edilən standartların siyahısı"],"summary":"qısa xülasə"}}"""
    else:
        system = (
            "You are a senior GRC expert and technical writer. "
            "When creating documents, always reference international standards (ISO, NIST, COBIT) "
            "and relevant regulatory frameworks. "
            "Each section must be detailed, practical, and immediately actionable. "
            "Use formal, professional language."
        )
        prompt = f"""Create a complete {doc_type_info['label_en']} document with these parameters:

TOPIC: {topic}
ORGANIZATION: {organization or 'General'}
LANGUAGE: English
STANDARDS: {', '.join(standards) if standards else 'All applicable standards'}

RELEVANT STANDARD REQUIREMENTS (for reference):
{controls_text}

DOCUMENT SECTIONS (write each fully and in detail):
{chr(10).join(f'{i+1}. {s}' for i, s in enumerate(sections))}

FOR EACH SECTION:
- Concrete references to international standards (e.g., "According to ISO 27001 A.5.1...")
- Regulatory requirements where applicable
- Immediately actionable concrete steps
- Assigned responsibilities for roles
- Specific metrics and indicators

Respond in JSON:
{{"title":"document title","sections":[{{"heading":"section name","content":"full content in markdown"}}],"references":["list of referenced standards"],"summary":"brief summary"}}"""

    raw = await ollama_generate(prompt, system=system, model=settings.ollama_model, num_predict=8192)

    try:
        cleaned = raw.strip()
        for marker in ("```json", "```"):
            if marker in cleaned:
                parts = cleaned.split(marker)
                if len(parts) > 1:
                    after = parts[1]
                    if "```" in after:
                        after = after.split("```")[0]
                    cleaned = after.strip()
                    break
        parsed = json.loads(cleaned)
    except Exception:
        parsed = {
            "title": f"{topic} — {doc_type_info['label_az']}",
            "sections": [{"heading": "Sənəd", "content": raw}],
            "references": standards,
            "summary": "",
        }

    return parsed


def get_doc_types() -> dict:
    return {k: {"label_az": v["label_az"], "label_en": v["label_en"], "sections": v["sections"]}
            for k, v in DOC_TYPES.items()}


def get_available_standards() -> list[str]:
    controls = load_corpus_controls()
    return sorted(set(c.get("source", "") for c in controls if c.get("source")))
