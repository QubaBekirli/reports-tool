import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send, MessageSquare, Loader2, Trash2, BookOpen,
  Sparkles, ShieldCheck, Lightbulb, AlertCircle,
  Bot, User, Clock, FileSearch, FileText, X, ChevronDown,
} from 'lucide-react';
import { api } from '@/services/api';
import type { ChatMessage, ChatResponse, AppSettings, UploadedDocument } from '@/types';

interface ChatPageProps {
  settings: AppSettings;
}

const STORAGE_KEY = 'lokalo-chat-history';

const SUGGESTED_PROMPTS = [
  { icon: ShieldCheck, text: 'OWASP LLM Top 10 hansı təhlükələri əhatə edir?' },
  { icon: BookOpen,    text: 'ISO/IEC 42001-in əsas tələbləri nələrdir?' },
  { icon: ShieldCheck, text: 'NIST AI RMF-ə görə risk qiymətləndirilməsi necə aparılır?' },
  { icon: BookOpen,    text: 'ISO 27001 A.8.32 tələbləri nədir?' },
  { icon: Lightbulb,  text: 'DORA tənzimləməsi banklar üçün hansı öhdəliklər yaradır?' },
  { icon: ShieldCheck, text: 'CBAR informasiya təhlükəsizliyi tələbləri hansılardır?' },
  { icon: BookOpen,    text: 'Azərbaycanda fərdi məlumatların qorunması qaydaları?' },
  { icon: Lightbulb,  text: 'PCI DSS v4.0-ın əsas yenilikləri nələrdir?' },
];

const SYSTEM_INTRO = `Salam! Mən lokal AI təhlükəsizlik assistentiyəm.

Bilik bazamda IT Audit, IT Risk, GRC, Mərkəzi Bank qaydaları, AI və Data Təhlükəsizliyi sahələrindən 365+ nəzarət maddəsi var.

Sizə kömək edə bilərəm:
• Standart və qaydalar haqqında suallar
• Yüklənmiş sənədləri axtarmaq və xülasə çıxarmaq
• Gap-analiz nəticələrini izah etmək
• Audit və uyğunluq yönərləndirməsi

Sualınızı yazın və ya aşağıdakı tövsiyə olunan suallardan birini seçin.`;

function loadHistory(): ChatMessage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return [];
}

function saveHistory(messages: ChatMessage[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-50)));
  } catch { /* ignore */ }
}

export function ChatPage({ settings }: ChatPageProps) {
  void settings;

  const [messages, setMessages]       = useState<ChatMessage[]>([]);
  const [input, setInput]             = useState('');
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [sourcesMap, setSourcesMap]   = useState<Record<number, ChatResponse['sources']>>({});
  const [documents, setDocuments]     = useState<UploadedDocument[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [showDocPanel, setShowDocPanel] = useState(false);
  const [summarizing, setSummarizing] = useState<string | null>(null);
  const endRef   = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = loadHistory();
    setMessages(saved.length > 0 ? saved : [{
      role:      'assistant',
      content:   SYSTEM_INTRO,
      timestamp: new Date().toISOString(),
    }]);
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const loadDocuments = useCallback(async () => {
    setDocsLoading(true);
    try {
      const docs = await api.getDocuments();
      setDocuments(docs);
    } catch { setDocuments([]); } finally {
      setDocsLoading(false);
    }
  }, []);

  const toggleDocPanel = useCallback(() => {
    const next = !showDocPanel;
    setShowDocPanel(next);
    if (next && documents.length === 0) loadDocuments();
  }, [showDocPanel, documents.length, loadDocuments]);

  const send = useCallback(async (queryText?: string) => {
    const text = (queryText || input).trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = { role: 'user', content: text, timestamp: new Date().toISOString() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);
    setError(null);

    const historyPayload = newMessages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .slice(-10)
      .map((m) => ({ role: m.role, content: m.content }));

    try {
      const res: ChatResponse = await api.chat(text, 'az', historyPayload);
      const assistantMsg: ChatMessage = {
        role:      'assistant',
        content:   res.answer,
        timestamp: new Date().toISOString(),
      };
      const updated = [...newMessages, assistantMsg];
      setMessages(updated);
      saveHistory(updated);
      if (res.sources?.length > 0) {
        setSourcesMap((prev) => ({ ...prev, [updated.length - 1]: res.sources }));
      }
    } catch (e) {
      const errText = e instanceof Error ? e.message : 'Cavab alına bilmədi';
      setError(errText);
      const errorMsg: ChatMessage = {
        role:    'assistant',
        content: `Üzr istəyirəm, cavab hazırlana bilmədi.\n\nXəta: ${errText}`,
        timestamp: new Date().toISOString(),
      };
      const updated = [...newMessages, errorMsg];
      setMessages(updated);
      saveHistory(updated);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }, [input, loading, messages]);

  const summarizeDocument = useCallback(async (doc: UploadedDocument) => {
    if (!doc.extracted_text) return;
    setSummarizing(doc.id);
    setShowDocPanel(false);
    const query = `"${doc.title}" sənədinin əsas məzmununu, əhatə etdiyi mövzuları və əsas tələblərini xülasə et.`;
    await send(query);
    setSummarizing(null);
  }, [send]);

  const searchInDocument = useCallback(async (doc: UploadedDocument) => {
    setShowDocPanel(false);
    setInput(`"${doc.title}" sənədini araşdır: `);
    inputRef.current?.focus();
  }, []);

  const clearChat = useCallback(() => {
    const initial: ChatMessage = {
      role:      'assistant',
      content:   SYSTEM_INTRO,
      timestamp: new Date().toISOString(),
    };
    setMessages([initial]);
    setSourcesMap({});
    saveHistory([]);
    inputRef.current?.focus();
  }, []);

  const hasRealMessages = messages.some((m) => m.role === 'user');

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col animate-fade-in">
      {/* Header */}
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-100">
            <Sparkles size={22} className="text-violet-400" />
            Soruş
          </h1>
          <p className="mt-1 text-slate-400">
            Bilik bazası üzərindən AI söhbət · sənəd axtarış və xülasə
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleDocPanel}
            className={`btn-secondary text-xs ${showDocPanel ? 'bg-violet-600/20 text-violet-300 border-violet-500/40' : ''}`}
          >
            <FileSearch size={14} /> Sənədlər
          </button>
          {hasRealMessages && (
            <button onClick={clearChat} className="btn-ghost text-red-400 hover:text-red-300 text-xs">
              <Trash2 size={14} /> Təmizlə
            </button>
          )}
        </div>
      </div>

      {/* Document panel */}
      {showDocPanel && (
        <div className="mb-4 card p-4 animate-slide-in">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <FileText size={16} className="text-violet-400" /> Yüklənmiş Sənədlər
            </p>
            <button onClick={() => setShowDocPanel(false)} className="btn-ghost">
              <X size={16} />
            </button>
          </div>
          {docsLoading ? (
            <div className="flex items-center gap-2 py-4 text-sm text-slate-500">
              <Loader2 size={16} className="animate-spin" /> Yüklənir...
            </div>
          ) : documents.length === 0 ? (
            <p className="text-sm text-slate-500 py-3">
              Hələ heç bir sənəd yüklənməyib. Analiz səhifəsindən sənəd yükləyin.
            </p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center gap-3 rounded-lg bg-slate-800/40 p-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-slate-200">{doc.title}</p>
                    <p className="text-xs text-slate-500 uppercase">{doc.format} · {doc.detected_language}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => searchInDocument(doc)}
                      className="btn-ghost text-xs"
                      title="Bu sənəddə axtar"
                    >
                      <FileSearch size={14} /> Axtar
                    </button>
                    {doc.extracted_text && (
                      <button
                        onClick={() => summarizeDocument(doc)}
                        disabled={summarizing === doc.id || loading}
                        className="btn-secondary text-xs"
                        title="Xülasə çıxar"
                      >
                        {summarizing === doc.id
                          ? <Loader2 size={14} className="animate-spin" />
                          : <Sparkles size={14} />}
                        Xülasə
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Messages area */}
      <div className="card flex-1 overflow-y-auto p-4 sm:p-6">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-violet-600/10 text-violet-400">
              <MessageSquare size={28} />
            </div>
            <p className="mt-4 text-sm text-slate-400">Bilik bazasına sual verin</p>
          </div>
        ) : (
          <div className="space-y-5">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-violet-600/10 text-violet-400">
                    <Bot size={18} />
                  </div>
                )}
                <div className={`max-w-[80%] ${msg.role === 'assistant' ? 'flex flex-col gap-1.5' : ''}`}>
                  <div className={`rounded-2xl px-4 py-3 text-sm ${
                    msg.role === 'user'
                      ? 'bg-violet-600 text-white rounded-tr-sm'
                      : 'bg-slate-800 text-slate-200 rounded-tl-sm'
                  }`}>
                    <p className="whitespace-pre-line leading-relaxed">{msg.content}</p>
                  </div>

                  {msg.role === 'assistant' && sourcesMap[idx]?.length > 0 && (
                    <div className="rounded-lg border border-slate-700/60 bg-slate-900/50 p-3">
                      <div className="mb-2 flex items-center gap-1.5 text-[11px] text-slate-500">
                        <BookOpen size={11} />
                        <span>Mənbələr ({sourcesMap[idx].length})</span>
                      </div>
                      <div className="space-y-1.5">
                        {sourcesMap[idx].map((src, sIdx) => (
                          <div key={sIdx} className="rounded-md bg-slate-800/50 p-2 text-xs">
                            <p className="font-medium text-violet-300">{src.source}</p>
                            <p className="mt-0.5 text-slate-500 line-clamp-2">{src.snippet}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className={`flex items-center gap-1 text-[10px] text-slate-600 ${
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}>
                    <Clock size={10} />
                    {new Date(msg.timestamp).toLocaleTimeString('az-AZ')}
                  </div>
                </div>

                {msg.role === 'user' && (
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-slate-700 text-slate-300">
                    <User size={18} />
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex gap-3 justify-start">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-violet-600/10 text-violet-400">
                  <Bot size={18} />
                </div>
                <div className="flex items-center gap-2 rounded-2xl bg-slate-800 px-4 py-3 rounded-tl-sm">
                  <Loader2 size={16} className="animate-spin text-violet-500" />
                  <span className="text-sm text-slate-500">Cavab hazırlanır...</span>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>
        )}
      </div>

      {error && (
        <div className="mt-2 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
          <AlertCircle size={14} />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)}><X size={12} /></button>
        </div>
      )}

      {/* Suggested questions — collapsible, compact */}
      <details className="group mt-3">
        <summary className="flex cursor-pointer items-center gap-1.5 text-xs font-medium text-slate-500 list-none">
          <Lightbulb size={13} className="text-violet-400" />
          <span>Tövsiyə olunan suallar</span>
          <ChevronDown size={12} className="ml-1 transition-transform group-open:rotate-180" />
        </summary>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {SUGGESTED_PROMPTS.map((p) => {
            const Icon = p.icon;
            return (
              <button
                key={p.text}
                onClick={() => send(p.text)}
                disabled={loading}
                className="flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-800/40 px-3 py-1.5 text-xs text-slate-300 transition-all hover:border-violet-500/50 hover:bg-violet-600/10 hover:text-violet-300 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Icon size={11} className="flex-shrink-0" />
                {p.text.length > 42 ? p.text.slice(0, 42) + '…' : p.text}
              </button>
            );
          })}
        </div>
      </details>

      {/* Input bar */}
      <div className="mt-3 flex gap-2">
        <input
          ref={inputRef}
          className="input"
          placeholder="Sualınızı yazın..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
          disabled={loading}
        />
        <button
          onClick={() => send()}
          disabled={loading || !input.trim()}
          className="btn-primary flex-shrink-0"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </div>
    </div>
  );
}
