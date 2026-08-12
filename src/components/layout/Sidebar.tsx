import {
  Shield, LayoutDashboard, FileSearch, FileText, FileStack,
  MessageSquare, BookOpen, Settings, Circle, Loader2,
} from 'lucide-react';
import type { PageId, ActiveAnalysis } from '@/App';
import type { AnalysisProgress } from '@/types';

interface SidebarProps {
  currentPage: PageId;
  onNavigate: (page: PageId) => void;
  health: { status: string; ollama: boolean; chroma: boolean };
  activeAnalysis: ActiveAnalysis | null;
  globalProgress: AnalysisProgress | null;
}

const NAV_ITEMS: { id: PageId; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard',       label: 'İdarəetmə paneli', icon: LayoutDashboard },
  { id: 'analysis',        label: 'Analiz',            icon: FileSearch },
  { id: 'report',          label: 'Hesabat',           icon: FileText },
  { id: 'document_builder', label: 'Sənəd Hazırlanması',  icon: FileStack },
  { id: 'chat',            label: 'Soruş',             icon: MessageSquare },
  { id: 'knowledge',       label: 'Bilik bazası',      icon: BookOpen },
  { id: 'settings',        label: 'Ayarlar',           icon: Settings },
];

const isRunning = (p: AnalysisProgress | null) =>
  p && p.status !== 'completed' && p.status !== 'failed';

export function Sidebar({ currentPage, onNavigate, health, activeAnalysis, globalProgress }: SidebarProps) {
  const running = isRunning(globalProgress);

  return (
    <aside className="flex w-64 flex-shrink-0 flex-col border-r border-slate-800 bg-slate-950">
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-600 text-white shadow-lg shadow-violet-900/50">
          <Shield size={22} strokeWidth={2} />
        </div>
        <div>
          <h1 className="text-sm font-bold text-slate-100">Reports Tool</h1>
          <p className="text-xs text-slate-500">Governance & Gap-Analiz</p>
        </div>
      </div>

      {/* Active analysis banner */}
      {running && activeAnalysis && (
        <div
          className="mx-3 mb-2 cursor-pointer rounded-lg border border-violet-500/30 bg-violet-600/10 p-3 hover:bg-violet-600/15 transition-colors"
          onClick={() => onNavigate('analysis')}
        >
          <div className="flex items-center gap-2">
            <Loader2 size={14} className="animate-spin text-violet-400 flex-shrink-0" />
            <span className="truncate text-xs font-medium text-violet-300">
              {activeAnalysis.documentTitle}
            </span>
          </div>
          {globalProgress && (
            <>
              <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-violet-500 transition-all duration-500"
                  style={{ width: `${globalProgress.progress}%` }}
                />
              </div>
              <p className="mt-1 truncate text-[10px] text-slate-500">{globalProgress.message}</p>
            </>
          )}
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-2">
        {NAV_ITEMS.map((item) => {
          const Icon  = item.icon;
          const active = currentPage === item.id;
          const showBadge =
            running && (item.id === 'analysis' || item.id === 'report');

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                active
                  ? 'bg-violet-600/15 text-violet-300 border border-violet-600/30'
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-100'
              }`}
            >
              <Icon size={18} strokeWidth={2} />
              {item.label}
              {showBadge && (
                <span className="ml-auto flex h-2 w-2 rounded-full bg-violet-500 animate-pulse" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Health status footer */}
      <div className="border-t border-slate-800 px-4 py-4">
        <div className="space-y-2">
          {[
            { label: 'Ollama',    ok: health.ollama },
            { label: 'ChromaDB', ok: health.chroma },
            { label: 'Backend',  ok: health.status === 'ok' },
          ].map(({ label, ok }) => (
            <div key={label} className="flex items-center justify-between text-xs">
              <span className="text-slate-500">{label}</span>
              <div className="flex items-center gap-1.5">
                <Circle
                  size={8}
                  fill={ok ? 'currentColor' : 'none'}
                  className={ok ? 'text-emerald-500' : 'text-slate-600'}
                />
                <span className={ok ? 'text-emerald-400' : 'text-slate-500'}>
                  {label === 'Backend' && health.status === 'checking'
                    ? 'Yoxlanılır...'
                    : ok ? 'Aktiv' : 'Deaktiv'}
                </span>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[10px] leading-relaxed text-slate-600">
          Bütün məlumatlar lokal işləyir.
        </p>
      </div>
    </aside>
  );
}
