from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.document_service import generate_document, get_doc_types, get_available_standards

router = APIRouter()


class DocGenRequest(BaseModel):
    topic: str
    doc_type: str = "policy"
    language: str = "az"
    standards: list[str] = []
    organization: str = ""


@router.get("/api/document-builder/types")
async def list_doc_types():
    return {"types": get_doc_types(), "standards": get_available_standards()}


@router.post("/api/document-builder/generate")
async def generate_doc(req: DocGenRequest):
    if not req.topic.strip():
        raise HTTPException(status_code=400, detail="Mövzu tələb olunur")
    try:
        result = await generate_document(
            topic=req.topic,
            doc_type=req.doc_type,
            language=req.language,
            standards=req.standards,
            organization=req.organization,
        )
        return result
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Sənəd yaradıla bilmədi: {e}")
