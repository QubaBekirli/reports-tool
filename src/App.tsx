import { useState, useEffect, useCallback, useRef } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { DashboardPage } from '@/pages/DashboardPage';
import { AnalysisPage } from '@/pages/AnalysisPage';
import { ReportPage } from '@/pages/ReportPage';
import { ChatPage } from '@/pages/ChatPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { KnowledgeBasePage } from '@/pages/KnowledgeBasePage';
import { DocumentBuilderPage } from '@/pages/DocumentBuilderPage';
import { ReportTemplatePage } from '@/pages/ReportTemplatePage';
import { api, loadSettingsLocal } from '@/services/api';
import type { AppSettings, AnalysisProgress } from '@/types';
import { DEFAULT_SETTINGS } from '@/types';

export type PageId =
  | 'dashboard'
  | 'analysis'
  | 'report'
  | 'report_template'
  | 'document_builder'
  | 'chat'
  | 'knowledge'
  | 'settings';

export interface ActiveAnalysis {
  analysisId: string;
  documentId: string;
  documentTitle: string;
}

export default function App() {
  const [page, setPage] = useState<PageId>('dashboard');
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [health, setHealth] = useState<{ status: string; ollama: boolean; chroma: boolean }>({
    status: 'checking',
    ollama: false,
    chroma: false,
  });
  const [activeAnalysis, setActiveAnalysis] = useState<ActiveAnalysis | null>(null);
  // Global progress — survives page navigation
  const [globalProgress, setGlobalProgress] = useState<AnalysisProgress | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const trackingIdRef = useRef<string | null>(null);

  useEffect(() => {
    setSettings(loadSettingsLocal());
    api.getSettings().then(setSettings).catch(() => {});
    const checkHealth = () => {
      api.healthCheck().then(setHealth).catch(() => {
        setHealth({ status: 'offline', ollama: false, chroma: false });
      });
    };
    checkHealth();
    const interval = setInterval(checkHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  // Global analysis polling — persists through navigation
  const startPolling = useCallback((analysisId: string) => {
    if (trackingIdRef.current === analysisId) return;
    if (pollRef.current) clearInterval(pollRef.current);
    trackingIdRef.current = analysisId;
    setGlobalProgress(null);

    const poll = async () => {
      try {
        const p = await api.getAnalysisStatus(analysisId);
        setGlobalProgress(p);
        if (p.status === 'completed' || p.status === 'failed') {
          if (pollRef.current) clearInterval(pollRef.current);
          pollRef.current = null;
          trackingIdRef.current = null;
        }
      } catch {
        // keep polling silently
      }
    };

    poll();
    pollRef.current = setInterval(poll, 2500);
  }, []);

  const stopPolling = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = null;
    trackingIdRef.current = null;
    setGlobalProgress(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const navigateToAnalysis = useCallback((analysis: ActiveAnalysis) => {
    setActiveAnalysis(analysis);
    setPage('analysis');
    startPolling(analysis.analysisId);
  }, [startPolling]);

  const navigateToReport = useCallback((analysis: ActiveAnalysis) => {
    setActiveAnalysis(analysis);
    setPage('report');
    startPolling(analysis.analysisId);
  }, [startPolling]);

  const onAnalysisStarted = useCallback((analysis: ActiveAnalysis) => {
    setActiveAnalysis(analysis);
    startPolling(analysis.analysisId);
  }, [startPolling]);

  const saveSettings = useCallback((s: AppSettings) => {
    setSettings(s);
    api.saveSettings(s).catch(() => {});
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950">
      <Sidebar
        currentPage={page}
        onNavigate={setPage}
        health={health}
        activeAnalysis={activeAnalysis}
        globalProgress={globalProgress}
      />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-6 py-8 lg:px-8">
          {page === 'dashboard' && (
            <DashboardPage
              onNavigate={setPage}
              health={health}
              settings={settings}
              onOpenAnalysis={navigateToReport}
            />
          )}
          {page === 'analysis' && (
            <AnalysisPage
              activeAnalysis={activeAnalysis}
              globalProgress={globalProgress}
              onAnalysisStarted={onAnalysisStarted}
              onNavigateReport={navigateToReport}
              onStopPolling={stopPolling}
            />
          )}
          {page === 'report' && (
            <ReportPage
              activeAnalysis={activeAnalysis}
              globalProgress={globalProgress}
              onNavigateAnalysis={navigateToAnalysis}
              onNavigateUpload={() => setPage('analysis')}
              onNavigateTemplate={() => setPage('report_template')}
            />
          )}
          {page === 'document_builder' && <DocumentBuilderPage />}
          {page === 'report_template' && <ReportTemplatePage />}
          {page === 'chat' && <ChatPage settings={settings} />}
          {page === 'knowledge' && <KnowledgeBasePage />}
          {page === 'settings' && <SettingsPage settings={settings} onSave={saveSettings} />}
        </div>
      </main>
    </div>
  );
}
