import { useState, useEffect, useRef } from 'react';
import {
  FileText, Loader2, AlertCircle, Sparkles, FileStack,
  ChevronDown, ChevronUp, X, Download, Printer,
  ShieldCheck, BookOpen, CheckCircle2, Search, Plus,
  Upload, FileDown,
} from 'lucide-react';
import { api } from '@/services/api';

interface DocSection {
  heading: string;
  content: string;
}

interface GeneratedDoc {
  title: string;
  sections: DocSection[];
  references: string[];
  summary: string;
}

interface DocTypeInfo {
  label_az: string;
  label_en: string;
  sections: string[];
}

interface TemplateMeta {
  id: string;
  name: string;
  doc_type: string;
  language: string;
  topic: string;
  organization: string;
  standards: string[];
  created_at: string;
}

const TEMPLATE_STORAGE_KEY = 'doc-builder-templates';

function loadTemplates(): TemplateMeta[] {
  try {
    const raw = localStorage.getItem(TEMPLATE_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return [];
}

function saveTemplate(meta: TemplateMeta, content: GeneratedDoc) {
  try {
    const templates = loadTemplates();
    templates.unshift(meta);
    localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(templates.slice(0, 50)));
    localStorage.setItem(`doc-builder-template-${meta.id}`, JSON.stringify(content));
  } catch { /* ignore */ }
}

function loadTemplateContent(id: string): GeneratedDoc | null {
  try {
    const raw = localStorage.getItem(`doc-builder-template-${id}`);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return null;
}

function deleteTemplate(id: string) {
  try {
    const templates = loadTemplates().filter((t) => t.id !== id);
    localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(templates));
    localStorage.removeItem(`doc-builder-template-${id}`);
  } catch { /* ignore */ }
}

export function DocumentBuilderPage() {
  const [topic, setTopic] = useState('');
  const [docType, setDocType] = useState('policy');
  const [language, setLanguage] = useState('az');
  const [organization, setOrganization] = useState('');
  const [standards, setStandards] = useState<string[]>([]);
  const [availableStandards, setAvailableStandards] = useState<string[]>([]);
  const [docTypes, setDocTypes] = useState<Record<string, DocTypeInfo>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GeneratedDoc | null>(null);
  const [expandedSection, setExpandedSection] = useState<number | null>(null);

  // Standards search
  const [standardSearch, setStandardSearch] = useState('');
  const [showStandards, setShowStandards] = useState(false);

  // Template import
  const [showTemplatePanel, setShowTemplatePanel] = useState(false);
  const [templates, setTemplates] = useState<TemplateMeta[]>([]);
  const importFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.getDocTypes().then((data) => {
      setDocTypes(data.types);
      setAvailableStandards(data.standards);
    }).catch(() => {});
    setTemplates(loadTemplates());
  }, []);

  const filteredStandards = availableStandards.filter((s) =>
    s.toLowerCase().includes(standardSearch.toLowerCase())
  );

  const toggleStandard = (s: string) => {
    setStandards((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
  };

  const addCustomStandard = () => {
    const s = standardSearch.trim();
    if (s && !availableStandards.includes(s) && !standards.includes(s)) {
      setStandards((prev) => [...prev, s]);
      setAvailableStandards((prev) => [...prev, s]);
      setStandardSearch('');
    } else if (s && availableStandards.includes(s) && !standards.includes(s)) {
      toggleStandard(s);
      setStandardSearch('');
    }
  };

  const handleGenerate = async () => {
    if (!topic.trim()) {
      setError('Mövzu daxil edin');
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const r = await api.generateDocument({
        topic, doc_type: docType, language, standards, organization,
      });
      setResult(r);
      setExpandedSection(0);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sənəd yaradıla bilmədi');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAsTemplate = () => {
    if (!result) return;
    const id = `tpl-${Date.now()}`;
    const meta: TemplateMeta = {
      id, name: result.title, doc_type: docType, language,
      topic, organization, standards, created_at: new Date().toISOString(),
    };
    saveTemplate(meta, result);
    setTemplates(loadTemplates());
  };

  const handleDownloadJson = () => {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `template-${docType}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadHtml = () => {
    if (!result) return;
    const html = buildHtml(result, docTypes[docType]?.label_az || 'Sənəd');
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `document-${docType}-${Date.now()}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportTemplate = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string) as GeneratedDoc;
        if (data.title && data.sections) {
          setResult(data);
          setExpandedSection(0);
          setShowTemplatePanel(false);
        } else {
          setError('Yanlış şablon formatı');
        }
      } catch {
        setError('Şablon faylı oxuna bilmədi');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleLoadTemplate = (id: string) => {
    const content = loadTemplateContent(id);
    if (content) {
      setResult(content);
      setExpandedSection(0);
      setShowTemplatePanel(false);
    }
  };

  const handleDeleteTemplate = (id: string) => {
    deleteTemplate(id);
    setTemplates(loadTemplates());
  };

  const currentTypeInfo = docTypes[docType];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-100">
            <FileStack size={24} className="text-violet-400" />
            Sənəd Hazırlanması
          </h1>
          <p className="mt-1 text-slate-400">
            Beynəlxalq standartlara, CBAR və qanunvericiliyə uyğun siyasət, prosedur və sənədlər hazırlayın
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowTemplatePanel(!showTemplatePanel)}
            className={`btn-secondary text-sm ${showTemplatePanel ? 'border-violet-500 text-violet-300' : ''}`}
          >
            <Upload size={14} /> Şablonlar
          </button>
        </div>
      </div>

      {/* Template Panel */}
      {showTemplatePanel && (
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-200">Şablon İdarəetməsi</h3>
            <button onClick={() => setShowTemplatePanel(false)}><X size={16} className="text-slate-400" /></button>
          </div>

          {/* Import from file */}
          <div className="rounded-lg border border-dashed border-slate-600 p-4 text-center">
            <input ref={importFileRef} type="file" accept=".json" onChange={handleImportTemplate} className="hidden" />
            <button
              onClick={() => importFileRef.current?.click()}
              className="flex flex-col items-center gap-2 text-slate-400 hover:text-violet-300 transition-colors w-full"
            >
              <FileDown size={24} className="text-violet-400" />
              <span className="text-sm">JSON şablon faylını import edin</span>
              <span className="text-xs text-slate-500">.json formatında saxlanmış şablonu yükləyin</span>
            </button>
          </div>

          {/* Saved templates */}
          {templates.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium text-slate-400">Saxlanmış şablonlar</p>
              <div className="space-y-2">
                {templates.map((t) => (
                  <div key={t.id} className="flex items-center gap-3 rounded-lg border border-slate-700 bg-slate-800/30 p-3">
                    <FileText size={14} className="flex-shrink-0 text-violet-400" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-200">{t.name}</p>
                      <p className="text-xs text-slate-500">
                        {t.topic} · {t.language.toUpperCase()} · {new Date(t.created_at).toLocaleDateString('az-AZ')}
                      </p>
                    </div>
                    <button
                      onClick={() => handleLoadTemplate(t.id)}
                      className="rounded px-2 py-1 text-xs text-violet-400 hover:bg-violet-600/10"
                    >
                      Aç
                    </button>
                    <button
                      onClick={() => handleDeleteTemplate(t.id)}
                      className="rounded px-2 py-1 text-xs text-red-400 hover:bg-red-600/10"
                    >
                      Sil
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result && (
            <button onClick={handleSaveAsTemplate} className="btn-primary w-full text-sm">
              <Plus size={14} /> Hazır sənədi şablon kimi saxla
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Form */}
        <div className="lg:col-span-1 space-y-4">
          <div className="card p-5 space-y-4">
            {/* Topic */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-300">Mövzu</label>
              <input
                className="input"
                placeholder="məs: İstifadəçi giriş idarəetmə prosesi"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              />
            </div>

            {/* Doc type */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-300">Sənəd növü</label>
              <select
                className="input"
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
              >
                {Object.entries(docTypes).map(([key, info]) => (
                  <option key={key} value={key}>
                    {info.label_az}
                  </option>
                ))}
              </select>
            </div>

            {/* Language */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-300">Dil</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setLanguage('az')}
                  className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                    language === 'az' ? 'bg-violet-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  Azərbaycan
                </button>
                <button
                  onClick={() => setLanguage('en')}
                  className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                    language === 'en' ? 'bg-violet-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  English
                </button>
              </div>
            </div>

            {/* Organization */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-300">Təşkilat (istəyə görə)</label>
              <input
                className="input"
                placeholder="məs: Təşkilat adı"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
              />
            </div>

            {/* Standards — searchable, optional */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-300">
                Standartlar (istəyə görə)
              </label>
              <p className="mb-2 text-[11px] text-slate-500">
                Seçməsəniz, AI mövzuya uyğun standartları avtomatik təyin edəcək
              </p>

              {/* Selected chips */}
              {standards.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {standards.map((s) => (
                    <span key={s} className="inline-flex items-center gap-1 rounded-full bg-violet-600/20 px-2.5 py-1 text-xs text-violet-300">
                      {s}
                      <button onClick={() => toggleStandard(s)} className="hover:text-violet-100"><X size={10} /></button>
                    </span>
                  ))}
                </div>
              )}

              {/* Search input */}
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  className="input pl-9 pr-3"
                  placeholder="Standart axtarın və ya əlavə edin..."
                  value={standardSearch}
                  onChange={(e) => setStandardSearch(e.target.value)}
                  onFocus={() => setShowStandards(true)}
                />
                {standardSearch && !availableStandards.includes(standardSearch) && (
                  <button
                    onClick={addCustomStandard}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded bg-violet-600/20 px-2 py-1 text-xs text-violet-300 hover:bg-violet-600/30"
                  >
                    <Plus size={12} /> Əlavə et
                  </button>
                )}
              </div>

              {/* Dropdown list */}
              {showStandards && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowStandards(false)} />
                  <div className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-slate-700 bg-slate-900 shadow-xl">
                    {filteredStandards.length === 0 ? (
                      <button
                        onClick={addCustomStandard}
                        className="flex w-full items-center gap-2 px-3 py-2 text-xs text-violet-300 hover:bg-slate-800"
                      >
                        <Plus size={12} /> "{standardSearch}" əlavə et
                      </button>
                    ) : (
                      filteredStandards.map((s) => (
                        <label key={s} className="flex cursor-pointer items-center gap-2 px-3 py-2 hover:bg-slate-800">
                          <input
                            type="checkbox"
                            checked={standards.includes(s)}
                            onChange={() => toggleStandard(s)}
                            className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-violet-600 focus:ring-violet-500"
                          />
                          <span className="text-xs text-slate-300">{s}</span>
                        </label>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Template structure preview */}
            {currentTypeInfo && (
              <div className="rounded-lg border border-slate-700 bg-slate-800/30 p-3">
                <details className="group">
                  <summary className="flex cursor-pointer items-center justify-between text-sm font-medium text-violet-300 hover:text-violet-200 list-none">
                    <span className="flex items-center gap-2">
                      <FileText size={14} /> Şablon quruluşu
                    </span>
                    <ChevronDown size={14} className="transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="mt-3 space-y-1.5">
                    {currentTypeInfo.sections.map((s, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-slate-400">
                        <span className="flex h-5 w-5 items-center justify-center rounded bg-violet-600/10 text-[10px] font-bold text-violet-400">
                          {i + 1}
                        </span>
                        {s}
                      </div>
                    ))}
                  </div>
                </details>
              </div>
            )}

            {/* Generate */}
            <button
              onClick={handleGenerate}
              disabled={loading || !topic.trim()}
              className="btn-primary w-full"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              {loading ? 'Yaradılır...' : 'Sənəd Yarat'}
            </button>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              <AlertCircle size={16} /> {error}
              <button onClick={() => setError(null)} className="ml-auto"><X size={14} /></button>
            </div>
          )}
        </div>

        {/* Result */}
        <div className="lg:col-span-2">
          {loading && !result ? (
            <div className="card flex h-96 items-center justify-center">
              <div className="text-center">
                <Loader2 size={32} className="animate-spin text-violet-500 mx-auto" />
                <p className="mt-4 text-sm text-slate-400">Sənəd yaradılır... Bu bir neçə saniyə çəkə bilər.</p>
              </div>
            </div>
          ) : result ? (
            <div className="space-y-4">
              {/* Toolbar */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <CheckCircle2 size={16} className="text-emerald-400" />
                  Sənəd hazırdır
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={handleDownloadJson} className="btn-ghost text-xs">
                    <Download size={14} /> JSON
                  </button>
                  <button onClick={handleDownloadHtml} className="btn-ghost text-xs">
                    <FileDown size={14} /> HTML
                  </button>
                  <button onClick={handleSaveAsTemplate} className="btn-ghost text-xs">
                    <Plus size={14} /> Şablon saxla
                  </button>
                  <button onClick={() => window.print()} className="btn-ghost text-xs">
                    <Printer size={14} /> Çap
                  </button>
                  <button
                    onClick={() => { setResult(null); setExpandedSection(null); }}
                    className="btn-secondary text-xs"
                  >
                    <X size={14} /> Yeni
                  </button>
                </div>
              </div>

              {/* Document */}
              <div className="report-document rounded-xl bg-white shadow-2xl">
                <div className="border-b-2 border-slate-200 px-8 py-6">
                  <div className="flex items-center gap-2 text-sm font-medium text-violet-600">
                    <ShieldCheck size={16} />
                    {docTypes[docType]?.label_az || 'Sənəd'}
                  </div>
                  <h1 className="mt-2 text-2xl font-bold text-slate-900">{result.title}</h1>
                  {result.summary && (
                    <p className="mt-2 text-sm leading-relaxed text-slate-500">{result.summary}</p>
                  )}
                </div>

                <div className="px-8 py-6 space-y-4">
                  {result.sections.map((sec, idx) => (
                    <div key={idx} className="rounded-lg border border-slate-200">
                      <button
                        onClick={() => setExpandedSection(expandedSection === idx ? null : idx)}
                        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-slate-50"
                      >
                        <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800">
                          <span className="flex h-6 w-6 items-center justify-center rounded bg-violet-100 text-xs font-bold text-violet-700">
                            {idx + 1}
                          </span>
                          {sec.heading}
                        </h3>
                        {expandedSection === idx ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                      </button>
                      {expandedSection === idx && (
                        <div className="border-t border-slate-100 px-4 py-3">
                          <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">{sec.content}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {result.references && result.references.length > 0 && (
                  <div className="border-t border-slate-200 px-8 py-6">
                    <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800">
                      <BookOpen size={16} className="text-violet-600" />
                      İstinadlar
                    </h3>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {result.references.map((ref, i) => (
                        <span key={i} className="inline-block rounded bg-violet-100 px-2.5 py-1 text-xs font-medium text-violet-700">
                          {ref}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="border-t border-slate-200 px-8 py-4">
                  <p className="text-xs text-slate-400">Sənəd Hazırlanması modulu tərəfindən yaradılıb · {new Date().toLocaleString('az-AZ')}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="card flex h-96 items-center justify-center">
              <div className="text-center">
                <FileText size={40} className="mx-auto text-slate-700" />
                <p className="mt-4 text-sm text-slate-400">
                  Mövzunu daxil edin və "Sənəd Yarat" düyməsinə basın
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Sənəd beynəlxalq standartlara və qanunvericiliyə uyğun hazırlanacaq
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function buildHtml(doc: GeneratedDoc, typeLabel: string): string {
  const sectionsHtml = doc.sections.map((s, i) => `
    <div style="margin-bottom:24px;">
      <h2 style="font-size:16px;font-weight:bold;color:#1e293b;margin-bottom:8px;">${i + 1}. ${s.heading}</h2>
      <div style="font-size:14px;line-height:1.7;color:#334155;white-space:pre-line;">${s.content}</div>
    </div>`).join('');
  const refsHtml = doc.references?.length
    ? `<div style="margin-top:24px;border-top:1px solid #e2e8f0;padding-top:16px;">
        <h2 style="font-size:16px;font-weight:bold;color:#1e293b;margin-bottom:8px;">İstinadlar</h2>
        <div>${doc.references.map((r) => `<span style="display:inline-block;background:#ede9fe;color:#6d28d9;padding:4px 10px;border-radius:4px;font-size:12px;margin:2px;">${r}</span>`).join('')}</div>
      </div>`
    : '';
  return `<!DOCTYPE html>
<html lang="az">
<head><meta charset="utf-8"><title>${doc.title}</title></head>
<body style="font-family:Georgia,serif;max-width:800px;margin:0 auto;padding:40px;">
  <div style="border-bottom:2px solid #e2e8f0;padding-bottom:20px;margin-bottom:24px;">
    <div style="color:#7c3aed;font-size:14px;font-weight:500;">${typeLabel}</div>
    <h1 style="font-size:28px;font-weight:bold;color:#0f172a;margin-top:8px;">${doc.title}</h1>
    ${doc.summary ? `<p style="font-size:14px;color:#64748b;margin-top:8px;">${doc.summary}</p>` : ''}
  </div>
  ${sectionsHtml}
  ${refsHtml}
  <div style="border-top:1px solid #e2e8f0;padding-top:16px;margin-top:24px;">
    <p style="font-size:12px;color:#94a3b8;">Sənəd Hazırlanması modulu tərəfindən yaradılıb · ${new Date().toLocaleString('az-AZ')}</p>
  </div>
</body>
</html>`;
}
