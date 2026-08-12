import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Loader2, AlertCircle, FileText, Download, Trash2,
  ChevronRight, Filter, CheckCircle2, Clock, XCircle,
  Code, Eye, ArrowRight, PlusCircle, FileSpreadsheet,
  BarChart3, Globe, X, ChevronDown, ChevronUp,
  ShieldCheck, AlertTriangle, TrendingUp, Lightbulb, Wrench, Tag, Calendar, Hash, FileStack,
} from 'lucide-react';
import { api } from '@/services/api';
import type {
  AnalysisResult, AnalysisHistoryItem, AnalysisProgress, GapResult,
} from '@/types';
import {
  RISK_BADGE_CLASSES, RISK_LABELS_AZ, RISK_LABELS_EN,
  RISK_COLORS, ANALYSIS_STATUS_LABELS_AZ,
  STATUS_BADGE_CLASSES, STATUS_LABELS_AZ, STATUS_LABELS_EN,
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
  const [previewResult, setPreviewResult] = useState<AnalysisResult | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [reportLang, setReportLang] = useState<'az' | 'en'>('az');
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [expandedGap, setExpandedGap] = useState<string | null>(null);
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

  const handleDownload = useCallback(async (id: string, format: 'pdf' | 'json', lang?: 'az' | 'en') => {
    const key = `${id}-${format}`;
    setDownloading(key);
    try {
      let blob: Blob;
      let filename: string;
      if (format === 'pdf') {
        blob = await api.downloadReport(id, 'pdf', lang);
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

  const handlePreview = useCallback(async (item: AnalysisHistoryItem) => {
    setPreviewLoading(true);
    setPreviewResult(null);
    try {
      const r = await api.getAnalysisResult(item.id);
      setPreviewResult(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Hesabat yüklənə bilmədi');
    } finally {
      setPreviewLoading(false);
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
                          onClick={() => handlePreview(item)}
                          disabled={previewLoading}
                          className="btn-secondary text-xs"
                          title="Hesabata bax (endirmədən)"
                        >
                          {previewLoading && !previewResult
                            ? <Loader2 size={14} className="animate-spin" />
                            : <Eye size={14} />}
                          Bax
                        </button>
                        <div className="relative">
                          <button
                            onClick={() => { setShowLangMenu(showLangMenu ? false : item.id); setReportLang('az'); }}
                            className="btn-secondary text-xs"
                            title="Dil seçimi ilə endir"
                          >
                            <Download size={14} /> PDF
                            <ChevronDown size={10} className="ml-0.5" />
                          </button>
                          {showLangMenu === item.id && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setShowLangMenu(false)} />
                              <div className="absolute right-0 top-full z-20 mt-1 w-44 rounded-lg border border-slate-700 bg-slate-900 shadow-xl">
                                <button
                                  onClick={() => { handleDownload(item.id, 'pdf', 'az'); setShowLangMenu(false); }}
                                  disabled={!!downloading}
                                  className="flex w-full items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800"
                                >
                                  <Globe size={12} /> Azərbaycanca
                                </button>
                                <button
                                  onClick={() => { handleDownload(item.id, 'pdf', 'en'); setShowLangMenu(false); }}
                                  disabled={!!downloading}
                                  className="flex w-full items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800"
                                >
                                  <Globe size={12} /> English
                                </button>
                              </div>
                            </>
                          )}
                        </div>
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

      {/* ── Preview Modal ── */}
      {(previewResult || previewLoading) && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 animate-fade-in"
          onClick={() => { setPreviewResult(null); setPreviewLoading(false); }}
        >
          <div
            className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {previewLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 size={28} className="animate-spin text-violet-500" />
                <span className="ml-3 text-sm text-slate-500">Hesabat yüklənir...</span>
              </div>
            ) : previewResult ? (
              <>
                <div className="flex items-center justify-between border-b-2 border-slate-200 px-8 py-5">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-sm font-medium text-violet-600">
                      <ShieldCheck size={16} />
                      Gap-Analiz Hesabatı
                    </div>
                    <h2 className="mt-1 text-xl font-bold text-slate-900 truncate">
                      {previewResult.document_title}
                    </h2>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 ${RISK_BADGE_CLASSES[previewResult.risk_level].replace('text-', 'bg-').replace('/15', '/10')}`}>
                      <span className={`h-2.5 w-2.5 rounded-full ${RISK_COLORS[previewResult.risk_level]}`} />
                      <span className="text-xs font-bold text-slate-700">
                        {RISK_LABELS_AZ[previewResult.risk_level]}
                      </span>
                    </div>
                    <button
                      onClick={() => { handleDownload(previewResult.id, 'pdf', 'az'); }}
                      disabled={!!downloading}
                      className="btn-primary text-xs whitespace-nowrap"
                    >
                      {downloading === `${previewResult.id}-pdf`
                        ? <Loader2 size={14} className="animate-spin" />
                        : <Download size={14} />}
                      PDF Endir
                    </button>
                    <button onClick={() => setPreviewResult(null)} className="text-slate-400 hover:text-slate-600">
                      <X size={20} />
                    </button>
                  </div>
                </div>

                <div className="overflow-y-auto px-8 py-6">
                  {/* Stats */}
                  <div className="grid grid-cols-4 gap-3 mb-6">
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-center">
                      <p className="text-2xl font-bold text-emerald-700">{previewResult.compliant_count}</p>
                      <p className="text-xs text-emerald-600">Uyğun</p>
                    </div>
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-center">
                      <p className="text-2xl font-bold text-amber-700">{previewResult.partial_count}</p>
                      <p className="text-xs text-amber-600">Qismən</p>
                    </div>
                    <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-center">
                      <p className="text-2xl font-bold text-red-700">{previewResult.missing_count}</p>
                      <p className="text-xs text-red-600">Yoxdur</p>
                    </div>
                    <div className="rounded-lg border border-violet-200 bg-violet-50 p-3 text-center">
                      <p className="text-2xl font-bold text-violet-700">{previewResult.total_controls}</p>
                      <p className="text-xs text-violet-600">Ümumi</p>
                    </div>
                  </div>

                  {/* Classification */}
                  {previewResult.document_classification?.detected_type && (
                    <div className="mb-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs font-medium text-slate-500 mb-2">Sənəd Klassifikasiyası</p>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <p className="text-[10px] text-slate-400">Növ</p>
                          <p className="text-sm font-semibold text-slate-800">{previewResult.document_classification.detected_type}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400">Standart</p>
                          <p className="text-sm font-semibold text-slate-800">{previewResult.document_classification.applicable_standard}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400">Bendlər</p>
                          <div className="flex flex-wrap gap-1">
                            {previewResult.document_classification.primary_clauses.map((c, i) => (
                              <span key={i} className="rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-medium text-violet-700">{c}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Executive Summary */}
                  {previewResult.executive_summary && (
                    <div className="mb-6">
                      <h3 className="text-sm font-bold text-slate-800 mb-2">İcraçı Xülasə</h3>
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                        <p className="text-sm leading-relaxed text-slate-700 whitespace-pre-line">{previewResult.executive_summary}</p>
                      </div>
                    </div>
                  )}

                  {/* Gap Details */}
                  <h3 className="text-sm font-bold text-slate-800 mb-3">Gap Detalları</h3>
                  <div className="space-y-2">
                    {previewResult.gaps.map((gap, idx) => (
                      <div key={idx} className="rounded-lg border border-slate-200 overflow-hidden">
                        <button
                          onClick={() => setExpandedGap(expandedGap === `${idx}` ? null : `${idx}`)}
                          className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-slate-50"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_BADGE_CLASSES[gap.status].replace('/15', '/10')}`}>
                              {STATUS_LABELS_AZ[gap.status]}
                            </span>
                            <span className="text-sm font-medium text-slate-800 truncate">{gap.control_category}</span>
                            <span className="text-xs text-slate-400">{gap.control_source}</span>
                          </div>
                          {expandedGap === `${idx}` ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                        </button>
                        {expandedGap === `${idx}` && (
                          <div className="border-t border-slate-100 px-4 py-3 space-y-2">
                            <p className="text-sm text-slate-700">{gap.control_text}</p>
                            {gap.justification && (
                              <p className="text-xs text-slate-500"><span className="font-medium">İzah:</span> {gap.justification}</p>
                            )}
                            {gap.gap_analysis && (
                              <p className="text-xs text-slate-500"><span className="font-medium">Boşluq:</span> {gap.gap_analysis}</p>
                            )}
                            {gap.potential_risks && (
                              <p className="text-xs text-red-600"><span className="font-medium">Risklər:</span> {gap.potential_risks}</p>
                            )}
                            {gap.remediation_proposal && (
                              <div className="flex gap-2 rounded-md border border-violet-200 bg-violet-50 p-2 text-xs text-violet-700">
                                <Wrench size={12} className="mt-0.5 flex-shrink-0" />
                                <span>{gap.remediation_proposal}</span>
                              </div>
                            )}
                            {gap.evidence_snippet && (
                              <div className="rounded-md border border-slate-200 bg-slate-100 p-2 text-xs italic text-slate-500">
                                "{gap.evidence_snippet}"
                                {gap.evidence_reference && <p className="mt-1 not-italic text-slate-400">— {gap.evidence_reference}</p>}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Recommendations */}
                  {previewResult.recommendations?.length > 0 && (
                    <div className="mt-6">
                      <h3 className="text-sm font-bold text-slate-800 mb-3">Tövsiyələr</h3>
                      <div className="space-y-2">
                        {previewResult.recommendations.map((rec, i) => (
                          <div key={i} className="flex gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                            <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-700">{i + 1}</span>
                            <p className="text-sm leading-relaxed text-slate-700">{rec}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
