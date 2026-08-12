from fastapi import APIRouter
from app.models import CorpusStats, CorpusControl
from app.services.corpus_service import get_corpus_stats, get_all_controls

router = APIRouter()


@router.get("/api/corpus/stats", response_model=CorpusStats)
async def corpus_stats():
    return CorpusStats(**get_corpus_stats())


@router.get("/api/corpus/controls", response_model=list[CorpusControl])
async def corpus_controls():
    controls = get_all_controls()
    return [CorpusControl(**c) for c in controls]
