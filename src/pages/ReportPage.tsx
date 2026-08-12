import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Loader2, AlertCircle, FileText, Download, Trash2,
  ChevronRight, Filter, CheckCircle2, Clock, XCircle,
  Code, Eye, ArrowRight, PlusCircle, FileSpreadsheet,
  BarChart3,
} from 'lucide-react';
import { api } from '@/services/api';
import type {
  AnalysisResult, AnalysisHistoryItem, AnalysisProgress,
} from '@/types';
import {
  RISK_BADGE_CLASSES, RISK_LABELS_AZ, ANALYSIS_STATUS_LABELS_AZ,
  STATUS_BADGE_CLASSES, STATUS_LABELS_AZ,
} from '@/types';
import type { ActiveAnalysis } from '@/App';

interface ReportPageProps {
  activeAnalysis: ActiveAnalysis | null;
  globalProgress: AnalysisProgress | null;
  onNavigateAnalysis: (a: ActiveAnalysis) => void;
  onNavigateUpload: () => void;
  onNavigateTemplate: () => void;
}

type StatusFilter = 'all' | 'completed' | 'running' | 'failed';

export function ReportPage({
  activeAnalysis,
  globalProgress,
  onNavigateAnalysis,
  onNavigateUpload,
  onNavigateTemplate,
}: ReportPageProps) {
  const [history, setHistory] = useState<AnalysisHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedResult, setExpandedResult] = useState<AnalysisResult | null>(null);
  const [expandedLoading, setExpandedLoading] = useState(false);
  const [expandedError, setExpandedError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const h = await api.getAnalysisHistory();
      setHistory(h);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Hesabatlar yüklənə bilmədi');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  // Refresh list when a running analysis completes
  useEffect(() => {
    if (globalProgress?.status === 'completed' || globalProgress?.status === 'failed') {
      loadHistory();
    }
  }, [globalProgress?.status, loadHistory]);

  const counts = {
    all:       history.length,
    completed: history.filter((h) => h.status === 'completed').length,
    running:   history.filter((h) => h.status !== 'completed' && h.status !== 'failed').length,
    failed:    history.filter((h) => h.status === 'failed').length,
  };

  const filtered = filter === 'all'       ? history :
                   filter === 'completed' ? history.filter((h) => h.status === 'completed') :
                   filter === 'running'   ? history.filter((h) => h.status !== 'completed' && h.status !== 'failed') :
                                            history.filter((h) => h.status === 'failed');

  // Stop polling on unmount
  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const handleExpand = useCallback(async (item: AnalysisHistoryItem) => {
    const newId = expandedId === item.id ? null : item.id;
    setExpandedId(newId);
    setExpandedResult(null);
    setExpandedError(null);

    // Stop any existing polling
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }

    if (newId) {
      const isRunningItem = item.status !== 'completed' && item.status !== 'failed';

      const fetchResult = async () => {
        setExpandedLoading(true);
        try {
          const r = await api.getAnalysisResult(newId);
          setExpandedResult(r);
          setExpandedError(null);
          // If completed or failed, stop polling
          if (r.status === 'completed' || r.status === 'failed') {
            if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
            loadHistory();
          }
        } catch (e) {
          setExpandedError(e instanceof Error ? e.message : 'Nəticə yüklənə bilmədi');
        } finally {
          setExpandedLoading(false);
        }
      };

      await fetchResult();

      // If running, start polling for real-time updates
      if (isRunningItem) {
        pollRef.current = setInterval(fetchResult, 3000);
      }
    }
  }, [expandedId, loadHistory]);

  const handleDownload = useCallback(async (id: string, format: 'pdf' | 'json') => {
    const key = `${id}-${format}`;
    setDownloading(key);
    try {
      let blob: Blob;
      let filename: string;
      if (format === 'pdf') {
        blob = await api.downloadReport(id, 'pdf');
        filename = `gap-analysis-${id.slice(0, 8)}.pdf`;
      } else {
        blob = await api.downloadReportJson(id);
        filename = `gap-analysis-${id.slice(0, 8)}.json`;
      }
      const url = URL.createObjectURL(blob);
      const a   = document.createElement('a');
      a.href    = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Endirmə xətası');
    } finally {
      setDownloading(null);
    }
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    setDeleting(id);
    try {
      await api.deleteAnalysis(id);
      setHistory((prev) => prev.filter((h) => h.id !== id));
      if (expandedId === id) { setExpandedId(null); setExpandedResult(null); }
    } catch { /* ignore */ } finally {
      setDeleting(null);
    }
  }, [expandedId]);

  const FILTER_TABS: { key: StatusFilter; label: string }[] = [
    { key: 'all',       label: 'Hamısı' },
    { key: 'completed', label: 'Tamamlanıb' },
    { key: 'running',   label: 'Gedişatda' },
    { key: 'failed',    label: 'Xəta' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Hesabatlar</h1>
          <p className="mt-1 text-slate-400">Bütün analiz və audit hesabatları — aktiv və keçmiş.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={onNavigateTemplate} className="btn-secondary">
            <FileSpreadsheet size={16} /> Hesabat Şablonu
          </button>
          <button onClick={onNavigateUpload} className="btn-primary">
            <PlusCircle size={16} /> Yeni Analiz
          </button>
        </div>
      </div>

      {/* Active analysis live tracker */}
      {activeAnalysis && globalProgress &&
       globalProgress.status !== 'completed' && globalProgress.status !== 'failed' && (
        <div
          className="card p-4 border border-violet-500/30 cursor-pointer hover:bg-slate-800/20 transition-colors"
          onClick={() => onNavigateAnalysis(activeAnalysis)}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-600/10 text-violet-400">
              <Loader2 size={20} className="animate-spin" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-200">{activeAnalysis.documentTitle}</p>
              <p className="text-xs text-slate-500 mt-0.5 truncate">{globalProgress.message}</p>
            </div>
            <div className="text-right">
              <span className="text-sm font-bold text-violet-400">{globalProgress.progress}%</span>
            </div>
          </div>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-violet-500 transition-all duration-700"
              style={{ width: `${globalProgress.progress}%` }}
            />
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          <AlertCircle size={16} /> {error}
          <button onClick={() => setError(null)} className="ml-auto"><XCircle size={14} /></button>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 text-sm text-slate-500 mr-1">
          <Filter size={14} /> Filtr:
        </div>
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              filter === tab.key
                ? 'bg-violet-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
            }`}
          >
            {tab.label}
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${
              filter === tab.key ? 'bg-white/20' : 'bg-slate-700'
            }`}>
              {counts[tab.key]}
            </span>
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-violet-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <FileSpreadsheet size={40} className="mx-auto text-slate-700" />
          <p className="mt-4 text-slate-400">
            {filter === 'all' ? 'Hələ heç bir analiz yoxdur.' : 'Bu filtrlə uyğun hesabat tapılmadı.'}
          </p>
          <button onClick={onNavigateUpload} className="btn-primary mt-4">
            <PlusCircle size={16} /> Yeni Analiz Başlat
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => {
            const isRunning = item.status !== 'completed' && item.status !== 'failed';
            const isExpanded = expandedId === item.id;

            return (
              <div key={item.id} className="card overflow-hidden transition-all">
                <div
                  className="flex cursor-pointer items-center gap-4 p-4 hover:bg-slate-800/30 transition-colors"
                  onClick={() => handleExpand(item)}
                >
                  {/* Status icon */}
                  <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${
                    item.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' :
                    item.status === 'failed'    ? 'bg-red-500/10 text-red-400'         :
                                                  'bg-violet-500/10 text-violet-400'
                  }`}>
                    {item.status === 'completed' ? <CheckCircle2 size={18} /> :
                     item.status === 'failed'    ? <XCircle size={18} />      :
                                                   <Loader2 size={18} className="animate-spin" />}
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-100">{item.document_title}</p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span>{new Date(item.started_at).toLocaleString('az-AZ')}</span>
                      <span className="uppercase text-slate-600">· {item.detected_language}</span>
                      {item.status === 'completed' && (
                        <>
                          <span className={`badge ${RISK_BADGE_CLASSES[item.risk_level]}`}>
                            {RISK_LABELS_AZ[item.risk_level]}
                          </span>
                          <span>· {item.total_controls} nəzarət</span>
                        </>
                      )}
                      {isRunning && (
                        <span className="text-violet-400">
                          · {ANALYSIS_STATUS_LABELS_AZ[item.status as keyof typeof ANALYSIS_STATUS_LABELS_AZ] || item.status}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Action buttons — stop propagation */}
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    {item.status === 'completed' && (
                      <>
                        <button
                          onClick={() => handleDownload(item.id, 'pdf')}
                          disabled={!!downloading}
                          className="btn-secondary text-xs"
                          title="PDF endir"
                        >
                          {downloading === `${item.id}-pdf`
                            ? <Loader2 size={14} className="animate-spin" />
                            : <Download size={14} />}
                          PDF
                        </button>
                        <button
                          onClick={() => handleDownload(item.id, 'json')}
                          disabled={!!downloading}
                          className="btn-ghost text-xs"
                          title="JSON endir"
                        >
                          {downloading === `${item.id}-json`
                            ? <Loader2 size={14} className="animate-spin" />
                            : <Code size={14} />}
                        </button>
                        <button
                          onClick={() => onNavigateAnalysis({
                            analysisId:    item.id,
                            documentId:    item.document_id,
                            documentTitle: item.document_title,
                          })}
                          className="btn-secondary text-xs"
                        >
                          <Eye size={14} /> Bax
                        </button>
                      </>
                    )}
                    {isRunning && (
                      <button
                        onClick={() => onNavigateAnalysis({
                          analysisId:    item.id,
                          documentId:    item.document_id,
                          documentTitle: item.document_title,
                        })}
                        className="btn-secondary text-xs"
                      >
                        İzlə <ArrowRight size={14} />
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
                    <ChevronRight
                      size={16}
                      className={`text-slate-600 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                    />
                  </div>
                </div>

                {/* Expanded preview — now shows real-time partial results */}
                {isExpanded && (
                  <div className="border-t border-slate-800 bg-slate-950/40 p-5">
                    {expandedLoading && !expandedResult ? (
                      <div className="flex items-center gap-2 py-3 text-sm text-slate-500">
                        <Loader2 size={16} className="animate-spin" /> Yüklənir...
                      </div>
                    ) : expandedError ? (
                      <p className="text-sm text-red-400">{expandedError}</p>
                    ) : expandedResult ? (
                      <div className="space-y-4">
                        {/* Real-time progress bar for running analyses */}
                        {expandedResult.status !== 'completed' && expandedResult.status !== 'failed' && (
                          <div className="flex items-center gap-2 text-sm text-violet-400">
                            <Loader2 size={14} className="animate-spin" />
                            <span>{ANALYSIS_STATUS_LABELS_AZ[expandedResult.status] || expandedResult.status} — {expandedResult.progress}%</span>
                            <div className="flex-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                              <div className="h-full rounded-full bg-violet-500 transition-all duration-500" style={{ width: `${expandedResult.progress}%` }} />
                            </div>
                          </div>
                        )}
                        {expandedResult.executive_summary && (
                          <div>
                            <p className="text-xs font-medium text-slate-400 mb-1">İcraçı Xülasə</p>
                            <p className="text-sm leading-relaxed text-slate-300 line-clamp-4">
                              {expandedResult.executive_summary}
                            </p>
                          </div>
                        )}
                        {expandedResult.total_controls > 0 && (
                          <div className="grid grid-cols-3 gap-3">
                            <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 text-center">
                              <p className="text-lg font-bold text-emerald-400">{expandedResult.compliant_count}</p>
                              <p className="text-xs text-emerald-600">Uyğun</p>
                            </div>
                            <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 text-center">
                              <p className="text-lg font-bold text-amber-400">{expandedResult.partial_count}</p>
                              <p className="text-xs text-amber-600">Qismən</p>
                            </div>
                            <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-center">
                              <p className="text-lg font-bold text-red-400">{expandedResult.missing_count}</p>
                              <p className="text-xs text-red-600">Yoxdur</p>
                            </div>
                          </div>
                        )}
                        {/* Real-time gaps list (partial) */}
                        {expandedResult.gaps && expandedResult.gaps.length > 0 && (
                          <div className="space-y-2 max-h-60 overflow-y-auto">
                            <p className="text-xs font-medium text-slate-400 flex items-center gap-1">
                              <BarChart3 size={12} /> Analiz edilən nəzarətlər ({expandedResult.gaps.length})
                            </p>
                            {expandedResult.gaps.slice(0, 20).map((gap, idx) => (
                              <div key={idx} className="rounded-lg border border-slate-800 bg-slate-900/50 p-3 text-xs">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className={`badge ${STATUS_BADGE_CLASSES[gap.status]} text-[10px]`}>
                                    {STATUS_LABELS_AZ[gap.status]}
                                  </span>
                                  <span className="badge bg-violet-500/10 text-violet-400 text-[10px]">{gap.control_source}</span>
                                </div>
                                <p className="text-slate-400 line-clamp-2">{gap.control_text}</p>
                              </div>
                            ))}
                            {expandedResult.gaps.length > 20 && (
                              <p className="text-center text-[10px] text-slate-600 py-1">
                                İlk 20 nəzarət göstərilir...
                              </p>
                            )}
                          </div>
                        )}
                        {expandedResult.status === 'completed' && (
                          <button
                            onClick={() => onNavigateAnalysis({
                              analysisId:    item.id,
                              documentId:    item.document_id,
                              documentTitle: item.document_title,
                            })}
                            className="btn-secondary text-xs"
                          >
                            <FileText size={14} /> Tam hesabata get
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 py-3 text-sm text-slate-500">
                        <Loader2 size={16} className="animate-spin" />
                        Analiz gözlənilir...
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
