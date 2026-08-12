import { useState, useEffect, useCallback, useRef } from 'react';
import {
  BookOpen, Loader2, Search, UploadCloud, FileText, Trash2,
  Eye, Edit3, X, Save, AlertCircle, Files, ChevronDown,
  ChevronUp, Filter, PlusCircle, Download, Clock,
} from 'lucide-react';
import { api } from '@/services/api';
import type { KBDocument } from '@/types';

interface CorpusControl {
  id: string;
  source: string;
  category: string;
  requirement_text: string;
  language: string;
}

interface CorpusStats {
  total_controls: number;
  by_category: Record<string, number>;
  by_language: Record<string, number>;
}

type Tab = 'corpus' | 'documents';

const FORMAT_ICONS: Record<string, string> = {
  pdf: '📄', docx: '📝', pptx: '📊', xlsx: '📈',
  png: '🖼️', jpg: '🖼️', jpeg: '🖼️', txt: '📄',
};

const ACCEPTED = '.pdf,.docx,.pptx,.xlsx,.png,.jpg,.jpeg,.txt';

export function KnowledgeBasePage() {
  const [tab, setTab] = useState<Tab>('corpus');

  // Corpus state
  const [controls, setControls] = useState<CorpusControl[]>([]);
  const [stats, setStats] = useState<CorpusStats | null>(null);
  const [corpusLoading, setCorpusLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterSource, setFilterSource] = useState<string>('all');
  const [filterLang, setFilterLang] = useState<string>('all');

  // KB Documents state
  const [kbDocs, setKbDocs] = useState<KBDocument[]>([]);
  const [kbLoading, setKbLoading] = useState(false);
  const [kbError, setKbError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [uploadSource, setUploadSource] = useState('');
  const [viewingDoc, setViewingDoc] = useState<KBDocument | null>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [editingDoc, setEditingDoc] = useState<KBDocument | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editSource, setEditSource] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Related KB docs for corpus search
  const [relatedDocs, setRelatedDocs] = useState<KBDocument[]>([]);
  const [relatedQuery, setRelatedQuery] = useState('');
  const [expandedControl, setExpandedControl] = useState<string | null>(null);
  const [viewingControl, setViewingControl] = useState<CorpusControl | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load corpus
  const loadCorpus = useCallback(async () => {
    setCorpusLoading(true);
    try {
      const [ctrls, st] = await Promise.all([
        api.getCorpusControls(),
        api.getCorpusStats(),
      ]);
      setControls(ctrls);
      setStats(st);
    } catch { /* ignore */ } finally {
      setCorpusLoading(false);
    }
  }, []);

  // Load KB docs
  const loadKbDocs = useCallback(async () => {
    setKbLoading(true);
    setKbError(null);
    try {
      const docs = await api.getKBDocuments();
      setKbDocs(docs);
    } catch (e) {
      setKbError(e instanceof Error ? e.message : 'Sənədlər yüklənə bilmədi');
    } finally {
      setKbLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === 'corpus' && controls.length === 0) loadCorpus();
    if (tab === 'documents' && kbDocs.length === 0) loadKbDocs();
  }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  // Search related KB docs when corpus search changes
  useEffect(() => {
    if (tab !== 'corpus' || !search.trim() || search.length < 3) {
      setRelatedDocs([]);
      setRelatedQuery('');
      return;
    }
    const q = search.trim();
    setRelatedQuery(q);
    const timer = setTimeout(() => {
      api.searchKBDocuments(q)
        .then((results) => {
          // Get full doc info for matched docs
          const matched = results.slice(0, 5).map((r) => ({
            id: r.id,
            title: r.title,
            filename: r.filename,
            file_format: r.filename.split('.').pop() || '',
            file_size: 0,
            source: r.source,
            language: '',
            content_preview: r.content_preview,
            created_at: '',
            updated_at: '',
          }));
          setRelatedDocs(matched);
        })
        .catch(() => setRelatedDocs([]));
    }, 400);
    return () => clearTimeout(timer);
  }, [search, tab]);

  const sources = Array.from(new Set(controls.map((c) => c.source)));

  const filtered = controls.filter((c) => {
    if (filterSource !== 'all' && c.source !== filterSource) return false;
    if (filterLang !== 'all' && c.language !== filterLang) return false;
    if (search && !c.requirement_text.toLowerCase().includes(search.toLowerCase()) && !c.category.toLowerCase().includes(search.toLowerCase()) && !c.source.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleFileUpload = useCallback(async (files: FileList) => {
    if (!files.length) return;
    setUploading(true);
    setKbError(null);
    try {
      for (const file of Array.from(files)) {
        await api.uploadKBDocument(file, uploadSource || undefined);
      }
      await loadKbDocs();
    } catch (e) {
      setKbError(e instanceof Error ? e.message : 'Yükləmə xətası');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [uploadSource, loadKbDocs]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    handleFileUpload(e.dataTransfer.files);
  }, [handleFileUpload]);

  const handleView = useCallback(async (doc: KBDocument) => {
    setViewLoading(true);
    setViewingDoc(null);
    try {
      const full = await api.getKBDocument(doc.id);
      setViewingDoc(full);
    } catch (e) {
      setKbError(e instanceof Error ? e.message : 'Sənəd yüklənə bilmədi');
    } finally {
      setViewLoading(false);
    }
  }, []);

  const handleEdit = useCallback((doc: KBDocument) => {
    setEditingDoc(doc);
    setEditTitle(doc.title);
    setEditSource(doc.source);
    setEditContent('');
    setViewLoading(true);
    api.getKBDocument(doc.id)
      .then((full) => setEditContent(full.content || ''))
      .catch(() => setEditContent(''))
      .finally(() => setViewLoading(false));
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!editingDoc) return;
    setEditLoading(true);
    try {
      await api.updateKBDocument(editingDoc.id, editTitle, editSource, editContent);
      await loadKbDocs();
      setEditingDoc(null);
    } catch (e) {
      setKbError(e instanceof Error ? e.message : 'Yeniləmə xətası');
    } finally {
      setEditLoading(false);
    }
  }, [editingDoc, editTitle, editSource, editContent, loadKbDocs]);

  const handleDelete = useCallback(async (id: string) => {
    setDeletingId(id);
    try {
      await api.deleteKBDocument(id);
      setKbDocs((prev) => prev.filter((d) => d.id !== id));
    } catch (e) {
      setKbError(e instanceof Error ? e.message : 'Silinmə xətası');
    } finally {
      setDeletingId(null);
    }
  }, []);

  const handleDownload = useCallback((doc: KBDocument) => {
    const full = viewingDoc || doc;
    if (!full.content) return;
    const blob = new Blob([full.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${doc.title}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [viewingDoc]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Bilik Bazası</h1>
        <p className="mt-1 text-slate-400">
          Standartlar kataloqu + yüklənmiş sənədlər. Axtarış zamanı uyğun sənədlər avtomatik göstərilir.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setTab('corpus')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
            tab === 'corpus'
              ? 'bg-violet-600 text-white'
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
          }`}
        >
          <BookOpen size={16} /> Standart Kataloqu
          {stats && (
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${
              tab === 'corpus' ? 'bg-white/20' : 'bg-slate-700'
            }`}>{stats.total_controls}</span>
          )}
        </button>
        <button
          onClick={() => setTab('documents')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
            tab === 'documents'
              ? 'bg-violet-600 text-white'
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
          }`}
        >
          <Files size={16} /> Sənədlərim
          {kbDocs.length > 0 && (
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${
              tab === 'documents' ? 'bg-white/20' : 'bg-slate-700'
            }`}>{kbDocs.length}</span>
          )}
        </button>
      </div>

      {/* ── Corpus Tab ── */}
      {tab === 'corpus' && (
        <>
          {stats && (
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="card p-4">
                <p className="text-xs text-slate-500">Ümumi nəzarət sayı</p>
                <p className="mt-1 text-2xl font-bold text-slate-100">{stats.total_controls}</p>
              </div>
              <div className="card p-4">
                <p className="text-xs text-slate-500">Kateqoriyalar</p>
                <p className="mt-1 text-2xl font-bold text-slate-100">{Object.keys(stats.by_category).length}</p>
              </div>
              <div className="card p-4">
                <p className="text-xs text-slate-500">Dillər</p>
                <div className="mt-1 flex flex-wrap gap-2">
                  {Object.entries(stats.by_language).map(([lang, count]) => (
                    <span key={lang} className="badge bg-slate-800 text-slate-300 uppercase">
                      {lang}: {count}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Related documents banner — shows when searching standards */}
          {relatedDocs.length > 0 && (
            <div className="card border border-violet-500/30 p-4 animate-slide-in">
              <div className="mb-3 flex items-center gap-2">
                <FileText size={16} className="text-violet-400" />
                <h3 className="text-sm font-semibold text-slate-200">
                  "{relatedQuery}" ilə əlaqəli sənədlər ({relatedDocs.length})
                </h3>
              </div>
              <div className="space-y-2">
                {relatedDocs.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center gap-3 rounded-lg bg-slate-800/40 p-3 hover:bg-slate-800/60 transition-colors cursor-pointer"
                    onClick={() => { setTab('documents'); handleView(doc); }}
                  >
                    <span className="text-lg">{FORMAT_ICONS[doc.file_format] || '📄'}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-200">{doc.title}</p>
                      <p className="text-xs text-slate-500 truncate">{doc.source} · {doc.content_preview.slice(0, 100)}...</p>
                    </div>
                    <Eye size={14} className="text-slate-500" />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="card p-4">
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
                <input
                  className="input pl-9"
                  placeholder="Standart və ya maddə adı ilə axtar... (məs: ISO 27001, CBAR, A.8.32)"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <select
                className="input sm:w-48"
                value={filterSource}
                onChange={(e) => setFilterSource(e.target.value)}
              >
                <option value="all">Bütün mənbələr</option>
                {sources.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <select
                className="input sm:w-32"
                value={filterLang}
                onChange={(e) => setFilterLang(e.target.value)}
              >
                <option value="all">Bütün dillər</option>
                <option value="az">Azərbaycanca</option>
                <option value="en">English</option>
              </select>
            </div>
          </div>

          {corpusLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 size={28} className="animate-spin text-violet-500" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="card p-8 text-center text-slate-500">
              <BookOpen size={32} className="mx-auto text-slate-700" />
              <p className="mt-3 text-sm">Nəzarət tapılmadı.</p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-slate-500">{filtered.length} nəticə</p>
              {filtered.slice(0, 100).map((c) => {
                const isExpanded = expandedControl === c.id;
                const isLong = c.requirement_text.length > 150;
                return (
                  <div key={c.id} className="card p-4 animate-slide-in cursor-pointer hover:border-violet-500/30 transition-all" onClick={() => setViewingControl(c)}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="badge bg-violet-500/10 text-violet-400">{c.source}</span>
                          <span className="badge bg-slate-800 text-slate-400">{c.category}</span>
                          <span className="badge bg-slate-800 text-slate-500 uppercase">{c.language}</span>
                        </div>
                        <p className="mt-2 text-sm text-slate-300">
                          {isLong && !isExpanded
                            ? <>{c.requirement_text.slice(0, 150)}... <button className="text-violet-400 hover:text-violet-300 text-xs font-medium" onClick={(e) => { e.stopPropagation(); setExpandedControl(c.id); }}>Ətraflı oxu</button></>
                            : c.requirement_text}
                        </p>
                        {isExpanded && isLong && (
                          <button className="mt-1 text-xs text-violet-400 hover:text-violet-300" onClick={(e) => { e.stopPropagation(); setExpandedControl(null); }}>Yığışdır</button>
                        )}
                        <p className="mt-1 text-xs text-slate-600">ID: {c.id}</p>
                      </div>
                      <Eye size={14} className="text-slate-600 flex-shrink-0 mt-1" />
                    </div>
                  </div>
                );
              })}
              {filtered.length > 100 && (
                <p className="text-center text-xs text-slate-500 py-2">
                  İlk 100 nəticə göstərilir. Daha dəqiq axtarış üçün filtr istifadə edin.
                </p>
              )}
            </div>
          )}
        </>
      )}

      {/* ── Documents Tab ── */}
      {tab === 'documents' && (
        <>
          {/* Upload zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            className={`rounded-xl border-2 border-dashed p-6 transition-all ${
              dragging ? 'border-violet-500 bg-violet-500/5' : 'border-slate-700 bg-slate-900'
            }`}
          >
            <div className="flex flex-col items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-600/10 text-violet-400">
                <UploadCloud size={24} />
              </div>
              <p className="text-sm font-medium text-slate-100">
                Bilik bazasına sənəd yükləyin
              </p>
              <p className="text-xs text-slate-500">
                PDF, DOCX, PPTX, XLSX, PNG/JPG (OCR), TXT — refresh olsa belə silinmir
              </p>
              <div className="flex flex-col gap-2 sm:flex-row w-full max-w-md">
                <input
                  className="input flex-1 text-sm"
                  placeholder="Mənbə/qaydaq adı (məs: ISO 27001)"
                  value={uploadSource}
                  onChange={(e) => setUploadSource(e.target.value)}
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED}
                  multiple
                  className="hidden"
                  onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="btn-primary text-sm whitespace-nowrap"
                >
                  {uploading ? <Loader2 size={14} className="animate-spin" /> : <PlusCircle size={14} />}
                  {uploading ? 'Yüklənir...' : 'Fayl seç'}
                </button>
              </div>
            </div>
          </div>

          {kbError && (
            <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              <AlertCircle size={16} /> {kbError}
              <button onClick={() => setKbError(null)} className="ml-auto"><X size={14} /></button>
            </div>
          )}

          {/* Documents list */}
          {kbLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 size={28} className="animate-spin text-violet-500" />
            </div>
          ) : kbDocs.length === 0 ? (
            <div className="card p-12 text-center">
              <Files size={40} className="mx-auto text-slate-700" />
              <p className="mt-4 text-slate-400">Hələ heç bir sənəd yüklənməyib.</p>
              <p className="mt-1 text-xs text-slate-500">Yuxarıdakı zonadan sənəd yükləyin — bilik bazasında saxlanacaq.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">{kbDocs.length} sənəd</p>
              </div>
              {kbDocs.map((doc) => (
                <div key={doc.id} className="card p-4 animate-slide-in">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-slate-800 text-lg">
                      {FORMAT_ICONS[doc.file_format] || '📄'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-medium text-slate-100">{doc.title}</p>
                        <span className="badge bg-slate-800 text-slate-400 uppercase">{doc.file_format}</span>
                        {doc.source && (
                          <span className="badge bg-violet-500/10 text-violet-400">{doc.source}</span>
                        )}
                        <span className="badge bg-slate-800 text-slate-500 uppercase">{doc.language}</span>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-slate-500">
                        {doc.filename} · {(doc.file_size / 1024).toFixed(1)} KB · {new Date(doc.created_at).toLocaleDateString('az-AZ')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleView(doc)} className="btn-ghost text-xs" title="Oxu">
                        <Eye size={14} />
                      </button>
                      <button onClick={() => handleEdit(doc)} className="btn-ghost text-xs" title="Redaktə">
                        <Edit3 size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(doc.id)}
                        disabled={deletingId === doc.id}
                        className="btn-ghost text-red-400 hover:text-red-300 text-xs"
                        title="Sil"
                      >
                        {deletingId === doc.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── View Modal ── */}
      {viewingDoc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fade-in"
          onClick={() => setViewingDoc(null)}
        >
          <div
            className="card flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden p-0"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 p-4">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-xl flex-shrink-0">{FORMAT_ICONS[viewingDoc.file_format] || '📄'}</span>
                <div className="min-w-0">
                  <h3 className="truncate text-base font-semibold text-slate-100">{viewingDoc.title}</h3>
                  <p className="text-xs text-slate-500 truncate">{viewingDoc.source} · {viewingDoc.filename}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => handleDownload(viewingDoc)} className="btn-ghost text-xs">
                  <Download size={14} /> Endir
                </button>
                <button onClick={() => setViewingDoc(null)} className="btn-ghost">
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="overflow-y-auto p-6">
              {viewLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 size={24} className="animate-spin text-violet-500" />
                </div>
              ) : (
                <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-300">
                  {viewingDoc.content || viewingDoc.content_preview || 'Mətn yoxdur.'}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Loading overlay for view ── */}
      {viewLoading && !viewingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="card p-6 flex items-center gap-3">
            <Loader2 size={20} className="animate-spin text-violet-500" />
            <span className="text-sm text-slate-400">Sənəd yüklənir...</span>
          </div>
        </div>
      )}

      {/* ── Edit Modal ── */}
      {editingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fade-in">
          <div className="card flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden p-0">
            <div className="flex items-center justify-between border-b border-slate-800 p-4">
              <h3 className="text-base font-semibold text-slate-100">Sənədi Redaktə Et</h3>
              <button onClick={() => setEditingDoc(null)} className="btn-ghost">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4 overflow-y-auto p-6">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">Başlıq</label>
                <input
                  className="input"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">Mənbə / Qaydaq</label>
                <input
                  className="input"
                  value={editSource}
                  onChange={(e) => setEditSource(e.target.value)}
                  placeholder="məs: ISO 27001, CBAR, DORA"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">Məzmun</label>
                {viewLoading ? (
                  <div className="flex items-center gap-2 py-4 text-sm text-slate-500">
                    <Loader2 size={16} className="animate-spin" /> Məzmun yüklənir...
                  </div>
                ) : (
                  <textarea
                    className="input min-h-[300px] resize-y font-mono text-xs"
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                  />
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-800 p-4">
              <button onClick={() => setEditingDoc(null)} className="btn-ghost">
                Ləğv et
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={editLoading || !editTitle.trim()}
                className="btn-primary"
              >
                {editLoading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Yadda saxla
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Corpus Control Full-Text Modal ── */}
      {viewingControl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 animate-fade-in"
          onClick={() => setViewingControl(null)}
        >
          <div
            className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-slate-900 shadow-2xl border border-slate-700"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-700 px-6 py-4">
              <div className="flex items-center gap-2">
                <BookOpen size={18} className="text-violet-400" />
                <h2 className="text-base font-bold text-slate-100">Nəzarət Detalları</h2>
              </div>
              <button onClick={() => setViewingControl(null)} className="text-slate-400 hover:text-slate-200">
                <X size={20} />
              </button>
            </div>
            <div className="overflow-y-auto px-6 py-5 space-y-4">
              <div className="flex flex-wrap gap-2">
                <span className="badge bg-violet-500/10 text-violet-400">{viewingControl.source}</span>
                <span className="badge bg-slate-800 text-slate-400">{viewingControl.category}</span>
                <span className="badge bg-slate-800 text-slate-500 uppercase">{viewingControl.language}</span>
                <span className="badge bg-slate-800 text-slate-500">ID: {viewingControl.id}</span>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 mb-1">Tələb Mətni</p>
                <p className="text-sm leading-relaxed text-slate-200 whitespace-pre-line">{viewingControl.requirement_text}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
