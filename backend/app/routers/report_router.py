from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
import io
from app.services.gap_analysis_service import get_result
from app.services.report_service import generate_docx, generate_pdf

router = APIRouter()


@router.get("/api/report/{analysis_id}/download")
async def download_report(
    analysis_id: str,
    format: str = Query("docx", pattern="^(docx|pdf)$"),
    language: str = Query(None, pattern="^(az|en)$"),
):
    result = get_result(analysis_id)
    if not result:
        raise HTTPException(status_code=404, detail="Analiz tapılmadı")
    if result.get("status") != "completed":
        raise HTTPException(status_code=400, detail="Analiz hələ tamamlanmayıb")

    if language:
        result = dict(result)
        result["detected_language"] = language

    if format == "docx":
        content = generate_docx(result)
        media_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        ext = "docx"
    else:
        content = generate_pdf(result)
        media_type = "application/pdf"
        ext = "pdf"

    filename = f"gap-analysis-report.{ext}"
    return StreamingResponse(
        io.BytesIO(content),
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
