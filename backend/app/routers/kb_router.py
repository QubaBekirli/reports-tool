import uuid
from datetime import datetime
from fastapi import APIRouter, UploadFile, File, HTTPException, Form
from app.models import KBDocumentResponse
from app.services.parsing_service import extract_text
from app.services.language_service import detect_language
from app.services import storage_service
from app.config import settings

router = APIRouter()

ALLOWED_FORMATS = {"pdf", "docx", "pptx", "xlsx", "png", "jpg", "jpeg", "txt"}


@router.get("/api/kb-documents", response_model=list[KBDocumentResponse])
async def list_kb_docs():
    docs = storage_service.list_kb_documents()
    # Don't return full content in list — too large
    return [KBDocumentResponse(
        id=d["id"], title=d["title"], filename=d["filename"],
        file_format=d["file_format"], file_size=d["file_size"],
        source=d.get("source", ""), language=d.get("language", "en"),
        content_preview=d["content"][:500],
        created_at=d["created_at"], updated_at=d["updated_at"],
    ) for d in docs]


@router.get("/api/kb-documents/{doc_id}", response_model=KBDocumentResponse)
async def get_kb_doc(doc_id: str):
    d = storage_service.get_kb_document(doc_id)
    if not d:
        raise HTTPException(status_code=404, detail="Sənəd tapılmadı")
    return KBDocumentResponse(
        id=d["id"], title=d["title"], filename=d["filename"],
        file_format=d["file_format"], file_size=d["file_size"],
        source=d.get("source", ""), language=d.get("language", "en"),
        content_preview=d["content"][:2000],
        content=d["content"],
        created_at=d["created_at"], updated_at=d["updated_at"],
    )


@router.post("/api/kb-documents", response_model=KBDocumentResponse)
async def upload_kb_doc(
    file: UploadFile = File(...),
    source: str = Form(default=""),
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="Fayl adı yoxdur")

    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if ext not in ALLOWED_FORMATS:
        raise HTTPException(status_code=400, detail=f"Dəstəklənməyən format: {ext}")

    contents = await file.read()
    if len(contents) > settings.max_file_size_mb * 1024 * 1024:
        raise HTTPException(status_code=413, detail=f"Fayl çox böyükdür (max {settings.max_file_size_mb}MB)")

    import tempfile, os
    with tempfile.NamedTemporaryFile(suffix=f".{ext}", delete=False) as tmp:
        tmp.write(contents)
        tmp_path = tmp.name

    try:
        text = extract_text(tmp_path, ext)
    except Exception as e:
        os.remove(tmp_path)
        raise HTTPException(status_code=500, detail=f"Mətn çıxarıla bilmədi: {e}")
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

    if not text.strip():
        raise HTTPException(status_code=400, detail="Sənəddə mətn tapılmadı")

    language = detect_language(text)
    doc_id = str(uuid.uuid4())
    now = datetime.now().isoformat()
    title = file.filename.rsplit(".", 1)[0]

    doc = {
        "id": doc_id,
        "title": title,
        "filename": file.filename,
        "file_format": ext,
        "file_size": len(contents),
        "content": text,
        "source": source or title,
        "language": language,
        "created_at": now,
        "updated_at": now,
    }
    storage_service.save_kb_document(doc)

    return KBDocumentResponse(
        id=doc["id"], title=doc["title"], filename=doc["filename"],
        file_format=doc["file_format"], file_size=doc["file_size"],
        source=doc["source"], language=doc["language"],
        content_preview=text[:500],
        created_at=doc["created_at"], updated_at=doc["updated_at"],
    )


@router.put("/api/kb-documents/{doc_id}", response_model=KBDocumentResponse)
async def update_kb_doc(
    doc_id: str,
    title: str = Form(...),
    source: str = Form(default=""),
    content: str = Form(default=""),
):
    existing = storage_service.get_kb_document(doc_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Sənəd tapılmadı")

    new_content = content if content.strip() else existing["content"]
    storage_service.update_kb_document(doc_id, title, source, new_content)
    updated = storage_service.get_kb_document(doc_id)
    return KBDocumentResponse(
        id=updated["id"], title=updated["title"], filename=updated["filename"],
        file_format=updated["file_format"], file_size=updated["file_size"],
        source=updated.get("source", ""), language=updated.get("language", "en"),
        content_preview=updated["content"][:500],
        created_at=updated["created_at"], updated_at=updated["updated_at"],
    )


@router.delete("/api/kb-documents/{doc_id}")
async def delete_kb_doc(doc_id: str):
    storage_service.delete_kb_document(doc_id)
    return {"status": "deleted"}


@router.get("/api/kb-documents/search")
async def search_kb_docs(query: str):
    results = storage_service.search_kb_documents(query)
    return [{
        "id": d["id"],
        "title": d["title"],
        "source": d.get("source", ""),
        "filename": d["filename"],
        "content_preview": d["content"][:300],
    } for d in results[:20]]
