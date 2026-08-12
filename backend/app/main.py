from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import upload_router, analyze_router, report_router, chat_router, corpus_router, settings_router, kb_router, document_router
from app.services.corpus_service import index_corpus, is_corpus_indexed
from app.services import storage_service


@asynccontextmanager
async def lifespan(app: FastAPI):
    storage_service.init_db()
    if not is_corpus_indexed():
        try:
            await index_corpus()
        except Exception as e:
            print(f"Korpus indeksləmə xətası: {e}")
    yield


app = FastAPI(
    title="Reports Tool",
    description="AI Security Governance & Gap-Analiz aləti",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload_router.router)
app.include_router(analyze_router.router)
app.include_router(report_router.router)
app.include_router(chat_router.router)
app.include_router(corpus_router.router)
app.include_router(settings_router.router)
app.include_router(kb_router.router)
app.include_router(document_router.router)


@app.get("/")
async def root():
    return {"message": "Reports Tool API", "version": "2.0.0"}
