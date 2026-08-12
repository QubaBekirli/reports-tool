export type DocumentFormat =
  | 'pdf'
  | 'docx'
  | 'pptx'
  | 'xlsx'
  | 'png'
  | 'jpg'
  | 'jpeg'
  | 'txt';

export type DocumentLanguage = 'az' | 'en' | 'ru' | 'unknown';

export type AnalysisStatus =
  | 'queued'
  | 'parsing'
  | 'embedding'
  | 'analyzing'
  | 'generating_report'
  | 'completed'
  | 'failed';

export type ControlStatus = 'compliant' | 'partial' | 'missing';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface UploadedDocument {
  id: string;
  filename: string;
  format: DocumentFormat;
  size_bytes: number;
  detected_language: DocumentLanguage;
  title: string;
  uploaded_at: string;
  status: 'uploaded' | 'analyzing' | 'analyzed' | 'failed';
  chunk_count: number;
  extracted_text?: string;
  error_message?: string;
}

export interface ControlItem {
  id: string;
  source: string;
  category: string;
  requirement_text: string;
  language: 'az' | 'en';
}

export interface GapResult {
  control_id: string;
  control_source: string;
  control_category: string;
  control_text: string;
  status: ControlStatus;
  justification: string;
  standard_requirement?: string;
  current_document_text?: string;
  gap_analysis?: string;
  remediation_proposal?: string;
  evidence_snippet?: string;
  evidence_reference?: string;
}

export interface AnalysisProgress {
  id: string;
  status: AnalysisStatus;
  progress: number;
  message: string;
  started_at: string;
  completed_at?: string;
  error?: string;
}

export interface DocumentClassification {
  detected_type: string;
  applicable_standard: string;
  primary_clauses: string[];
}

export interface AnalysisResult {
  id: string;
  document_id: string;
  document_title: string;
  detected_language: DocumentLanguage;
  status: AnalysisStatus;
  progress: number;
  started_at: string;
  completed_at?: string;
  executive_summary: string;
  risk_level: RiskLevel;
  total_controls: number;
  compliant_count: number;
  partial_count: number;
  missing_count: number;
  gaps: GapResult[];
  recommendations: string[];
  document_classification?: DocumentClassification;
  error?: string;
}

export interface AnalysisHistoryItem {
  id: string;
  document_id: string;
  document_title: string;
  detected_language: DocumentLanguage;
  status: AnalysisStatus;
  risk_level: RiskLevel;
  total_controls: number;
  compliant_count: number;
  partial_count: number;
  missing_count: number;
  started_at: string;
  completed_at?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface ChatResponse {
  answer: string;
  sources: { control_id: string; source: string; snippet: string }[];
}

export interface KBDocument {
  id: string;
  title: string;
  filename: string;
  file_format: string;
  file_size: number;
  source: string;
  language: string;
  content_preview: string;
  content?: string;
  created_at: string;
  uploaded_at?: string;
  detected_language?: string;
  format?: string;
  size_bytes?: number;
  chunk_count?: number;
  extracted_text?: string;
  updated_at: string;
}

export interface OllamaModel {
  name: string;
  size?: string;
  parameter_size?: string;
  quantization?: string;
}

export type LLMProvider = 'ollama' | 'openrouter';

export interface AppSettings {
  llm_provider: LLMProvider;
  ollama_url: string;
  ollama_model: string;
  openrouter_api_key: string;
  openrouter_model: string;
  cleanup_temp_files: boolean;
  chunk_size: number;
  chunk_overlap: number;
  top_k: number;
}

export const DEFAULT_SETTINGS: AppSettings = {
  llm_provider: 'ollama',
  ollama_url: 'http://localhost:11434',
  ollama_model: 'llama3.2:3b-instruct-q4_K_M',
  openrouter_api_key: '',
  openrouter_model: 'meta-llama/llama-3.2-3b-instruct:free',
  cleanup_temp_files: true,
  chunk_size: 512,
  chunk_overlap: 64,
  top_k: 8,
};

export const STATUS_LABELS_AZ: Record<ControlStatus, string> = {
  compliant: 'Uyğundur',
  partial: 'Qismən uyğundur',
  missing: 'Yoxdur',
};

export const STATUS_LABELS_EN: Record<ControlStatus, string> = {
  compliant: 'Compliant',
  partial: 'Partially Compliant',
  missing: 'Missing',
};

export const RISK_LABELS_AZ: Record<RiskLevel, string> = {
  low: 'Aşağı',
  medium: 'Orta',
  high: 'Yüksək',
  critical: 'Kritik',
};

export const RISK_LABELS_EN: Record<RiskLevel, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
};

export const STATUS_COLORS: Record<ControlStatus, string> = {
  compliant: 'bg-emerald-500',
  partial: 'bg-amber-500',
  missing: 'bg-red-500',
};

export const STATUS_BADGE_CLASSES: Record<ControlStatus, string> = {
  compliant: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
  partial: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
  missing: 'bg-red-500/15 text-red-400 border border-red-500/30',
};

export const RISK_COLORS: Record<RiskLevel, string> = {
  low: 'bg-emerald-500',
  medium: 'bg-amber-500',
  high: 'bg-orange-500',
  critical: 'bg-red-500',
};

export const RISK_BADGE_CLASSES: Record<RiskLevel, string> = {
  low: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
  medium: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
  high: 'bg-orange-500/15 text-orange-400 border border-orange-500/30',
  critical: 'bg-red-500/15 text-red-400 border border-red-500/30',
};

export const ANALYSIS_STATUS_LABELS_AZ: Record<AnalysisStatus, string> = {
  queued: 'Sırada',
  parsing: 'Analiz edilir',
  embedding: 'Embedding',
  analyzing: 'Gap analiz',
  generating_report: 'Hesabat hazırlanır',
  completed: 'Tamamlandı',
  failed: 'Xəta',
};

export const FREE_OPENROUTER_MODELS = [
  { name: 'meta-llama/llama-3.2-3b-instruct:free', label: 'Llama 3.2 3B (Free)', recommended: true },
  { name: 'meta-llama/llama-3.2-1b-instruct:free', label: 'Llama 3.2 1B (Free)' },
  { name: 'qwen/qwen-2.5-7b-instruct:free', label: 'Qwen 2.5 7B (Free)' },
  { name: 'qwen/qwen-2.5-3b-instruct:free', label: 'Qwen 2.5 3B (Free)' },
  { name: 'mistralai/mistral-7b-instruct:free', label: 'Mistral 7B (Free)' },
  { name: 'google/gemma-2-9b-it:free', label: 'Gemma 2 9B (Free)' },
  { name: 'microsoft/phi-3-mini-128k-instruct:free', label: 'Phi-3 Mini (Free)' },
  { name: 'huggingfaceh4/zephyr-7b-beta:free', label: 'Zephyr 7B Beta (Free)' },
];

export const FREE_OLLAMA_MODELS = [
  { name: 'llama3.2:3b-instruct-q4_K_M', label: 'Llama 3.2 3B (Q4)', size: '~2.0 GB', recommended: true },
  { name: 'llama3.2:1b-instruct-q4_K_M', label: 'Llama 3.2 1B (Q4)', size: '~1.3 GB' },
  { name: 'llama3.1:8b-instruct-q4_K_M', label: 'Llama 3.1 8B (Q4)', size: '~4.7 GB', recommended: true },
  { name: 'llama3.1:8b-instruct-q5_K_M', label: 'Llama 3.1 8B (Q5)', size: '~5.5 GB' },
  { name: 'qwen2.5:7b-instruct-q4_K_M', label: 'Qwen 2.5 7B (Q4)', size: '~4.7 GB' },
  { name: 'qwen2.5:3b-instruct-q4_K_M', label: 'Qwen 2.5 3B (Q4)', size: '~2.0 GB' },
  { name: 'qwen2.5:1.5b-instruct-q4_K_M', label: 'Qwen 2.5 1.5B (Q4)', size: '~1.0 GB' },
  { name: 'phi3:3.8b-mini-instruct-q4_K_M', label: 'Phi-3 Mini 3.8B (Q4)', size: '~2.3 GB' },
  { name: 'gemma2:2b-instruct-q4_K_M', label: 'Gemma 2 2B (Q4)', size: '~1.6 GB' },
  { name: 'mistral:7b-instruct-q4_K_M', label: 'Mistral 7B (Q4)', size: '~4.4 GB' },
  { name: 'tinyllama:1.1b-chat-q4_K_M', label: 'TinyLlama 1.1B (Q4)', size: '~0.6 GB' },
];
