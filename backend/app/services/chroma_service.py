import chromadb
from app.config import settings

_client: chromadb.api.ClientAPI | None = None


def get_client() -> chromadb.api.ClientAPI:
    global _client
    if _client is None:
        _client = chromadb.PersistentClient(path=str(settings.db_dir))
    return _client


def get_corpus_collection():
    return get_client().get_or_create_collection(
        name=settings.chroma_corpus_collection,
        metadata={"hnsw:space": "cosine"},
    )


def get_docs_collection():
    return get_client().get_or_create_collection(
        name=settings.chroma_docs_collection,
        metadata={"hnsw:space": "cosine"},
    )


def get_doc_collection(document_id: str):
    return get_client().get_or_create_collection(
        name=f"doc_{document_id}",
        metadata={"hnsw:space": "cosine"},
    )
