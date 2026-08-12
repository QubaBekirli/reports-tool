from pydantic_settings import BaseSettings
from pathlib import Path


class Settings(BaseSettings):
    app_name: str = "Reports Tool"

    # LLM provider: "ollama" (local) or "openrouter" (cloud, no install needed)
    llm_provider: str = "ollama"

    # Ollama (local)
    ollama_url: str = "http://localhost:11434"
    ollama_model: str = "llama3.2:3b-instruct-q4_K_M"

    # OpenRouter (cloud — free tier available, no local install)
    openrouter_api_key: str = ""
    openrouter_model: str = "meta-llama/llama-3.2-3b-instruct:free"
    openrouter_base_url: str = "https://openrouter.ai/api/v1"

    chunk_size: int = 512
    chunk_overlap: int = 64
    top_k: int = 8
    cleanup_temp_files: bool = True
    max_file_size_mb: int = 50

    base_dir: Path = Path(__file__).resolve().parent.parent
    uploads_dir: Path = base_dir / "uploads"
    db_dir: Path = base_dir / "db"
    corpus_dir: Path = base_dir / "corpus"

    chroma_corpus_collection: str = "corpus_controls"
    chroma_docs_collection: str = "uploaded_documents"

    class Config:
        env_prefix = "LOKALO_"

    def ensure_dirs(self):
        for d in [self.uploads_dir, self.db_dir, self.corpus_dir]:
            d.mkdir(parents=True, exist_ok=True)


settings = Settings()
settings.ensure_dirs()
