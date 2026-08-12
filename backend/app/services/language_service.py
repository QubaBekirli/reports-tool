from langdetect import detect, DetectorFactory

DetectorFactory.seed = 0


AZERBAIJANI_MARKERS = {
    "və", "üçün", "olan", "olaraq", "tələbləri", "məlumat", "təhlükəsizlik",
    "idarəetmə", "dəyişiklik", "sənəd", "müəssisə", "tətbiq", "edilməlidir",
}


def detect_language(text: str) -> str:
    if not text or len(text.strip()) < 10:
        return "unknown"

    normalized = text.lower().replace("\n", " ")
    words = set(normalized.split())
    marker_score = len(words.intersection(AZERBAIJANI_MARKERS))
    if any(char in normalized for char in "əğıöüçş") or marker_score >= 2:
        return "az"

    try:
        lang = detect(text)
        if lang.startswith("en"):
            return "en"
        if lang.startswith("ru"):
            return "ru"
        return lang
    except Exception:
        return "unknown"
