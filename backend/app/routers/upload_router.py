import uuid
import os
from datetime import datetime
from fastapi import APIRouter, UploadFile, File, HTTPException
from app.config import settings
from app.models import UploadResponse
from app.services.parsing_service import extract_text, chunk_text
from app.services.language_service import detect_language
from app.services.chroma_service import get_doc_collection
from app.services.embedding_service import embed_batch
from app.services import storage_service

router = APIRouter()

ALLOWED_FORMATS = {"pdf", "docx", "pptx", "xlsx", "png", "jpg", "jpeg", "txt"}


@router.post("/api/upload", response_model=UploadResponse)
async def upload_document(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="Fayl adı yoxdur")

    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if ext not in ALLOWED_FORMATS:
        raise HTTPException(status_code=400, detail=f"Dəstəklənməyən format: {ext}")

    contents = await file.read()
    if len(contents) > settings.max_file_size_mb * 1024 * 1024:
        raise HTTPException(status_code=413, detail=f"Fayl çox böyükdür (max {settings.max_file_size_mb}MB)")

    doc_id = str(uuid.uuid4())
    filepath = settings.uploads_dir / f"{doc_id}.{ext}"
    with open(filepath, "wb") as f:
        f.write(contents)

    try:
        text = extract_text(str(filepath), ext)
    except Exception as e:
        os.remove(filepath)
        raise HTTPException(status_code=500, detail=f"Mətn çıxarıla bilmədi: {e}")

    language = detect_language(text)
    chunks = chunk_text(text)

    doc_record = {
        "id": doc_id,
        "filename": file.filename,
        "format": ext,
        "size_bytes": len(contents),
        "detected_language": language,
        "title": os.path.splitext(file.filename)[0],
        "uploaded_at": datetime.now().isoformat(),
        "status": "uploaded",
        "chunk_count": len(chunks),
        "extracted_text": text[:10000],
        "error_message": None,
    }
    storage_service.save_document(doc_record)

    if chunks:
        try:
            embeddings = await embed_batch(chunks)
            collection = get_doc_collection(doc_id)
            collection.upsert(
                ids=[f"{doc_id}_chunk_{i}" for i in range(len(chunks))],
                embeddings=embeddings,
                documents=chunks,
                metadatas=[{"document_id": doc_id, "chunk_index": i} for i in range(len(chunks))],
            )
        except Exception as e:
            print(f"[Upload] Embedding/indexing failed for doc {doc_id}: {e}")
            doc_record["status"] = "uploaded"
            doc_record["error_message"] = f"İndeksləmə xətası: {e}"
            storage_service.save_document(doc_record)

    os.remove(filepath)

    return UploadResponse(**doc_record)


@router.get("/api/documents", response_model=list[UploadResponse])
async def list_documents():
    docs = storage_service.list_documents()
    return [UploadResponse(**d) for d in docs]
