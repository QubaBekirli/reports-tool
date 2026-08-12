"""
Daxili embedding service - sentence-transformers istifadə edir.

Ollama-ya ehtiyac yoxdur. Model ilk işə düşəndə avtomatik endirilir
(~120MB) və lokal diskdə cache olunur. Çoxdilli (50+ dil, o cümlədən
Azərbaycan və İngilis dilləri).
"""
import threading
from functools import lru_cache

from sentence_transformers import SentenceTransformer

_MODEL_NAME = "paraphrase-multilingual-MiniLM-L12-v2"
_lock = threading.Lock()


@lru_cache(maxsize=1)
def get_model() -> SentenceTransformer:
    with _lock:
        return SentenceTransformer(_MODEL_NAME)


def embed_sync(text: str) -> list[float]:
    model = get_model()
    return model.encode(text, normalize_embeddings=True).tolist()


def embed_batch_sync(texts: list[str]) -> list[list[float]]:
    model = get_model()
    embs = model.encode(texts, normalize_embeddings=True, batch_size=32)
    return [e.tolist() for e in embs]


async def embed(text: str) -> list[float]:
    import asyncio
    loop = asyncio.get_event_loop()
    if loop.is_running():
        return await loop.run_in_executor(None, embed_sync, text)
    return embed_sync(text)


async def embed_batch(texts: list[str]) -> list[list[float]]:
    import asyncio
    loop = asyncio.get_event_loop()
    if loop.is_running():
        return await loop.run_in_executor(None, embed_batch_sync, texts)
    return embed_batch_sync(texts)
