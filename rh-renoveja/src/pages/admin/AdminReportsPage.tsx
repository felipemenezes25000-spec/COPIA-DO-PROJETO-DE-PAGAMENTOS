import { useMemo, useState } from 'react';
import { Download, FileSpreadsheet, Loader2 } from 'lucide-react';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import { downloadReportCsv } from '../../lib/productivity-api';
import { resolvePeriod } from '../../lib/productivity-utils';
import type { PeriodKey } from '../../types/productivity';
import PeriodPicker from '../../components/admin/productivity/PeriodPicker';

/**
 * Página de exportação de relatório consolidado. Por enquanto só CSV —
 * PDF fica na fase 2. O CSV traz 1 linha por médico com todas as colunas
 * de produtividade (ver AdminProductivityController.ExportReport).
 */
export default function AdminReportsPage() {
  const { user } = useAdminAuth();
  const token = user?.token;
  const [periodKey, setPeriodKey] = useState<PeriodKey>('30d');
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const period = useMemo(() => resolvePeriod(periodKey), [periodKey]);

  async function handleDownload() {
    if (downloading) return;
    setDownloading(true);
    setError(null);
    try {
      const blob = await downloadReportCsv(period.from, period.to, token);
      const filename = `produtividade-medica-${period.key}-${new Date().toISOString().slice(0, 10)}.csv`;
      triggerBrowserDownload(blob, filename);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Falha ao gerar o relatório.';
      setError(msg);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <h1 className="text-xl font-semibold text-slate-900">Relatórios</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          Exportação consolidada da produtividade médica no período selecionado.
        </p>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-emerald-50">
            <FileSpreadsheet size={22} className="text-emerald-600" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-slate-900">
              Relatório consolidado (CSV)
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Uma linha por médico com: pedidos atendidos, assinados, em lote, p50/p95,
              receita gerada, custo de ociosidade, utilização e última atividade.
              Abre direto no Excel / LibreOffice.
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <PeriodPicker value={periodKey} onChange={setPeriodKey} />
              <button
                type="button"
                onClick={handleDownload}
                disabled={downloading}
                className="inline-flex items-center gap-2 rounded-lg bg-primary-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {downloading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Gerando…
                  </>
                ) : (
                  <>
                    <Download size={16} />
                    Baixar CSV
                  </>
                )}
              </button>
            </div>

            {error ? (
              <p role="alert" className="mt-3 text-sm text-red-600">
                {error}
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-slate-50 p-6">
        <h2 className="mb-2 text-sm font-semibold text-slate-900">Sobre este relatório</h2>
        <ul className="list-disc space-y-1 pl-5 text-xs text-slate-600">
          <li>
            Valores monetários estão em <strong>centavos</strong> para precisão — divida por 100
            para obter reais.
          </li>
          <li>
            <strong>Custo de ociosidade</strong> só é calculado para médicos com contrato ativo
            cadastrado em <code>Precificação</code>.
          </li>
          <li>
            <strong>Assinatura em lote</strong> é o percentual dos assinados que foram processados
            via <em>batch sign</em> (meta ideal ≥ 50%).
          </li>
          <li>
            O relatório é gerado sob demanda — nada é agendado ou persistido em disco.
          </li>
        </ul>
      </section>
    </div>
  );
}

function triggerBrowserDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Revoke após o download ter começado (setTimeout evita revogar antes do browser processar)
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
