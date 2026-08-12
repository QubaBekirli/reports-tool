import { useEffect, useState, useCallback } from 'react';
import { ShieldCheck, FileSearch, MessageSquare, BookOpen, ArrowRight, Cpu, Lock, Database, Clock, CheckCircle2, AlertCircle, FileText, Trash2, Loader2 } from 'lucide-react';
import type { PageId } from '@/App';
import type { AppSettings, AnalysisHistoryItem } from '@/types';
import { api } from '@/services/api';
import { RISK_BADGE_CLASSES, RISK_LABELS_AZ, ANALYSIS_STATUS_LABELS_AZ } from '@/types';
import type { ActiveAnalysis } from '@/App';

interface DashboardPageProps {
  onNavigate: (page: PageId) => void;
  health: { status: string; ollama: boolean; chroma: boolean };
  settings: AppSettings;
  onOpenAnalysis?: (a: ActiveAnalysis) => void;
}

export function DashboardPage({ onNavigate, health, settings, onOpenAnalysis }: DashboardPageProps) {
  const [history, setHistory] = useState<AnalysisHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    try {
      const h = await api.getAnalysisHistory();
      setHistory(h);
    } catch {
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
    const interval = setInterval(loadHistory, 5000);
    return () => clearInterval(interval);
  }, [loadHistory]);

  const handleDelete = useCallback(async (id: string) => {
    setDeleting(id);
    try {
      await api.deleteAnalysis(id);
      setHistory((prev) => prev.filter((h) => h.id !== id));
    } catch {
      // ignore
    } finally {
      setDeleting(null);
    }
  }, []);

  const completed = history.filter((h) => h.status === 'completed');
  const totalCompliant = completed.reduce((s, h) => s + h.compliant_count, 0);
  const totalPartial = completed.reduce((s, h) => s + h.partial_count, 0);
  const totalMissing = completed.reduce((s, h) => s + h.missing_count, 0);
  const totalControls = completed.reduce((s, h) => s + h.total_controls, 0);

  const features = [
    {
      icon: FileSearch,
      title: 'Analiz',
      desc: 'Sənəd yükləyin və dərhal gap-analizi başladın. PDF, DOCX, PPTX, XLSX, şəkil (OCR) və TXT dəstəklənir.',
      action: 'analysis' as PageId,
    },
    {
      icon: MessageSquare,
      title: 'Soruş',
      desc: 'Bilik bazası üzərindən sərbəst sual-cavab rejimi ilə cavablar tapın.',
      action: 'chat' as PageId,
    },
    {
      icon: BookOpen,
      title: 'Bilik Bazası',
      desc: 'AI, Data, Security çərçivələri, NIST, ISO 42001, CBAR və Azərbaycan qanunvericiliyi nəzarət kataloqu.',
      action: 'knowledge' as PageId,
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <div className="mb-2 flex items-center gap-2">
          <ShieldCheck size={20} className="text-violet-400" />
          <span className="text-sm font-medium text-violet-400">Reports Tool</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-100">
          AI Security Governance & Gap-Analiz
        </h1>
        <p className="mt-2 max-w-2xl text-slate-400">
          Bank və korporativ mühit üçün tam lokal işləyən analiz aləti. Sənədlərinizi beynəlxalq
          və yerli təhlükəsizlik tələbləri ilə müqayisə edin, boşluqları aşkarlayın və hesabat endirin.
        </p>
      </div>

      {health.status !== 'ok' && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3">
          <AlertCircle size={18} className="mt-0.5 flex-shrink-0 text-amber-400" />
          <div className="text-sm text-amber-300">
            <strong>Backend bağlantısı yoxdur.</strong> Tam funksionallıq üçün Python backend-i və Ollama-nı işə salın.
            <button onClick={() => onNavigate('settings')} className="ml-2 underline font-medium">
              Ayarlara bax
            </button>
          </div>
        </div>
      )}

      {/* Stats Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">Ümumi Analiz</p>
            <FileText size={16} className="text-slate-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-100">{completed.length}</p>
          <p className="text-xs text-slate-500">tamamlanmış hesabat</p>
        </div>
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">Uyğun</p>
            <CheckCircle2 size={16} className="text-emerald-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-400">{totalCompliant}</p>
          <p className="text-xs text-slate-500">{totalControls} nəzarətdən</p>
        </div>
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">Qismən / Yox</p>
            <AlertCircle size={16} className="text-amber-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-amber-400">{totalPartial + totalMissing}</p>
          <p className="text-xs text-slate-500">boşluqlar aşkarlanıb</p>
        </div>
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">Aktiv Model</p>
            <Cpu size={16} className="text-violet-400" />
          </div>
          <p className="mt-2 truncate text-sm font-bold text-violet-300">{settings.ollama_model.split(':')[0]}</p>
          <p className="text-xs text-slate-500">Ollama LLM</p>
        </div>
      </div>

      {/* Feature Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((f) => {
          const Icon = f.icon;
          return (
            <button
              key={f.title}
              onClick={() => onNavigate(f.action)}
              className="card-hover group p-5 text-left"
            >
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-violet-600/10 text-violet-400 transition-colors group-hover:bg-violet-600 group-hover:text-white">
                <Icon size={22} />
              </div>
              <h3 className="text-base font-semibold text-slate-100">{f.title}</h3>
              <p className="mt-1 text-sm text-slate-500">{f.desc}</p>
              <div className="mt-3 flex items-center gap-1 text-sm font-medium text-violet-400 opacity-0 transition-opacity group-hover:opacity-100">
                Aç <ArrowRight size={14} />
              </div>
            </button>
          );
        })}
      </div>

      {/* Analysis History */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-100">Analiz Tarixçəsi</h2>
          {history.length > 0 && (
            <span className="text-sm text-slate-500">{history.length} analiz</span>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 size={24} className="animate-spin text-violet-500" />
          </div>
        ) : history.length === 0 ? (
          <div className="card p-8 text-center">
            <Clock size={32} className="mx-auto text-slate-700" />
            <p className="mt-3 text-sm text-slate-500">Hələ analiz yoxdur. İlk analizə başlayın.</p>
            <button onClick={() => onNavigate('analysis')} className="btn-primary mt-4">
              <FileSearch size={16} /> Analizə başla
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {history.map((item) => (
              <div key={item.id} className="card flex items-center gap-4 p-4 animate-slide-in">
                <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${
                  item.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' :
                  item.status === 'failed' ? 'bg-red-500/10 text-red-400' :
                  'bg-violet-500/10 text-violet-400'
                }`}>
                  {item.status === 'completed' ? <CheckCircle2 size={18} /> :
                   item.status === 'failed' ? <AlertCircle size={18} /> :
                   <Loader2 size={18} className="animate-spin" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-slate-100">{item.document_title}</p>
                    <span className="badge bg-slate-800 text-slate-400 uppercase">{item.detected_language}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                    <span>{new Date(item.started_at).toLocaleString('az-AZ')}</span>
                    {item.status === 'completed' && (
                      <>
                        <span className="text-emerald-500">{item.compliant_count} uyğun</span>
                        <span className="text-amber-500">{item.partial_count} qismən</span>
                        <span className="text-red-500">{item.missing_count} yox</span>
                      </>
                    )}
                    {item.status !== 'completed' && (
                      <span className="text-violet-400">{ANALYSIS_STATUS_LABELS_AZ[item.status as keyof typeof ANALYSIS_STATUS_LABELS_AZ] || item.status}</span>
                    )}
                  </div>
                </div>
                {item.status === 'completed' && (
                  <div className="flex items-center gap-2">
                    <span className={`badge ${RISK_BADGE_CLASSES[item.risk_level]}`}>
                      Risk: {RISK_LABELS_AZ[item.risk_level]}
                    </span>
                    {onOpenAnalysis && (
                      <button
                        onClick={() => onOpenAnalysis({ analysisId: item.id, documentId: item.document_id, documentTitle: item.document_title })}
                        className="btn-secondary text-xs"
                      >
                        <FileText size={14} /> Aç
                      </button>
                    )}
                  </div>
                )}
                <button
                  onClick={() => handleDelete(item.id)}
                  disabled={deleting === item.id}
                  className="btn-ghost text-red-400 hover:text-red-300"
                >
                  {deleting === item.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* System Info */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card p-5">
          <div className="mb-3 flex items-center gap-2">
            <Cpu size={18} className="text-slate-500" />
            <h3 className="text-sm font-semibold text-slate-200">Lokal LLM Mühərriki</h3>
          </div>
          <p className="text-sm text-slate-400">
            Ollama üzərindən işləyir. Model: <code className="rounded bg-slate-800 px-1.5 py-0.5 text-xs text-violet-300">{settings.ollama_model}</code>
          </p>
          <p className="mt-2 text-xs text-slate-600">Çağırışlar yalnız localhost:11434 ünvanına</p>
        </div>
        <div className="card p-5">
          <div className="mb-3 flex items-center gap-2">
            <Database size={18} className="text-slate-500" />
            <h3 className="text-sm font-semibold text-slate-200">Vektor Bazası</h3>
          </div>
          <p className="text-sm text-slate-400">
            ChromaDB embedded rejimdə. Çoxdilli embedding daxili (avtomatik).
          </p>
        </div>
        <div className="card p-5">
          <div className="mb-3 flex items-center gap-2">
            <Lock size={18} className="text-slate-500" />
            <h3 className="text-sm font-semibold text-slate-200">Məxfilik</h3>
          </div>
          <p className="text-sm text-slate-400">
            Bütün sənədlər lokal diskdə. Heç bir xarici API çağırışı yoxdur.
          </p>
        </div>
      </div>
    </div>
  );
}
