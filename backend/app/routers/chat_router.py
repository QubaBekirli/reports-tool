from fastapi import APIRouter, HTTPException
from app.models import ChatRequest, ChatResponse
from app.services.chroma_service import get_corpus_collection, get_doc_collection
from app.services.ollama_service import ollama_generate
from app.services.embedding_service import embed
from app.services import storage_service
from app.config import settings

router = APIRouter()


@router.post("/api/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    query_embedding = await embed(req.query)

    # 1. Search corpus knowledge base
    corpus_collection = get_corpus_collection()
    corpus_results = corpus_collection.query(
        query_embeddings=[query_embedding],
        n_results=settings.top_k,
        include=["documents", "metadatas", "distances"],
    )

    sources: list[dict] = []
    context_parts: list[str] = []

    if corpus_results and corpus_results.get("documents"):
        for doc, meta, dist in zip(
            corpus_results["documents"][0],
            corpus_results["metadatas"][0],
            corpus_results["distances"][0],
        ):
            # Only include reasonably close matches (cosine distance < 0.8)
            if dist < 0.8:
                context_parts.append(doc)
                sources.append({
                    "control_id": meta.get("control_id", ""),
                    "source":     meta.get("source", ""),
                    "snippet":    doc[:200],
                })

    # 2. Also search uploaded documents for additional context
    try:
        all_docs = storage_service.list_documents()
        for uploaded_doc in all_docs[:5]:  # limit to 5 most recent docs
            try:
                coll = get_doc_collection(uploaded_doc["id"])
                if coll.count() == 0:
                    continue
                doc_results = coll.query(
                    query_embeddings=[query_embedding],
                    n_results=2,
                    include=["documents", "distances"],
                )
                if doc_results and doc_results.get("documents"):
                    for chunk, dist in zip(
                        doc_results["documents"][0],
                        doc_results["distances"][0],
                    ):
                        if dist < 0.65:
                            context_parts.append(
                                f"[Sənəd: {uploaded_doc.get('title', '')}]\n{chunk}"
                            )
            except Exception:
                pass
    except Exception:
        pass

    context = "\n\n---\n\n".join(context_parts[:12]) if context_parts else ""

    if req.language == "az":
        system = (
            "Sən bir AI təhlükəsizlik governance ekspertisən. "
            "Aşağıdakı bilik bazası və sənəd mətnlərinə əsaslanaraq istifadəçinin sualına cavab ver. "
            "Yalnız Azərbaycan dilində cavab ver. "
            "Əgər məlumat yoxdursa bunu açıq söylə. "
            "Əvvəlki söhbəti nəzərə alaraq ardıcıl cavab ver."
        )
    else:
        system = (
            "You are an AI security governance expert. "
            "Answer the user's question based on the knowledge base and document texts below. "
            "Respond ONLY in English. "
            "If information is not available, say so clearly. "
            "Use conversation history for context."
        )

    history_parts = []
    for msg in req.history[-8:]:
        prefix = ("İstifadəçi" if req.language == "az" else "User") if msg.role == "user" \
            else ("Assistent" if req.language == "az" else "Assistant")
        history_parts.append(f"{prefix}: {msg.content[:300]}")
    history_text = "\n".join(history_parts)

    if req.language == "az":
        prompt = f"""Bilik bazası:
{context or "(Bilik bazasında uyğun məlumat tapılmadı)"}

{"Öncəki söhbət:" + chr(10) + history_text if history_text else ""}

Sual: {req.query}

Cavab:"""
    else:
        prompt = f"""Knowledge base:
{context or "(No relevant information found in knowledge base)"}

{"Previous conversation:" + chr(10) + history_text if history_text else ""}

Question: {req.query}

Answer:"""

    try:
        answer = await ollama_generate(prompt, system)
        return ChatResponse(answer=answer, sources=sources)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat xətası: {e}")


def _get_doc_title(document_id: str) -> str:
    try:
        doc = storage_service.get_document(document_id)
        return doc.get("title", document_id) if doc else document_id
    except Exception:
        return document_id
