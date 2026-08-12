import json
from pathlib import Path
from app.config import settings
from app.services.chroma_service import get_corpus_collection
from app.services.embedding_service import embed_batch

CORPUS_INDEX_FLAG = settings.db_dir / ".corpus_indexed"


def load_corpus_controls() -> list[dict]:
    controls = []
    corpus_path = Path(settings.corpus_dir)
    for json_file in sorted(corpus_path.glob("*.json")):
        with open(json_file, "r", encoding="utf-8") as f:
            data = json.load(f)
            if isinstance(data, list):
                controls.extend(data)
            elif isinstance(data, dict) and "controls" in data:
                controls.extend(data["controls"])
    return controls


async def index_corpus(force: bool = False):
    if CORPUS_INDEX_FLAG.exists() and not force:
        return

    controls = load_corpus_controls()
    if not controls:
        return

    collection = get_corpus_collection()

    texts = [c.get("requirement_text", "") for c in controls]
    ids = [c.get("id", f"ctrl_{i}") for i, c in enumerate(controls)]
    metadatas = [
        {
            "source": c.get("source", ""),
            "category": c.get("category", ""),
            "language": c.get("language", "en"),
            "control_id": c.get("id", ""),
        }
        for c in controls
    ]

    all_embeddings = await embed_batch(texts)

    if all_embeddings:
        collection.upsert(
            ids=ids,
            embeddings=all_embeddings,
            documents=texts,
            metadatas=metadatas,
        )

    CORPUS_INDEX_FLAG.write_text("indexed")


def is_corpus_indexed() -> bool:
    return CORPUS_INDEX_FLAG.exists()


def get_corpus_stats() -> dict:
    controls = load_corpus_controls()
    by_category: dict[str, int] = {}
    by_language: dict[str, int] = {}
    for c in controls:
        cat = c.get("category", "unknown")
        lang = c.get("language", "unknown")
        by_category[cat] = by_category.get(cat, 0) + 1
        by_language[lang] = by_language.get(lang, 0) + 1
    return {
        "total_controls": len(controls),
        "by_category": by_category,
        "by_language": by_language,
    }


def get_all_controls() -> list[dict]:
    return load_corpus_controls()
