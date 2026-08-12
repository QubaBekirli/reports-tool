import type {
  UploadedDocument,
  AnalysisResult,
  AnalysisProgress,
  ChatResponse,
  OllamaModel,
  AppSettings,
  AnalysisHistoryItem,
  KBDocument,
} from '@/types';
import { DEFAULT_SETTINGS } from '@/types';

const API_BASE = (() => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  return 'http://localhost:8000';
})();

export const API_HEALTHY = 'unknown';

function _formatNetError(e: unknown, fallback: string): string {
  if (e instanceof TypeError && e.message.includes('Failed to fetch')) {
    return `${fallback} — Backend (${API_BASE}) cavab vermir. Server-in işlədiyindən əmin olun.`;
  }
  return e instanceof Error ? e.message : fallback;
}

const STORAGE_KEY = 'lokalo-ai-settings';

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    });
  } catch (e) {
    const msg = _formatNetError(e, `Şəbəkə xətası: ${path}`);
    console.error(`[API] ${msg}`);
    throw new Error(msg);
  }
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    console.error(`[API] HTTP ${res.status} ${path}: ${txt.slice(0, 500)}`);
    throw new Error(`HTTP ${res.status}: ${txt || res.statusText}`);
  }
  const raw = await res.text();
  if (!raw) return undefined as T;
  try {
    return JSON.parse(raw) as T;
  } catch {
    console.error(`[API] JSON parse failed for ${path}, raw:`, raw.slice(0, 500));
    throw new Error(`Server cavabı JSON formatında deyil: ${raw.slice(0, 200)}`);
  }
}

export const api = {
  async getDocuments(): Promise<UploadedDocument[]> {
    return await http<UploadedDocument[]>('/api/documents');
  },

  async uploadDocument(file: File): Promise<UploadedDocument> {
    const fd = new FormData();
    fd.append('file', file);
    let res: Response;
    try {
      res = await fetch(`${API_BASE}/api/upload`, { method: 'POST', body: fd });
    } catch (e) {
      const msg = _formatNetError(e, 'Yükləmə xətası');
      throw new Error(msg);
    }
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(`Yükləmə xətası (${res.status}): ${txt}`);
    }
    const raw = await res.text();
    try {
      return JSON.parse(raw);
    } catch {
      throw new Error(`Server cavabı JSON deyil: ${raw.slice(0, 200)}`);
    }
  },

  async startAnalysis(documentId: string): Promise<{ analysis_id: string }> {
    return http<{ analysis_id: string }>('/api/analyze', {
      method: 'POST',
      body: JSON.stringify({ document_id: documentId }),
    });
  },

  async getAnalysisStatus(analysisId: string): Promise<AnalysisProgress> {
    return http<AnalysisProgress>(`/api/analyze/${analysisId}/status`);
  },

  async getAnalysisResult(analysisId: string): Promise<AnalysisResult> {
    return http<AnalysisResult>(`/api/analyze/${analysisId}/result`);
  },

  async getAnalysisHistory(): Promise<AnalysisHistoryItem[]> {
    return await http<AnalysisHistoryItem[]>('/api/analyses');
  },

  async deleteAnalysis(analysisId: string): Promise<void> {
    await http(`/api/analyses/${analysisId}`, { method: 'DELETE' });
  },

  async downloadReport(analysisId: string, format: 'docx' | 'pdf', language?: 'az' | 'en'): Promise<Blob> {
    let res: Response;
    const langParam = language ? `&language=${language}` : '';
    try {
      res = await fetch(`${API_BASE}/api/report/${analysisId}/download?format=${format}${langParam}`);
    } catch (e) {
      throw new Error(_formatNetError(e, 'Hesabat endirmə xətası'));
    }
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(`Endirmə xətası (${res.status}): ${txt}`);
    }
    return res.blob();
  },

  async downloadReportJson(analysisId: string): Promise<Blob> {
    let res: Response;
    try {
      res = await fetch(`${API_BASE}/api/analyze/${analysisId}/result`);
    } catch (e) {
      throw new Error(_formatNetError(e, 'JSON endirmə xətası'));
    }
    if (!res.ok) {
      throw new Error(`JSON endirmə xətası (${res.status})`);
    }
    const data = await res.json();
    const jsonStr = JSON.stringify(data, null, 2);
    return new Blob([jsonStr], { type: 'application/json' });
  },

  async chat(query: string, language: string, history?: { role: string; content: string }[]): Promise<ChatResponse> {
    return http<ChatResponse>('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ query, language, history: history || [] }),
    });
  },

  async getOllamaModels(): Promise<OllamaModel[]> {
    return await http<OllamaModel[]>('/api/settings/models');
  },

  async getSettings(): Promise<AppSettings> {
    return await http<AppSettings>('/api/settings');
  },

  async saveSettings(settings: AppSettings): Promise<AppSettings> {
    return await http<AppSettings>('/api/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  },

  async getCorpusStats(): Promise<{ total_controls: number; by_category: Record<string, number>; by_language: Record<string, number> }> {
    return await http('/api/corpus/stats');
  },

  async getCorpusControls(): Promise<{ id: string; source: string; category: string; requirement_text: string; language: string }[]> {
    return await http('/api/corpus/controls');
  },

  async healthCheck(): Promise<{ status: string; ollama: boolean; chroma: boolean; openrouter: boolean }> {
    return await http('/api/health');
  },

  async getProviderInfo(): Promise<{ provider: string; ollama_ok: boolean; openrouter_ok: boolean; openrouter_models: OllamaModel[] }> {
    return await http('/api/settings/provider');
  },

  async getKBDocuments(): Promise<KBDocument[]> {
    return await http<KBDocument[]>('/api/kb-documents');
  },

  async getKBDocument(id: string): Promise<KBDocument> {
    return await http<KBDocument>(`/api/kb-documents/${id}`);
  },

  async uploadKBDocument(file: File, source?: string): Promise<KBDocument> {
    const fd = new FormData();
    fd.append('file', file);
    if (source) fd.append('source', source);
    let res: Response;
    try {
      res = await fetch(`${API_BASE}/api/kb-documents`, { method: 'POST', body: fd });
    } catch (e) {
      throw new Error(_formatNetError(e, 'KB sənəd yükləmə xətası'));
    }
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(`Yükləmə xətası (${res.status}): ${txt}`);
    }
    return res.json();
  },

  async updateKBDocument(id: string, title: string, source: string, content: string): Promise<KBDocument> {
    const fd = new FormData();
    fd.append('title', title);
    fd.append('source', source);
    fd.append('content', content);
    let res: Response;
    try {
      res = await fetch(`${API_BASE}/api/kb-documents/${id}`, { method: 'PUT', body: fd });
    } catch (e) {
      throw new Error(_formatNetError(e, 'KB sənəd yeniləmə xətası'));
    }
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(`Yeniləmə xətası (${res.status}): ${txt}`);
    }
    return res.json();
  },

  async deleteKBDocument(id: string): Promise<void> {
    await http(`/api/kb-documents/${id}`, { method: 'DELETE' });
  },

  async searchKBDocuments(query: string): Promise<{ id: string; title: string; source: string; filename: string; content_preview: string }[]> {
    return await http(`/api/kb-documents/search?query=${encodeURIComponent(query)}`);
  },

  async getDocTypes(): Promise<{ types: Record<string, { label_az: string; label_en: string; sections: string[] }>; standards: string[] }> {
    return await http('/api/document-builder/types');
  },

  async generateDocument(req: { topic: string; doc_type: string; language: string; standards: string[]; organization: string }): Promise<{ title: string; sections: { heading: string; content: string }[]; references: string[]; summary: string }> {
    return await http('/api/document-builder/generate', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  },
};

export function loadSettingsLocal(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    // ignore
  }
  return { ...DEFAULT_SETTINGS };
}

export function saveSettingsLocal(settings: AppSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
}

export { API_BASE };
