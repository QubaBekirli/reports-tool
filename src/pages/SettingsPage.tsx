import { useState, useEffect, useCallback } from 'react';
import {
  Save, Loader2, Check, RefreshCw, Cpu, Database, Trash2,
  Settings as SettingsIcon, AlertCircle,
  Terminal, Package, Server, CheckCircle2, ChevronDown, ChevronUp,
  Copy, BookOpen, Cloud, HardDrive, Key, ExternalLink,
} from 'lucide-react';
import { api } from '@/services/api';
import type { AppSettings, LLMProvider } from '@/types';
import { DEFAULT_SETTINGS, FREE_OLLAMA_MODELS, FREE_OPENROUTER_MODELS } from '@/types';

interface SettingsPageProps {
  settings: AppSettings;
  onSave: (s: AppSettings) => void;
}

export function SettingsPage({ settings, onSave }: SettingsPageProps) {
  const [local, setLocal] = useState<AppSettings>(settings);
  const [installedModels, setInstalledModels] = useState<string[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [customModel, setCustomModel] = useState('');
  const [providerInfo, setProviderInfo] = useState<{
    ollama_ok: boolean;
    openrouter_ok: boolean;
    openrouter_models: { name: string; size: string }[];
  } | null>(null);
  const [loadingProvider, setLoadingProvider] = useState(false);

  const loadModels = useCallback(async () => {
    setLoadingModels(true);
    try {
      const m = await api.getOllamaModels();
      setInstalledModels(m.map((model) => model.name));
    } catch {
      setInstalledModels([]);
    } finally {
      setLoadingModels(false);
    }
  }, []);

  const loadProviderInfo = useCallback(async () => {
    setLoadingProvider(true);
    try {
      const info = await api.getProviderInfo();
      setProviderInfo({
        ollama_ok: info.ollama_ok,
        openrouter_ok: info.openrouter_ok,
        openrouter_models: info.openrouter_models,
      });
    } catch {
      setProviderInfo(null);
    } finally {
      setLoadingProvider(false);
    }
  }, []);

  useEffect(() => {
    setLocal(settings);
    loadModels();
    loadProviderInfo();
  }, [settings, loadModels, loadProviderInfo]);

  const save = useCallback(() => {
    setSaving(true);
    onSave(local);
    setTimeout(() => {
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }, 300);
  }, [local, onSave]);

  const reset = useCallback(() => {
    setLocal({ ...DEFAULT_SETTINGS });
  }, []);

  const isModelInstalled = (name: string) => installedModels.includes(name);

  const addCustomModel = useCallback(() => {
    if (!customModel.trim()) return;
    if (local.llm_provider === 'openrouter') {
      setLocal({ ...local, openrouter_model: customModel.trim() });
    } else {
      setLocal({ ...local, ollama_model: customModel.trim() });
    }
    setCustomModel('');
  }, [customModel, local]);

  const currentModel = local.llm_provider === 'openrouter' ? local.openrouter_model : local.ollama_model;
  const providerConnected = local.llm_provider === 'openrouter'
    ? providerInfo?.openrouter_ok
    : providerInfo?.ollama_ok;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Ayarlar</h1>
        <p className="mt-1 text-slate-400">
          Sistem konfiqurasiyası. Modeli özünüz seçə bilərsiniz. Bütün dəyişikliklər lokal saxlanılır.
        </p>
      </div>

      {/* Setup Guide */}
      <SetupGuide />

      {/* LLM Provider Selection */}
      <div className="card p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu size={18} className="text-violet-400" />
            <h2 className="text-base font-semibold text-slate-100">AI Mühərriki</h2>
          </div>
          <button onClick={loadProviderInfo} disabled={loadingProvider} className="btn-ghost">
            {loadingProvider ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            Statusu yoxla
          </button>
        </div>

        {/* Provider Toggle */}
        <div className="mb-6">
          <label className="label">Mühərrik növü</label>
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              onClick={() => setLocal({ ...local, llm_provider: 'ollama' as LLMProvider })}
              className={`flex items-center gap-3 rounded-lg border p-4 text-left transition-all ${
                local.llm_provider === 'ollama'
                  ? 'border-violet-500 bg-violet-600/10'
                  : 'border-slate-700 bg-slate-800/30 hover:border-slate-600'
              }`}
            >
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                local.llm_provider === 'ollama' ? 'bg-violet-600/20 text-violet-300' : 'bg-slate-700/50 text-slate-400'
              }`}>
                <HardDrive size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-200">Ollama (Lokal)</p>
                <p className="text-xs text-slate-500">Yerli kompyuterinizdə, öz modelinizlə</p>
              </div>
              {providerInfo && (
                <span className={`badge text-[10px] ${
                  providerInfo.ollama_ok
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : 'bg-red-500/10 text-red-400'
                }`}>
                  {providerInfo.ollama_ok ? 'Aktiv' : 'Passiv'}
                </span>
              )}
            </button>

            <button
              onClick={() => setLocal({ ...local, llm_provider: 'openrouter' as LLMProvider })}
              className={`flex items-center gap-3 rounded-lg border p-4 text-left transition-all ${
                local.llm_provider === 'openrouter'
                  ? 'border-violet-500 bg-violet-600/10'
                  : 'border-slate-700 bg-slate-800/30 hover:border-slate-600'
              }`}
            >
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                local.llm_provider === 'openrouter' ? 'bg-violet-600/20 text-violet-300' : 'bg-slate-700/50 text-slate-400'
              }`}>
                <Cloud size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-200">OpenRouter (Bulud)</p>
                <p className="text-xs text-slate-500">Quraşdırma tələb olunmur, pulsuz modellər</p>
              </div>
              {providerInfo && (
                <span className={`badge text-[10px] ${
                  providerInfo.openrouter_ok
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : 'bg-red-500/10 text-red-400'
                }`}>
                  {providerInfo.openrouter_ok ? 'Aktiv' : 'Passiv'}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Ollama Configuration */}
        {local.llm_provider === 'ollama' && (
          <div className="space-y-4 rounded-lg border border-slate-800 bg-slate-950/30 p-4">
            <div>
              <label className="label">Ollama URL</label>
              <input
                className="input"
                value={local.ollama_url}
                onChange={(e) => setLocal({ ...local, ollama_url: e.target.value })}
              />
              <p className="mt-1 text-xs text-slate-500">Default: http://localhost:11434</p>
            </div>

            <div>
              <div className="mb-3 flex items-center justify-between">
                <label className="label mb-0">Model seçin</label>
                <button onClick={loadModels} disabled={loadingModels} className="btn-ghost text-xs">
                  {loadingModels ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                  Modelləri yenilə
                </button>
              </div>
              <p className="mb-3 text-xs text-slate-500">
                Aşağıdakı modellər Ollama-dan <strong className="text-slate-300">pulsuzdur</strong>. Yükləmək üçün terminalda <code className="rounded bg-slate-800 px-1.5 py-0.5 text-violet-300">ollama pull &lt;model&gt;</code> çalışdırın.
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {FREE_OLLAMA_MODELS.map((m) => {
                  const installed = isModelInstalled(m.name);
                  const selected = local.ollama_model === m.name;
                  return (
                    <button
                      key={m.name}
                      onClick={() => setLocal({ ...local, ollama_model: m.name })}
                      className={`flex items-center justify-between rounded-lg border p-3 text-left transition-all ${
                        selected
                          ? 'border-violet-500 bg-violet-600/10'
                          : 'border-slate-700 bg-slate-800/30 hover:border-slate-600'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-slate-200">{m.label}</p>
                          {m.recommended && <span className="badge bg-violet-500/15 text-violet-400 text-[10px]">Tövsiyə</span>}
                        </div>
                        <p className="mt-0.5 truncate text-xs text-slate-500">{m.name} · {m.size}</p>
                      </div>
                      <div className="ml-2 flex-shrink-0">
                        {installed ? (
                          <span className="badge bg-emerald-500/10 text-emerald-400 text-[10px]">Yüklü</span>
                        ) : (
                          <span className="badge bg-slate-800 text-slate-500 text-[10px]">Yükləmək lazım</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-3">
                <label className="label">Öz modeliniz (əgər yuxarıdakı siyahıda yoxdursa)</label>
                <div className="flex gap-2">
                  <input
                    className="input"
                    placeholder="məs: mymodel:latest"
                    value={customModel}
                    onChange={(e) => setCustomModel(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addCustomModel()}
                  />
                  <button onClick={addCustomModel} className="btn-secondary">Əlavə et</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* OpenRouter Configuration */}
        {local.llm_provider === 'openrouter' && (
          <div className="space-y-4 rounded-lg border border-slate-800 bg-slate-950/30 p-4">
            <div>
              <label className="label flex items-center gap-2">
                <Key size={14} className="text-violet-400" />
                OpenRouter API Açarı
              </label>
              <input
                type="password"
                className="input"
                placeholder="sk-or-v1-..."
                value={local.openrouter_api_key}
                onChange={(e) => setLocal({ ...local, openrouter_api_key: e.target.value })}
              />
              <p className="mt-2 flex items-center gap-1 text-xs text-slate-500">
                Pulsuz açar almaq üçün
                <a
                  href="https://openrouter.ai/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-violet-400 hover:text-violet-300"
                >
                  openrouter.ai/keys
                  <ExternalLink size={12} />
                </a>
                səhifəsinə keçin. Quraşdırma tələb olunmur.
              </p>
            </div>

            <div>
              <label className="label">Pulsuz model seçin</label>
              <p className="mb-3 text-xs text-slate-500">
                OpenRouter-də bir çox model <strong className="text-slate-300">pulsuzdur</strong> (:free suffixi ilə).
                API açarı daxil etdikdən sonra "Statusu yoxla" düyməsi ilə mövcud modelləri görə bilərsiniz.
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {FREE_OPENROUTER_MODELS.map((m) => {
                  const selected = local.openrouter_model === m.name;
                  return (
                    <button
                      key={m.name}
                      onClick={() => setLocal({ ...local, openrouter_model: m.name })}
                      className={`flex items-center justify-between rounded-lg border p-3 text-left transition-all ${
                        selected
                          ? 'border-violet-500 bg-violet-600/10'
                          : 'border-slate-700 bg-slate-800/30 hover:border-slate-600'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-slate-200">{m.label}</p>
                          {m.recommended && <span className="badge bg-violet-500/15 text-violet-400 text-[10px]">Tövsiyə</span>}
                        </div>
                        <p className="mt-0.5 truncate text-xs text-slate-500">{m.name}</p>
                      </div>
                      <span className="badge bg-emerald-500/10 text-emerald-400 text-[10px]">Pulsuz</span>
                    </button>
                  );
                })}
              </div>

              {providerInfo && providerInfo.openrouter_models.length > 0 && (
                <div className="mt-3">
                  <p className="mb-2 text-xs text-slate-500">Mövcud pulsuz modellər (OpenRouter-dən):</p>
                  <div className="flex flex-wrap gap-2">
                    {providerInfo.openrouter_models.map((m) => (
                      <button
                        key={m.name}
                        onClick={() => setLocal({ ...local, openrouter_model: m.name })}
                        className={`rounded-md border px-2.5 py-1.5 text-xs transition-all ${
                          local.openrouter_model === m.name
                            ? 'border-violet-500 bg-violet-600/10 text-violet-300'
                            : 'border-slate-700 bg-slate-800/30 text-slate-400 hover:border-slate-600'
                        }`}
                      >
                        {m.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-3">
                <label className="label">Öz modeliniz</label>
                <div className="flex gap-2">
                  <input
                    className="input"
                    placeholder="məs: mistralai/mistral-7b-instruct:free"
                    value={customModel}
                    onChange={(e) => setCustomModel(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addCustomModel()}
                  />
                  <button onClick={addCustomModel} className="btn-secondary">Əlavə et</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Current Selection */}
        <div className="mt-3 rounded-lg border border-slate-800 bg-slate-950/50 p-3">
          <p className="text-xs text-slate-500">
            Hazırda seçilmiş: <span className="text-slate-400">{local.llm_provider === 'openrouter' ? 'OpenRouter (Bulud)' : 'Ollama (Lokal)'}</span>
          </p>
          <p className="mt-1 text-sm font-medium text-violet-300">{currentModel}</p>
          {providerConnected === false && (
            <p className="mt-2 flex items-center gap-1 text-xs text-amber-400">
              <AlertCircle size={12} />
              {local.llm_provider === 'openrouter'
                ? 'OpenRouter bağlantısı yoxdur — API açarını yoxlayın'
                : 'Ollama işləmir — quraşdırdığınızdan əmin olun'}
            </p>
          )}
        </div>
      </div>

      {/* Embedding Info */}
      <div className="card p-6">
        <div className="mb-4 flex items-center gap-2">
          <Database size={18} className="text-violet-400" />
          <h2 className="text-base font-semibold text-slate-100">Vektor Bazası & Embedding</h2>
        </div>
        <div className="rounded-lg border border-violet-500/20 bg-violet-500/5 p-4">
          <div className="flex items-start gap-3">
            <Check size={18} className="mt-0.5 flex-shrink-0 text-emerald-400" />
            <div>
              <p className="text-sm font-medium text-slate-200">Daxili embedding mühərriki (avtomatik)</p>
              <p className="mt-1 text-sm text-slate-400">
                Embedding üçün ayrıca model endirməyə ehtiyac yoxdur. Sistem daxili
                çoxdilli embedding modeli istifadə edir (50+ dil, o cümlədən Azərbaycan və İngilis).
                İlk işə düşəndə avtomatik hazırlanır və lokal diskdə saxlanır.
              </p>
              <p className="mt-2 text-xs text-slate-500">
                Model: paraphrase-multilingual-MiniLM-L12-v2 (~120MB, HuggingFace-dən bir dəfəlik endirilir)
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <label className="label">Top-K (sorğu nəticəsi)</label>
            <input
              type="number"
              className="input"
              value={local.top_k}
              onChange={(e) => setLocal({ ...local, top_k: parseInt(e.target.value) || 8 })}
            />
          </div>
          <div>
            <label className="label">Chunk Ölçüsü (token)</label>
            <input
              type="number"
              className="input"
              value={local.chunk_size}
              onChange={(e) => setLocal({ ...local, chunk_size: parseInt(e.target.value) || 512 })}
            />
          </div>
          <div>
            <label className="label">Chunk Örtüşməsi (token)</label>
            <input
              type="number"
              className="input"
              value={local.chunk_overlap}
              onChange={(e) => setLocal({ ...local, chunk_overlap: parseInt(e.target.value) || 64 })}
            />
          </div>
        </div>
      </div>

      {/* Security */}
      <div className="card p-6">
        <div className="mb-4 flex items-center gap-2">
          <Trash2 size={18} className="text-violet-400" />
          <h2 className="text-base font-semibold text-slate-100">Təhlükəsizlik & Təmizlik</h2>
        </div>
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-violet-600 focus:ring-violet-500"
            checked={local.cleanup_temp_files}
            onChange={(e) => setLocal({ ...local, cleanup_temp_files: e.target.checked })}
          />
          <div>
            <p className="text-sm font-medium text-slate-200">Analiz bitdikdən sonra müvəqqəti faylları təmizlə</p>
            <p className="text-xs text-slate-500">Yüklənmiş sənədlərin müvəqqəti nüsxələri avtomatik silinir</p>
          </div>
        </label>
      </div>

      {local.llm_provider === 'ollama' && installedModels.length === 0 && !loadingModels && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3">
          <AlertCircle size={18} className="mt-0.5 flex-shrink-0 text-amber-400" />
          <div className="text-sm text-amber-300">
            Ollama-da heç bir model tapılmadı. Əvvəlcə bir model yükləyin: <code className="rounded bg-slate-800 px-1.5 py-0.5 text-xs">ollama pull llama3.1:8b-instruct-q4_K_M</code>
          </div>
        </div>
      )}

      {local.llm_provider === 'openrouter' && !local.openrouter_api_key && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3">
          <AlertCircle size={18} className="mt-0.5 flex-shrink-0 text-amber-400" />
          <div className="text-sm text-amber-300">
            OpenRouter API açarı daxil edilməyib. Pulsuz açar üçün <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="underline">openrouter.ai/keys</a> səhifəsinə keçin.
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button onClick={save} disabled={saving} className="btn-primary">
          {saving ? <Loader2 size={16} className="animate-spin" /> : saved ? <Check size={16} /> : <Save size={16} />}
          {saving ? 'Saxlanılır...' : saved ? 'Saxlanıldı' : 'Saxla'}
        </button>
        <button onClick={reset} className="btn-secondary">
          <SettingsIcon size={16} /> Default ayarlara qayıt
        </button>
      </div>
    </div>
  );
}

function SetupGuide() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const copy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const steps = [
    {
      icon: Cloud,
      title: '1. OpenRouter (pulsuz, quraşdırma yoxdur)',
      desc: 'OpenRouter-dən pulsuz API açarı alın və Ayarlar səhifəsində daxil edin. Heç bir proqram quraşdırmaq lazım deyil.',
      cmds: [
        { label: 'API açarı', cmd: 'https://openrouter.ai/keys' },
      ],
    },
    {
      icon: Package,
      title: '2. Ollama (lokal, alternativ)',
      desc: 'Lokal LLM mühərriki üçün Ollama-nı endirin və quraşdırın.',
      cmds: [
        { label: 'Mac/Linux', cmd: 'curl -fsSL https://ollama.com/install.sh | sh' },
        { label: 'Windows', cmd: 'https://ollama.com/download adresinden indirin' },
      ],
    },
    {
      icon: Cpu,
      title: '3. AI modeli yükləyin (yalnız Ollama üçün)',
      desc: 'Tövsiyə olunan model — Llama 3.1 8B (Q4). Daha kiçik model üçün Llama 3.2 3B seçə bilərsiniz.',
      cmds: [
        { label: 'Tövsiyə olunan', cmd: 'ollama pull llama3.1:8b-instruct-q4_K_M' },
        { label: 'Kiçik (sürətli)', cmd: 'ollama pull llama3.2:3b-instruct-q4_K_M' },
      ],
    },
    {
      icon: Terminal,
      title: '4. Python backend-i işə salın',
      desc: 'Backend qovluğuna keçin, asılılıqları quraşdırın və server-i başladın.',
      cmds: [
        { label: 'Asılılıqlar', cmd: 'cd backend && pip install -r requirements.txt' },
        { label: 'İndeksleme', cmd: 'python scripts/index_corpus.py' },
        { label: 'Server', cmd: 'uvicorn app.main:app --reload --port 8000' },
      ],
    },
    {
      icon: Server,
      title: '5. Əlaqəni yoxlayın',
      desc: 'Sol paneldəki status göstəricilərində seçilmiş mühərrikin "Aktiv" olduğunu təsdiqləyin.',
      cmds: [],
    },
  ];

  return (
    <div className="card overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between p-5 hover:bg-slate-800/30"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-600/10 text-violet-400">
            <BookOpen size={20} />
          </div>
          <div className="text-left">
            <h2 className="text-base font-semibold text-slate-100">Qurulum Bələdçisi</h2>
            <p className="text-sm text-slate-500">Backend, AI mühərriki və bilik bazasını quraşdırmaq üçün addım-addım təlimat</p>
          </div>
        </div>
        {open ? <ChevronUp size={20} className="text-slate-500" /> : <ChevronDown size={20} className="text-slate-500" />}
      </button>

      {open && (
        <div className="space-y-5 border-t border-slate-800 p-5">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div key={step.title} className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-violet-600/10 text-violet-400">
                    <Icon size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-slate-100">{step.title}</h3>
                    <p className="mt-1 text-sm text-slate-500">{step.desc}</p>
                    {step.cmds.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {step.cmds.map((c) => (
                          <div key={c.cmd} className="group relative">
                            <div className="flex items-center gap-2">
                              <span className="badge bg-slate-800 text-slate-400 text-[10px]">{c.label}</span>
                              <code className="flex-1 truncate rounded-md bg-slate-950 px-3 py-2 text-xs text-violet-300">
                                {c.cmd}
                              </code>
                              <button
                                onClick={() => copy(c.cmd, c.cmd)}
                                className="btn-ghost p-1.5"
                                title="Kopyala"
                              >
                                {copied === c.cmd ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          <div className="flex items-start gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
            <CheckCircle2 size={18} className="mt-0.5 flex-shrink-0 text-emerald-400" />
            <div className="text-sm text-emerald-300">
              <strong>Hazırdır!</strong> Bütün komponentlər aktiv olduqdan sonra sənəd yükləyib analiz edə, hesabat endirə və bilik bazasına sual verə bilərsiniz.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
