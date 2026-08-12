from fastapi import APIRouter
from app.models import AppSettingsModel, OllamaModel, LLMProviderInfo, HealthResponse
from app.config import settings
from app.services.ollama_service import (
    list_ollama_models, check_ollama, check_openrouter, list_openrouter_models,
)
from app.services.chroma_service import get_client

router = APIRouter()


@router.get("/api/settings", response_model=AppSettingsModel)
async def get_settings():
    return AppSettingsModel(
        llm_provider=settings.llm_provider,
        ollama_url=settings.ollama_url,
        ollama_model=settings.ollama_model,
        openrouter_api_key=settings.openrouter_api_key,
        openrouter_model=settings.openrouter_model,
        cleanup_temp_files=settings.cleanup_temp_files,
        chunk_size=settings.chunk_size,
        chunk_overlap=settings.chunk_overlap,
        top_k=settings.top_k,
    )


@router.put("/api/settings", response_model=AppSettingsModel)
async def update_settings(s: AppSettingsModel):
    settings.llm_provider = s.llm_provider
    settings.ollama_url = s.ollama_url
    settings.ollama_model = s.ollama_model
    settings.openrouter_api_key = s.openrouter_api_key
    settings.openrouter_model = s.openrouter_model
    settings.cleanup_temp_files = s.cleanup_temp_files
    settings.chunk_size = s.chunk_size
    settings.chunk_overlap = s.chunk_overlap
    settings.top_k = s.top_k
    return s


@router.get("/api/settings/models", response_model=list[OllamaModel])
async def get_models():
    models = await list_ollama_models()
    return [OllamaModel(**m) for m in models]


@router.get("/api/settings/provider", response_model=LLMProviderInfo)
async def get_provider_info():
    ollama_ok = await check_ollama()
    openrouter_ok = await check_openrouter()
    or_models = await list_openrouter_models()
    return LLMProviderInfo(
        provider=settings.llm_provider,
        ollama_ok=ollama_ok,
        openrouter_ok=openrouter_ok,
        openrouter_models=[OllamaModel(**m) for m in or_models],
    )


@router.get("/api/health", response_model=HealthResponse)
async def health():
    ollama_ok = await check_ollama()
    openrouter_ok = await check_openrouter()
    chroma_ok = True
    try:
        get_client().heartbeat()
    except Exception:
        chroma_ok = False

    llm_ok = ollama_ok if settings.llm_provider == "ollama" else openrouter_ok
    status = "ok" if (llm_ok and chroma_ok) else "degraded"
    return HealthResponse(status=status, ollama=ollama_ok, chroma=chroma_ok, openrouter=openrouter_ok)
