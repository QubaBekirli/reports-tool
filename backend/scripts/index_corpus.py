"""
Korpus indeksləmə skripti.

Bu skript əvvəlcədən toplanmış nəzarət kataloqunu (AI Security Governance, Data Platform Security,
Architecture Committee Security, NIST, ISO 42001, CBAR, Azərbaycan qanunları) ChromaDB vektor
bazasına indeksləyir. Bu proses bir dəfəlikdir və backend işə düşəndə avtomatik icra olunur,
lakin əllə də çalışdırıla bilər.

İstifadə:
    python -m scripts.index_corpus            # əgər indekslənməyibsə
    python -m scripts.index_corpus --force    # mövcud indeksi silib yenidən yaradır
"""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.services.corpus_service import index_corpus, load_corpus_controls, is_corpus_indexed


async def main():
    force = "--force" in sys.argv

    print("=" * 60)
    print("  Korpus indeksləmə skripti")
    print("=" * 60)

    controls = load_corpus_controls()
    print(f"  Toplam nəzarət sayı: {len(controls)}")

    by_source: dict[str, int] = {}
    for c in controls:
        src = c.get("source", "unknown")
        by_source[src] = by_source.get(src, 0) + 1

    print("\n  Mənbələr üzrə:")
    for src, count in sorted(by_source.items()):
        print(f"    {src}: {count} nəzarət")

    if is_corpus_indexed() and not force:
        print("\n  Korpus artıq indekslənib.")
        print("  Yenidən indeksləmək üçün: python -m scripts.index_corpus --force")
        return

    if force:
        print("\n  Mövcud indeks silinir...")
        from app.services.chroma_service import get_corpus_collection
        collection = get_corpus_collection()
        try:
            existing = collection.get()
            if existing and existing.get("ids"):
                collection.delete(ids=existing["ids"])
                print(f"  {len(existing['ids'])} köhnə qeyd silindi.")
        except Exception:
            pass

    print("\n  İndeksləmə başlayır (bu bir neçə dəqiqə çəkə bilər)...")
    await index_corpus(force=force)
    print("\n  Korpus indeksləmə tamamlandı!")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
