import { useState, useRef } from 'react';
import {
  Download, FileText, Printer, ShieldCheck, TrendingUp,
  AlertTriangle, CheckCircle2, Calendar, FileStack, Globe,
  Hash, Lightbulb, ChevronDown, ChevronUp, Tag, Wrench,
  Upload, FileDown,
} from 'lucide-react';
import type { AnalysisResult, GapResult } from '@/types';
import {
  RISK_COLORS, RISK_LABELS_AZ,
  STATUS_LABELS_AZ,
  STATUS_BADGE_CLASSES, RISK_BADGE_CLASSES,
} from '@/types';

const sampleResult: AnalysisResult = {
  id: 'sample-001',
  document_id: 'doc-001',
  document_title: 'AI Təhlükəsizlik Politikası v2024',
  detected_language: 'az',
  status: 'completed',
  progress: 100,
  started_at: '2025-01-15T10:00:00',
  completed_at: '2025-01-15T10:05:32',
  executive_summary:
    'Təqdim edilən "AI Təhlükəsizlik Politikası v2024" sənədi NIST AI RMF və ISO 42001 standartlarına ümumilikdə 62% uyğunluq səviyyəsindədir. ' +
    '8 nəzarət tam uyğun, 5 nəzarət qismən uyğun, 7 nəzarət isə tam yoxdur olaraq qiymətləndirilmişdir. ' +
    'Ən kritik boşluqlar "Risk Qiymətləndirmə" və "İnsan Nəzarəti" kateqoriyalarında müşahidə olunur. ' +
    'Risk səviyyəsi "Yüksək" olaraq klassifikasiya edilmişdir. Tövsiyə olunur ki, növbəti 3 ay ərzində ' +
    'risk qiymətləndirmə prosesi formal olaraq sənədləşdirilsin və insan nəzarəti mexanizmləri müəyyənləşdirilsin.',
  risk_level: 'high',
  total_controls: 20,
  compliant_count: 8,
  partial_count: 5,
  missing_count: 7,
  gaps: [
    {
      control_id: 'NIST-AI-1.1',
      control_source: 'NIST AI RMF',
      control_category: 'AI Risk Qiymətləndirmə',
      control_text: 'AI sistemi üçün vaxtaşırı risk qiymətləndirmə aparılmalı və nəticələr sənədləşdirilməlidir.',
      status: 'missing',
      justification:
        'Sənəddə risk qiymətləndirmə prosesi haqqında heç bir məlumat yoxdur. Risk kateqoriyaları, qiymətləndirmə metodologiyası və ya tezlik müəyyən edilməmişdir.',
      evidence_snippet: '',
      evidence_reference: '',
    },
    {
      control_id: 'NIST-AI-2.3',
      control_source: 'NIST AI RMF',
      control_category: 'İnsan Nəzarəti',
      control_text: 'AI sistemində insan nəzarəti səviyyəsi riskə uyğun olaraq müəyyənləşdirilməli və sənədləşdirilməlidir.',
      status: 'missing',
      standard_requirement: 'Yüksək riskli AI sistemlərində insan təsdiqi tələb olunur. İnsan nəzarəti səviyyəsi (tam, qismən, minimal) risk klassifikasiyasına uyğun olaraq müəyyən edilməlidir.',
      current_document_text: 'Text not found',
      gap_analysis: 'Sənəddə insan nəzarəti (human oversight) səviyyələri və ya hansı qərarların insan təsdiqi tələb etdiyi müəyyən edilməmişdir.',
      remediation_proposal: 'Bu siyasətə əlavə edilməlidir: "Yüksək riskli AI qərarları (məsələn: kredit təsdiqi, işə götürmə) tam insan nəzarəti tələb edir — AI tövsiyəsi insan tərəfindən təsdiqlənmədən icra edilə bilməz. Orta riskli qərarlarda qismən nəzarət tətbiq olunur."',
      justification: 'Sənəddə insan nəzarəti (human oversight) mexanizmləri haqqında heç bir istinad yoxdur.',
      evidence_snippet: '',
      evidence_reference: '',
    },
    {
      control_id: 'NIST-AI-3.2',
      control_source: 'NIST AI RMF',
      control_category: 'Məlumat Təhlükəsizliyi',
      control_text: 'AI sistemində istifadə olunan məlumatların məxfiliyi, bütövlüyü və əlçatanlığı təmin edilməlidir.',
      status: 'partial',
      justification:
        'Sənəddə məlumat məxfiliyi haqqında ümumi bənd var, lakin məlumat bütövlüyü və əlçatanlıq tələbləri haqqında detallı təlimat yoxdur.',
      evidence_snippet:
        'Təşkilat AI sistemlərində istifadə olunan məlumatların məxfiliyini təmin etmək üçün uyğun texniki tədbirlər görür.',
      evidence_reference: 'Bölmə 4.2 — Məlumat Təhlükəsizliyi',
    },
    {
      control_id: 'NIST-AI-4.1',
      control_source: 'NIST AI RMF',
      control_category: 'Şəffaflıq və Hesabatlılıq',
      control_text: 'AI sisteminin qərarları şəffaf və izah edilə bilən olmalıdır.',
      status: 'compliant',
      justification:
        'Sənəddə AI qərarlarının izah edilə bilməsi üçün detallı prosedur var. Şəffaflıq prinsipləri və hesabatlılıq mexanizmləri müəyyənləşdirilmişdir.',
      evidence_snippet:
        'Bütün AI qərarları avtomatik olaraq loq yazılır və marağı tərəfə izah edilə bilən formatda saxlanılır.',
      evidence_reference: 'Bölmə 6.1 — Şəffaflıq',
    },
    {
      control_id: 'ISO-42001-A.1',
      control_source: 'ISO 42001',
      control_category: 'AI Siyasəti',
      control_text: 'Təşkilat yazılı AI idarəetmə siyasəti hazırlamalı və təsdiqləməlidir.',
      status: 'compliant',
      justification: 'Sənədin özü bir AI təhlükəsizlik siyasətidir və rəsmi təsdiqlənmişdir.',
      evidence_snippet:
        'Bu siyasət təşkilatın AI sistemlərinin təhlükəsiz və məsuliyyətli istifadəsini təmin etmək məqsədilə hazırlanmışdır.',
      evidence_reference: 'Bölmə 1 — Ümumi Müqəddimə',
    },
    {
      control_id: 'ISO-42001-A.5',
      control_source: 'ISO 42001',
      control_category: 'Təlim və Fikir Artırma',
      control_text: 'AI sistemləri ilə işləyən personal üçün mütəmadi təlim proqramı olmalıdır.',
      status: 'partial',
      justification:
        'Sənəddə təlimin vacibliyi qeyd olunur, lakin təlim proqramının strukturu, tezliyi və məzmunu haqqında detal yoxdur.',
      evidence_snippet: 'Personal AI təhlükəsizliyi sahəsində mütəmadi təlim almalıdır.',
      evidence_reference: 'Bölmə 5.3 — Təlim',
    },
    {
      control_id: 'ISO-42001-A.8',
      control_source: 'ISO 42001',
      control_category: 'Hadisə İdarəetmə',
      control_text: 'AI ilə əlaqəli təhlükəsizlik hadisələri üçün hadisə idarəetmə prosesi olmalıdır.',
      status: 'missing',
      standard_requirement: 'AI hadisələri klassifikasiyası (kritik, yüksək, orta, aşağı), eskalasiya yolu, cavabdehlik matrisi və hadisə bağlama kriteriyaları müəyyən edilməlidir.',
      current_document_text: 'Text not found',
      gap_analysis: 'Sənəddə AI-specific hadisə idarəetmə prosesi, klassifikasiya, eskalasiya yolu və cavabdehlik matrisi haqqında heç bir məlumat yoxdur.',
      remediation_proposal: 'Bu siyasətə yeni bölmə əlavə edilməlidir: "AI Hadisə İdarəetmə: Hadisə klassifikasiyası — Kritik (24 saatda ESL), Yüksək (48 saat), Orta (5 gün), Aşağı (10 gün). Eskalasiya: Technical Lead → CISO → CEO. Cavabdehlik matrisi Ekibend 1-də göstərilmişdir."',
      justification: 'Sənəddə AI-specific hadisə idarəetmə prosesi haqqında heç bir məlumat yoxdur.',
      evidence_snippet: '',
      evidence_reference: '',
    },
  ],
  recommendations: [
    'Risk qiymətləndirmə prosesi formal olaraq sənədləşdirilməli və icrası təmin edilməlidir: risk kateqoriyaları, qiymətləndirmə metodologiyası və qiymətləndirmə tezliyi müəyyənləşdirilməli, illik ən azı bir dəfə icra edilməlidir.',
    'İnsan nəzarəti (human oversight) mexanizmləri müəyyənləşdirilməli və sənədləşdirilməlidir: yüksək riskli AI qərarları üçün tam insan təsdiqi tələb olunmalı, orta və aşağı riskli qərarlar üçün nəzarət səviyyələri ayrı-ayrı detallandırılmalıdır.',
    'AI hadisə idarəetmə prosesi yaradılmalı və tətbiq edilməlidir: hadisə klassifikasiyası (kritik, yüksək, orta, aşağı), eskalasiya yolu, cavabdehlik matrisi və hadisə bağlama kriteriyaları müəyyən edilməli, mütəmadi təlim keçirilməlidir.',
    'Təlim proqramı detallandırılmalı və icrası təmin edilməlidir: illik təlim planı, təlim məzmunu, qiymətləndirmə kriteriyaları və sertifikatlaşdırma prosesi müəyyənləşdirilməli, bütün əlaqədar personal əhatə edilməlidir.',
    'Məlumat bütövlüyü və əlçatanlıq tələbləri siyasətə əlavə edilməli və texniki nəzarət tədbirləri müəyyənləşdirilməlidir: şifrələmə standartları, giriş nəzarəti mexanizmləri və audit loq standartları detal səviyyəsində təsvir edilməlidir.',
    'AI sistemlərinin audit üçün loq standartları müəyyənləşdirilməli və icrası təmin edilməlidir: loq saxlanma müddəti, loq formatı, loq yoxlama proseduru və müstəqil audit tezliyi təyin edilməlidir.',
    'Növbəti yeniləmədə CBAR informasiya təhlükəsizliyi tələbləri ilə uyğunluq qiymətləndirməsi əlavə edilməli və boşluqlar aradan qaldırılmalıdır: CBAR-ın mövcud təlimatları əsasında uyğunluq matrisi hazırlanmalı və icra tarixçəsi müəyyən edilməlidir.',
  ],
  document_classification: {
    detected_type: 'Change & Release Management Policy',
    applicable_standard: 'ISO/IEC 27001:2022',
    primary_clauses: ['A.8.32 Change management', 'A.8.31 Separation of development, testing and production environments'],
  },
  error: undefined,
};

export function ReportTemplatePage() {
  const [expandedGap, setExpandedGap] = useState<string | null>(null);
  const [importedResult, setImportedResult] = useState<AnalysisResult | null>(null);
  const importFileRef = useRef<HTMLInputElement>(null);
  const result = importedResult || sampleResult;
  const isAz = true;
  const statusLabels = STATUS_LABELS_AZ;
  const riskLabels = RISK_LABELS_AZ;
  const compliantPct =
    result.total_controls > 0
      ? Math.round((result.compliant_count / result.total_controls) * 100)
      : 0;

  const groupedGaps = result.gaps.reduce<Record<string, GapResult[]>>((acc, gap) => {
    const source = gap.control_source;
    if (!acc[source]) acc[source] = [];
    acc[source].push(gap);
    return acc;
  }, {});

  const handleImportTemplate = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string) as AnalysisResult;
        if (data.document_title && data.gaps) {
          setImportedResult(data);
        }
      } catch { /* ignore */ }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleExportTemplate = () => {
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report-template-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Toolbar */}
      <div className="no-print flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">
            Hesabat Şablonu (Nümunə)
          </h1>
          <p className="mt-1 text-slate-400">
            Bu, sənəd analizdən sonra alacağınız hesabatın görünən formasıdır
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input ref={importFileRef} type="file" accept=".json" onChange={handleImportTemplate} className="hidden" />
          <button onClick={() => importFileRef.current?.click()} className="btn-secondary">
            <Upload size={16} />
            Şablon İmport
          </button>
          <button onClick={handleExportTemplate} className="btn-secondary">
            <FileDown size={16} />
            Şablon Eksport
          </button>
          <button onClick={() => window.print()} className="btn-ghost">
            <Printer size={16} />
            Çap et
          </button>
        </div>
      </div>

      {/* Document Preview */}
      <div
        className="report-document mx-auto max-w-4xl rounded-xl bg-white shadow-2xl"
        style={{ minHeight: '80vh' }}
      >
        {/* Document Header */}
        <div className="border-b-2 border-slate-200 px-12 py-10">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-medium text-violet-600">
                <ShieldCheck size={18} />
                Təhlükəsizlik Gap-Analiz Hesabatı
              </div>
              <h1 className="mt-3 text-3xl font-bold text-slate-900">
                {result.document_title}
              </h1>
            </div>
            <div className="text-right">
              <div
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 ${RISK_BADGE_CLASSES[
                  result.risk_level
                ].replace('text-', 'bg-').replace('/15', '/10')}`}
              >
                <span
                  className={`h-3 w-3 rounded-full ${RISK_COLORS[result.risk_level]}`}
                />
                <span className="text-sm font-bold text-slate-700">
                  {riskLabels[result.risk_level]}
                </span>
              </div>
            </div>
          </div>

          {/* Meta info */}
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Calendar size={14} className="text-slate-400" />
              <span>
                {new Date(result.completed_at || result.started_at).toLocaleString(
                  'az-AZ'
                )}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Globe size={14} className="text-slate-400" />
              <span className="uppercase">{result.detected_language}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Hash size={14} className="text-slate-400" />
              <span>
                {result.total_controls} nəzarət
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <FileStack size={14} className="text-slate-400" />
              <span>{result.gaps.length} gap</span>
            </div>
          </div>
        </div>

        {/* Executive Summary */}
        <div className="px-12 py-8">
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <FileText size={18} className="text-violet-600" />
            İcraçı Xülasə
          </h2>
          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm leading-relaxed text-slate-700 whitespace-pre-line">
              {result.executive_summary}
            </p>
          </div>
        </div>

        {/* Document Classification */}
        {result.document_classification && result.document_classification.detected_type && (
          <div className="px-12 py-4">
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
              <Tag size={18} className="text-violet-600" />
              Sənəd Klassifikasiyası (Phase 1)
            </h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-medium text-slate-500">Aşkar edilmiş növ</p>
                <p className="mt-1 text-sm font-semibold text-slate-800">
                  {result.document_classification.detected_type}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-medium text-slate-500">Tətbiq olunan standart</p>
                <p className="mt-1 text-sm font-semibold text-slate-800">
                  {result.document_classification.applicable_standard}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-medium text-slate-500">Əsas bendlər</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {result.document_classification.primary_clauses.map((clause, i) => (
                    <span key={i} className="inline-block rounded bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700">
                      {clause}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Statistics Cards */}
        <div className="px-12 py-4">
          <h2 className="text-lg font-bold text-slate-900">Statistik Xülasə</h2>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
              <div className="flex items-center justify-between">
                <CheckCircle2 size={20} className="text-emerald-600" />
                <span className="text-2xl font-bold text-emerald-700">
                  {result.compliant_count}
                </span>
              </div>
              <p className="mt-2 text-xs font-medium text-emerald-600">Uyğun</p>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-emerald-200">
                <div
                  className="h-full rounded-full bg-emerald-500"
                  style={{ width: `${compliantPct}%` }}
                />
              </div>
              <p className="mt-1 text-[10px] text-emerald-500">{compliantPct}%</p>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
              <div className="flex items-center justify-between">
                <AlertTriangle size={20} className="text-amber-600" />
                <span className="text-2xl font-bold text-amber-700">
                  {result.partial_count}
                </span>
              </div>
              <p className="mt-2 text-xs font-medium text-amber-600">Qismən</p>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-amber-200">
                <div
                  className="h-full rounded-full bg-amber-500"
                  style={{
                    width: `${
                      result.total_controls > 0
                        ? Math.round(
                            (result.partial_count / result.total_controls) * 100
                          )
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
            <div className="rounded-xl border border-red-200 bg-red-50 p-5">
              <div className="flex items-center justify-between">
                <AlertTriangle size={20} className="text-red-600" />
                <span className="text-2xl font-bold text-red-700">
                  {result.missing_count}
                </span>
              </div>
              <p className="mt-2 text-xs font-medium text-red-600">Yoxdur</p>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-red-200">
                <div
                  className="h-full rounded-full bg-red-500"
                  style={{
                    width: `${
                      result.total_controls > 0
                        ? Math.round(
                            (result.missing_count / result.total_controls) * 100
                          )
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
            <div className="rounded-xl border border-violet-200 bg-violet-50 p-5">
              <div className="flex items-center justify-between">
                <TrendingUp size={20} className="text-violet-600" />
                <span className="text-2xl font-bold text-violet-700">
                  {result.total_controls}
                </span>
              </div>
              <p className="mt-2 text-xs font-medium text-violet-600">Ümumi</p>
            </div>
          </div>
        </div>

        {/* Gap Table — grouped by source */}
        <div className="px-12 py-6">
          <h2 className="text-lg font-bold text-slate-900">Gap Detalları</h2>
          <p className="mt-1 text-sm text-slate-500">
            Hər standart üzrə nəzarət vəziyyəti
          </p>

          <div className="mt-5 space-y-6">
            {Object.entries(groupedGaps).map(([source, gaps]) => (
              <div
                key={source}
                className="overflow-hidden rounded-xl border border-slate-200"
              >
                <div className="flex items-center justify-between bg-slate-100 px-5 py-3">
                  <h3 className="text-sm font-bold text-slate-700">{source}</h3>
                  <span className="text-xs text-slate-500">
                    {gaps.filter((g) => g.status === 'compliant').length} uyğun /{' '}
                    {gaps.filter((g) => g.status === 'partial').length} qismən /{' '}
                    {gaps.filter((g) => g.status === 'missing').length} yox
                  </span>
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-2.5 text-left font-medium">
                        Nəzarət
                      </th>
                      <th className="px-4 py-2.5 text-left font-medium">Status</th>
                      <th className="px-4 py-2.5 text-left font-medium">
                        Əsaslandırma
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {gaps.map((gap, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="px-4 py-3 align-top">
                          <p className="font-medium text-slate-800">
                            {gap.control_category}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-400">
                            {gap.control_id}
                          </p>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <span
                            className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_BADGE_CLASSES[
                              gap.status
                            ].replace('/15', '/10')}`}
                          >
                            {statusLabels[gap.status]}
                          </span>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <p className="text-slate-600">
                            {gap.gap_analysis || gap.justification}
                          </p>
                          {gap.current_document_text && gap.current_document_text !== 'Text not found' && (
                            <div className="mt-2 rounded-md border border-slate-200 bg-slate-50 p-2 text-xs text-slate-600">
                              <span className="font-medium text-slate-500">Sənəddə: </span>
                              "{gap.current_document_text}"
                            </div>
                          )}
                          {gap.remediation_proposal && (
                            <div className="mt-2 flex gap-2 rounded-md border border-violet-200 bg-violet-50 p-2 text-xs text-violet-700">
                              <Wrench size={12} className="mt-0.5 flex-shrink-0" />
                              <span>
                                <span className="font-medium">Remediation: </span>
                                {gap.remediation_proposal}
                              </span>
                            </div>
                          )}
                          {gap.evidence_snippet && (
                            <>
                              <button
                                onClick={() =>
                                  setExpandedGap(
                                    expandedGap === `${source}-${idx}`
                                      ? null
                                      : `${source}-${idx}`
                                  )
                                }
                                className="mt-1 flex items-center gap-1 text-xs text-violet-600 hover:underline"
                              >
                                {expandedGap === `${source}-${idx}` ? (
                                  <>
                                    <ChevronUp size={12} /> Bağla
                                  </>
                                ) : (
                                  <>
                                    <ChevronDown size={12} /> Dəlil göstər
                                  </>
                                )}
                              </button>
                              {expandedGap === `${source}-${idx}` && (
                                <div className="mt-2 rounded-md border border-slate-200 bg-slate-100 p-3 text-xs italic text-slate-500">
                                  "{gap.evidence_snippet}"
                                  {gap.evidence_reference && (
                                    <p className="mt-1 not-italic text-slate-400">
                                      — {gap.evidence_reference}
                                    </p>
                                  )}
                                </div>
                              )}
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </div>

        {/* Recommendations */}
        <div className="px-12 py-8">
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <Lightbulb size={18} className="text-violet-600" />
            Tövsiyələr
          </h2>
          <div className="mt-4 space-y-3">
            {result.recommendations.map((rec, idx) => (
              <div
                key={idx}
                className="flex gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4"
              >
                <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-violet-100 text-sm font-bold text-violet-700">
                  {idx + 1}
                </span>
                <p className="text-sm leading-relaxed text-slate-700">{rec}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 px-12 py-6">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Reports Tool tərəfindən yaradılıb</span>
            <span>{new Date().toLocaleString('az-AZ')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
