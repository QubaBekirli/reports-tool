import asyncio
from fastapi import APIRouter, HTTPException
from app.models import AnalyzeRequest, AnalyzeResponse, AnalysisProgress, AnalysisResult, AnalysisHistoryItem
from app.services import storage_service
from app.services.gap_analysis_service import (
    create_analysis, get_progress, get_result, run_analysis,
)

router = APIRouter()


@router.post("/api/analyze", response_model=AnalyzeResponse)
async def start_analysis(req: AnalyzeRequest):
    doc = storage_service.get_document(req.document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Sənəd tapılmadı")

    analysis_id = create_analysis(
        document_id=req.document_id,
        document_title=doc["title"],
        language="en" if doc.get("detected_language") == "en" else "az",
    )

    asyncio.create_task(run_analysis(analysis_id))

    return AnalyzeResponse(analysis_id=analysis_id)


@router.get("/api/analyze/{analysis_id}/status", response_model=AnalysisProgress)
async def get_analysis_status(analysis_id: str):
    progress = get_progress(analysis_id)
    if not progress:
        raise HTTPException(status_code=404, detail="Analiz tapılmadı")
    return AnalysisProgress(**progress)


@router.get("/api/analyze/{analysis_id}/result", response_model=AnalysisResult)
async def get_analysis_result(analysis_id: str):
    result = get_result(analysis_id)
    if not result:
        raise HTTPException(status_code=404, detail="Analiz tapılmadı")
    # Return result even if not completed — allows real-time partial viewing
    return AnalysisResult(**result)


@router.get("/api/analyses", response_model=list[AnalysisHistoryItem])
async def list_analyses():
    analyses = storage_service.list_analyses()
    return [AnalysisHistoryItem(**a) for a in analyses]


@router.delete("/api/analyses/{analysis_id}")
async def delete_analysis(analysis_id: str):
    storage_service.delete_analysis(analysis_id)
    return {"status": "deleted"}
