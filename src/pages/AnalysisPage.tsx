import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Loader2, CheckCircle2, AlertCircle, FileText, ArrowRight, Clock,
  Trash2, History, ChevronDown, ChevronUp, X, UploadCloud,
  FileSearch, Eye, EyeOff, BarChart3,
} from 'lucide-react';
import { api } from '@/services/api';
import type {
  AnalysisProgress, AnalysisResult, AnalysisHistoryItem,
  UploadedDocument, DocumentLanguage, GapResult, ControlStatus,
} from '@/types';
import {
  RISK_BADGE_CLASSES, RISK_LABELS_AZ, ANALYSIS_STATUS_LABELS_AZ,
  STATUS_BADGE_CLASSES, STATUS_LABELS_AZ,
} from '@/types';
import type { ActiveAnalysis } from '@/App';

interface AnalysisPageProps {
  activeAnalysis: ActiveAnalysis | null;
  globalProgress: AnalysisProgress | null;
  onAnalysisStarted: (a: ActiveAnalysis) => void;
  onNavigateReport: (a: ActiveAnalysis) => void;
  onStopPolling: () => void;
}

const ACCEPTED = '.pdf,.docx,.pptx,.xlsx,.png,.jpg,.jpeg,.txt';

const FORMAT_ICONS: Record<string, string> = {
  pdf: '📄', docx: '📝', pptx: '📊', xlsx: '📈',
  png: '🖼️', jpg: '🖼️', jpeg: '🖼️', txt: '📄',
};

const LANG_LABELS: Record<DocumentLanguage, string> = {
  az: 'Azərbaycanca', en: 'English', ru: 'Русский', unknown: 'Bilinmir',
};

const STAGES: { key: AnalysisProgress['status']; label: string }[] = [
  { key: 'queued',            label: 'Sıraya alındı' },
  { key: 'parsing',           label: 'Mətn çıxarılır' },
  { key: 'embedding',         label: 'Embedding hazırlanır' },
  { key: 'analyzing',         label: 'Gap analiz aparılır' },
  { key: 'generating_report', label: 'Hesabat hazırlanır' },
  { key: 'completed',         label: 'Tamamlandı' },
];

export function AnalysisPage({
  activeAnalysis,
  globalProgress,
  onAnalysisStarted,
  onNavigateReport,
  onStopPolling,
}: AnalysisPageProps) {
  const [documents, setDocuments]         = useState<UploadedDocument[]>([]);
  const [uploading, setUploading]         = useState(false);
  const [dragging, setDragging]           = useState(false);
  const [analyzingDoc, setAnalyzingDoc]   = useState<string | null>(null);
  const [showText, setShowText]           = useState<string | null>(null);
  const [error, setError]                 = useState<string | null>(null);
  const [history, setHistory]             = useState<AnalysisHistoryItem[]>([]);
  const [showHistory, setShowHistory]     = useState(true);
  const [deleting, setDeleting]           = useState<string | null>(null);
  const [completedResult, setCompletedResult] = useState<AnalysisResult | null>(null);
  const [statFilter, setStatFilter] = useState<ControlStatus | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadHistory = useCallback(async () => {
    try {
      const h = await api.getAnalysisHistory();
      setHistory(h);
    } catch { setHistory([]); }
  }, []);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  // Fetch result when polling reports completed
  useEffect(() => {
    if (globalProgress?.status === 'completed' && activeAnalysis) {
      api.getAnalysisResult(activeAnalysis.analysisId)
        .then(setCompletedResult)
        .catch(() => {});
      loadHistory();
    }
    if (globalProgress?.status === 'failed') {
      loadHistory();
    }
  }, [globalProgress?.status, activeAnalysis, loadHistory]);

  const handleFiles = useCallback(async (files: FileList) => {
    if (!files.length) return;
    setUploading(true);
    setError(null);
    try {
      for (const file of Array.from(files)) {
        const doc = await api.uploadDocument(file);
        setDocuments((prev) => [doc, ...prev]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Yükləmə xətası');
    } finally {
      setUploading(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const startAnalysis = useCallback(async (doc: UploadedDocument) => {
    setAnalyzingDoc(doc.id);
    setError(null);
    setCompletedResult(null);
    try {
      const { analysis_id } = await api.startAnalysis(doc.id);
      const analysis: ActiveAnalysis = {
        analysisId:    analysis_id,
        documentId:    doc.id,
        documentTitle: doc.title,
      };
      onAnalysisStarted(analysis);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Analiz başladıla bilmədi');
    } finally {
      setAnalyzingDoc(null);
    }
  }, [onAnalysisStarted]);

  const removeDoc = useCallback((id: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
    if (showText === id) setShowText(null);
  }, [showText]);

  const handleDelete = useCallback(async (id: string) => {
    setDeleting(id);
    try {
      await api.deleteAnalysis(id);
      setHistory((prev) => prev.filter((h) => h.id !== id));
    } catch { /* ignore */ } finally {
      setDeleting(null);
    }
  }, []);

  const openHistoryItem = useCallback((item: AnalysisHistoryItem) => {
    onNavigateReport({
      analysisId:    item.id,
      documentId:    item.document_id,
      documentTitle: item.document_title,
    });
  }, [onNavigateReport]);

  const running = globalProgress && globalProgress.status !== 'completed' && globalProgress.status !== 'failed';
  const currentStageIdx = globalProgress
    ? STAGES.findIndex((s) => s.key === globalProgress.status)
    : -1;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Analiz</h1>
        <p className="mt-1 text-slate-400">
          Sənəd yükləyin və dərhal gap-analizi başladın. PDF, DOCX, PPTX, XLSX, PNG/JPG (OCR), TXT.
        </p>
      </div>

      {/* Upload zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`relative cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-all ${
          dragging
            ? 'border-violet-500 bg-violet-500/5'
            : 'border-slate-700 bg-slate-900 hover:border-slate-600'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED}
          multiple
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
        {uploading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 size={32} className="animate-spin text-violet-500" />
            <p className="text-sm text-slate-400">Yüklənir və oxunur...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-600/10 text-violet-400">
              <UploadCloud size={24} />
            </div>
            <div>
              <p className="text-base font-medium text-slate-100">
                Sənədi sürükləyin və ya <span className="text-violet-400">seçin</span>
              </p>
              <p className="mt-1 text-sm text-slate-500">Maksimum 50MB · çoxlu fayl dəstəklənir</p>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          <AlertCircle size={16} /> {error}
          <button onClick={() => setError(null)} className="ml-auto"><X size={14} /></button>
        </div>
      )}

      {/* Uploaded documents list */}
      {documents.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-300">
            Yüklənmiş sənədlər ({documents.length})
          </h2>
          {documents.map((doc) => (
            <div key={doc.id} className="card overflow-hidden animate-slide-in">
              <div className="flex items-center gap-4 p-4">
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-slate-800 text-xl">
                  {FORMAT_ICONS[doc.format] || '📄'}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-medium text-slate-100">{doc.title}</p>
                    <span className="badge bg-slate-800 text-slate-400 uppercase">{doc.format}</span>
                    <span className="badge bg-violet-500/10 text-violet-400">
                      {LANG_LABELS[doc.detected_language]}
                    </span>
                    {doc.chunk_count > 0 && (
                      <span className="badge bg-slate-800 text-slate-500">{doc.chunk_count} hissə</span>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-slate-500">
                    {doc.filename} · {(doc.size_bytes / 1024).toFixed(1)} KB
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {doc.extracted_text && (
                    <button
                      onClick={() => setShowText(showText === doc.id ? null : doc.id)}
                      className="btn-ghost"
                    >
                      {showText === doc.id ? <EyeOff size={16} /> : <Eye size={16} />} Mətn
                    </button>
                  )}
                  <button
                    onClick={() => startAnalysis(doc)}
                    disabled={analyzingDoc === doc.id || !!running}
                    className="btn-primary"
                    title={running ? 'Başqa analiz artıq gedir' : ''}
                  >
                    {analyzingDoc === doc.id
                      ? <><Loader2 size={16} className="animate-spin" /> Başladılır...</>
                      : <><FileSearch size={16} /> Analiz et</>}
                  </button>
                  <button
                    onClick={() => removeDoc(doc.id)}
                    className="btn-ghost text-red-400 hover:text-red-300"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
              {showText === doc.id && doc.extracted_text && (
                <div className="border-t border-slate-800 bg-slate-950/50 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <FileText size={14} className="text-slate-500" />
                    <span className="text-xs font-medium text-slate-400">
                      Oxunmuş mətn ({doc.extracted_text.length} simvol)
                    </span>
                  </div>
                  <div className="max-h-64 overflow-y-auto rounded-lg bg-slate-900 p-3 text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">
                    {doc.extracted_text}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Active analysis progress — driven by globalProgress from App */}
      {activeAnalysis && globalProgress && (
        <div className="card p-6 space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-200">{activeAnalysis.documentTitle}</p>
              <p className="text-xs text-slate-500 mt-0.5">
                ID: <code className="rounded bg-slate-800 px-1 py-0.5 text-violet-300">{activeAnalysis.analysisId.slice(0, 8)}…</code>
              </p>
            </div>
            {running && (
              <button onClick={onStopPolling} className="btn-ghost text-xs text-slate-500">
                İzləməni dayandır
              </button>
            )}
          </div>

          {/* Progress bar */}
          <div>
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="text-slate-400">{globalProgress.message}</span>
              <span className="font-bold text-violet-400">{globalProgress.progress}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-violet-600 transition-all duration-700"
                style={{ width: `${globalProgress.progress}%` }}
              />
            </div>
          </div>

          {/* Stage stepper */}
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {STAGES.map((stage, idx) => {
              const done    = currentStageIdx > idx || globalProgress.status === 'completed';
              const current = currentStageIdx === idx && globalProgress.status !== 'completed';
              return (
                <div key={stage.key} className="flex flex-col items-center gap-1.5 text-center">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                    done    ? 'bg-emerald-500/15 text-emerald-400' :
                    current ? 'bg-violet-500/15 text-violet-400'  :
                              'bg-slate-800 text-slate-600'
                  }`}>
                    {done    ? <CheckCircle2 size={16} /> :
                     current ? <Loader2 size={16} className="animate-spin" /> :
                               <Clock size={16} />}
                  </div>
                  <span className={`text-[10px] leading-tight ${
                    done ? 'text-emerald-400' : current ? 'text-violet-300 font-medium' : 'text-slate-600'
                  }`}>
                    {stage.label}
                  </span>
                </div>
              );
            })}
          </div>

          {globalProgress.status === 'failed' && (
            <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
              <AlertCircle size={16} />
              {globalProgress.error || 'Analiz uğursuz oldu'}
            </div>
          )}
        </div>
      )}

      {/* Completed result summary */}
      {completedResult && globalProgress?.status === 'completed' && activeAnalysis && (
        <div className="card p-6 animate-fade-in border border-emerald-500/20">
          <div className="flex items-center gap-2 text-emerald-400 mb-4">
            <CheckCircle2 size={20} />
            <h3 className="text-base font-semibold text-slate-100">Analiz tamamlandı</h3>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 mb-4">
            <button
              onClick={() => setStatFilter('compliant')}
              className="rounded-lg bg-emerald-500/10 p-4 border border-emerald-500/20 text-center hover:bg-emerald-500/15 hover:border-emerald-500/40 transition-all cursor-pointer group"
            >
              <p className="text-2xl font-bold text-emerald-400 group-hover:scale-110 transition-transform">{completedResult.compliant_count}</p>
              <p className="text-xs text-emerald-500/70 mt-0.5">Uyğun</p>
              <p className="text-[10px] text-emerald-600 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">Detallara bax →</p>
            </button>
            <button
              onClick={() => setStatFilter('partial')}
              className="rounded-lg bg-amber-500/10 p-4 border border-amber-500/20 text-center hover:bg-amber-500/15 hover:border-amber-500/40 transition-all cursor-pointer group"
            >
              <p className="text-2xl font-bold text-amber-400 group-hover:scale-110 transition-transform">{completedResult.partial_count}</p>
              <p className="text-xs text-amber-500/70 mt-0.5">Qismən</p>
              <p className="text-[10px] text-amber-600 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">Detallara bax →</p>
            </button>
            <button
              onClick={() => setStatFilter('missing')}
              className="rounded-lg bg-red-500/10 p-4 border border-red-500/20 text-center hover:bg-red-500/15 hover:border-red-500/40 transition-all cursor-pointer group"
            >
              <p className="text-2xl font-bold text-red-400 group-hover:scale-110 transition-transform">{completedResult.missing_count}</p>
              <p className="text-xs text-red-500/70 mt-0.5">Yoxdur</p>
              <p className="text-[10px] text-red-600 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">Detallara bax →</p>
            </button>
          </div>
          <button
            onClick={() => onNavigateReport(activeAnalysis)}
            className="btn-primary"
          >
            Tam hesabata bax <ArrowRight size={16} />
          </button>
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div className="card overflow-hidden">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex w-full items-center justify-between p-4 hover:bg-slate-800/30"
          >
            <div className="flex items-center gap-2">
              <History size={18} className="text-slate-400" />
              <h2 className="text-sm font-semibold text-slate-200">
                Analiz Tarixçəsi ({history.length})
              </h2>
            </div>
            {showHistory ? <ChevronUp size={18} className="text-slate-500" /> : <ChevronDown size={18} className="text-slate-500" />}
          </button>
          {showHistory && (
            <div className="space-y-1 border-t border-slate-800 p-2">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 rounded-lg p-3 hover:bg-slate-800/30"
                >
                  <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${
                    item.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' :
                    item.status === 'failed'    ? 'bg-red-500/10 text-red-400' :
                                                  'bg-violet-500/10 text-violet-400'
                  }`}>
                    {item.status === 'completed' ? <CheckCircle2 size={16} /> :
                     item.status === 'failed'    ? <AlertCircle size={16} />  :
                                                   <Loader2 size={16} className="animate-spin" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-100">{item.document_title}</p>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span>{new Date(item.started_at).toLocaleString('az-AZ')}</span>
                      {item.status === 'completed' && (
                        <span className={`badge ${RISK_BADGE_CLASSES[item.risk_level]}`}>
                          {RISK_LABELS_AZ[item.risk_level]}
                        </span>
                      )}
                      {item.status !== 'completed' && (
                        <span className="text-violet-400">
                          {ANALYSIS_STATUS_LABELS_AZ[item.status as keyof typeof ANALYSIS_STATUS_LABELS_AZ] || item.status}
                        </span>
                      )}
                    </div>
                  </div>
                  {item.status === 'completed' && (
                    <button onClick={() => openHistoryItem(item)} className="btn-secondary text-xs">
                      <FileText size={14} /> Aç
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(item.id)}
                    disabled={deleting === item.id}
                    className="btn-ghost text-red-400 hover:text-red-300"
                  >
                    {deleting === item.id
                      ? <Loader2 size={14} className="animate-spin" />
                      : <Trash2 size={14} />}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {/* ── Stat Detail Modal ── */}
      {statFilter && completedResult && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fade-in"
          onClick={() => setStatFilter(null)}
        >
          <div
            className="card flex max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden p-0"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 p-4">
              <div className="flex items-center gap-3">
                <BarChart3 size={20} className="text-violet-400" />
                <div>
                  <h3 className="text-base font-semibold text-slate-100">
                    {STATUS_LABELS_AZ[statFilter]} nəzarətlər
                  </h3>
                  <p className="text-xs text-slate-500">
                    {completedResult.gaps.filter((g) => g.status === statFilter).length} sənəd / {completedResult.total_controls} ümumi
                  </p>
                </div>
              </div>
              <button onClick={() => setStatFilter(null)} className="btn-ghost">
                <X size={18} />
              </button>
            </div>
            <div className="overflow-y-auto p-4 space-y-3">
              {completedResult.gaps.filter((g) => g.status === statFilter).length === 0 ? (
                <p className="text-center text-sm text-slate-500 py-8">
                  Bu statusda nəzarət yoxdur.
                </p>
              ) : (
                completedResult.gaps
                  .filter((g: GapResult) => g.status === statFilter)
                  .map((gap, idx) => (
                    <div key={idx} className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className={`badge ${STATUS_BADGE_CLASSES[gap.status]}`}>
                          {STATUS_LABELS_AZ[gap.status]}
                        </span>
                        <span className="badge bg-violet-500/10 text-violet-400">{gap.control_source}</span>
                        <span className="badge bg-slate-800 text-slate-400">{gap.control_category}</span>
                      </div>
                      <p className="text-sm text-slate-300 mb-2">{gap.control_text}</p>
                      {gap.justification && (
                        <div className="mt-2">
                          <p className="text-xs font-medium text-slate-500">İzah:</p>
                          <p className="text-xs text-slate-400 mt-0.5">{gap.justification}</p>
                        </div>
                      )}
                      {gap.gap_analysis && (
                        <div className="mt-2">
                          <p className="text-xs font-medium text-slate-500">Boşluq:</p>
                          <p className="text-xs text-slate-400 mt-0.5">{gap.gap_analysis}</p>
                        </div>
                      )}
                      {gap.remediation_proposal && (
                        <div className="mt-2">
                          <p className="text-xs font-medium text-slate-500">Tövsiyə:</p>
                          <p className="text-xs text-slate-400 mt-0.5">{gap.remediation_proposal}</p>
                        </div>
                      )}
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
