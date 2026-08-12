from langdetect import detect, DetectorFactory

DetectorFactory.seed = 0


def detect_language(text: str) -> str:
    if not text or len(text.strip()) < 10:
        return "unknown"
    try:
        lang = detect(text)
        if lang.startswith("az"):
            return "az"
        elif lang.startswith("en"):
            return "en"
        elif lang.startswith("ru"):
            return "ru"
        return lang
    except Exception:
        return "unknown"
