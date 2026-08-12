from pydantic import BaseModel
from typing import Optional


class UploadResponse(BaseModel):
    id: str
    filename: str
    format: str
    size_bytes: int
    detected_language: str
    title: str
    uploaded_at: str
    status: str
    chunk_count: int
    error_message: Optional[str] = None


class AnalyzeRequest(BaseModel):
    document_id: str


class AnalyzeResponse(BaseModel):
    analysis_id: str


class AnalysisProgress(BaseModel):
    id: str
    status: str
    progress: int
    message: str
    started_at: str
    completed_at: Optional[str] = None
    error: Optional[str] = None


class GapResult(BaseModel):
    control_id: str
    control_source: str
    control_category: str
    control_text: str
    status: str
    justification: str
    standard_requirement: str = ""
    current_document_text: str = ""
    gap_analysis: str = ""
    remediation_proposal: str = ""
    evidence_snippet: Optional[str] = None
    evidence_reference: Optional[str] = None


class DocumentClassification(BaseModel):
    detected_type: str = ""
    applicable_standard: str = ""
    primary_clauses: list[str] = []


class AnalysisResult(BaseModel):
    id: str
    document_id: str
    document_title: str
    detected_language: str
    status: str
    progress: int
    started_at: str
    completed_at: Optional[str] = None
    executive_summary: str
    risk_level: str
    total_controls: int
    compliant_count: int
    partial_count: int
    missing_count: int
    gaps: list[GapResult]
    recommendations: list[str]
    document_classification: Optional[DocumentClassification] = None
    error: Optional[str] = None


class AnalysisHistoryItem(BaseModel):
    id: str
    document_id: str
    document_title: str
    detected_language: str
    status: str
    risk_level: str
    total_controls: int
    compliant_count: int
    partial_count: int
    missing_count: int
    started_at: str
    completed_at: Optional[str] = None


class ChatMessageItem(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    query: str
    language: str = "az"
    history: list[ChatMessageItem] = []


class ChatResponse(BaseModel):
    answer: str
    sources: list[dict]


class CorpusControl(BaseModel):
    id: str
    source: str
    category: str
    requirement_text: str
    language: str


class CorpusStats(BaseModel):
    total_controls: int
    by_category: dict[str, int]
    by_language: dict[str, int]


class AppSettingsModel(BaseModel):
    llm_provider: str = "ollama"
    ollama_url: str
    ollama_model: str
    openrouter_api_key: str = ""
    openrouter_model: str = "meta-llama/llama-3.2-3b-instruct:free"
    embedding_model: str = "built-in (paraphrase-multilingual-MiniLM-L12-v2)"
    cleanup_temp_files: bool
    chunk_size: int
    chunk_overlap: int
    top_k: int


class OllamaModel(BaseModel):
    name: str
    size: Optional[str] = None
    parameter_size: Optional[str] = None
    quantization: Optional[str] = None


class LLMProviderInfo(BaseModel):
    provider: str
    ollama_ok: bool
    openrouter_ok: bool
    openrouter_models: list[OllamaModel] = []


class HealthResponse(BaseModel):
    status: str
    ollama: bool
    chroma: bool
    openrouter: bool = False


class KBDocumentResponse(BaseModel):
    id: str
    title: str
    filename: str
    file_format: str
    file_size: int
    source: str = ""
    language: str = "en"
    content_preview: str = ""
    content: Optional[str] = None
    created_at: str
    updated_at: str
