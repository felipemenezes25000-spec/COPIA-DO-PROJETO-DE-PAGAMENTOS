import { useCallback, useMemo, useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Clock, DollarSign, Activity, TrendingDown, Signature } from 'lucide-react';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import { usePoll } from '../../hooks/useAdaptivePolling';
import { fetchContractByDoctor, fetchDoctorDetail } from '../../lib/productivity-api';
import {
  formatCents,
  formatDateTime,
  formatInt,
  formatMinutes,
  formatPercent,
  resolvePeriod,
  statusLabel,
  requestTypeLabel,
} from '../../lib/productivity-utils';
import type { DoctorContractDto, PeriodKey } from '../../types/productivity';
import PeriodPicker from '../../components/admin/productivity/PeriodPicker';
import KpiGrid, { type KpiItem } from '../../components/admin/productivity/KpiGrid';
import Heatmap from '../../components/admin/productivity/Heatmap';
import FunnelChart from '../../components/admin/productivity/FunnelChart';

export default function AdminDoctorProductivityPage() {
  const { doctorProfileId = '' } = useParams<{ doctorProfileId: string }>();
  const { user } = useAdminAuth();
  const token = user?.token;
  const [periodKey, setPeriodKey] = useState<PeriodKey>('30d');
  const period = useMemo(() => resolvePeriod(periodKey), [periodKey]);

  const [contract, setContract] = useState<DoctorContractDto | null>(null);

  // Contrato é uma busca one-shot, sem polling — muda raramente.
  useEffect(() => {
    if (!doctorProfileId || !token) return;
    let cancelled = false;
    fetchContractByDoctor(doctorProfileId, token)
      .then((c) => {
        if (!cancelled) setContract(c);
      })
      .catch(() => {
        // ignora — contrato é opcional
      });
    return () => {
      cancelled = true;
    };
  }, [doctorProfileId, token]);

  const detailQuery = usePoll(
    useCallback(
      (signal) => fetchDoctorDetail(doctorProfileId, period.from, period.to, token, signal),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [doctorProfileId, period.from.getTime(), period.to.getTime(), token],
    ),
    { activeInterval: 30_000, idleInterval: 120_000, deps: [doctorProfileId, periodKey, token] },
  );

  const detail = detailQuery.data;
  const summary = detail?.summary;

  const kpiItems: KpiItem[] = useMemo(() => {
    if (!summary) {
      return [
        { label: 'Pedidos atendidos', value: '—', icon: Activity },
        { label: 'Assinados', value: '—', icon: Signature },
        { label: 'Receita gerada', value: '—', icon: DollarSign, tone: 'success' },
        { label: 'Custo de ociosidade', value: '—', icon: TrendingDown },
        { label: 'Tempo mediano p/ assinar', value: '—', icon: Clock },
        { label: 'Utilização', value: '—', icon: Activity },
        { label: 'Assinatura em lote', value: '—', icon: Signature },
      ];
    }
    return [
      {
        label: 'Pedidos atendidos',
        value: formatInt(summary.requestsHandled),
        sublabel: `${formatInt(summary.reviewed)} revisados`,
        icon: Activity,
      },
      {
        label: 'Assinados',
        value: formatInt(summary.signed),
        sublabel: `${formatInt(summary.batchSigned)} em lote`,
        icon: Signature,
      },
      {
        label: 'Receita gerada',
        value: formatCents(summary.revenueCents),
        sublabel: 'No período',
        icon: DollarSign,
        tone: 'success',
      },
      {
        label: 'Custo de ociosidade',
        value: contract ? formatCents(summary.idleCostCents) : 'Sem contrato',
        sublabel: contract
          ? `${contract.hoursPerMonth}h/mês @ ${formatCents(contract.hourlyRateCents)}/h`
          : 'Cadastre contrato p/ calcular',
        icon: TrendingDown,
        tone: summary.idleCostCents > 0 ? 'danger' : 'default',
      },
      {
        label: 'Tempo mediano p/ assinar',
        value: formatMinutes(summary.p50MinutesToSign),
        sublabel: `p95: ${formatMinutes(summary.p95MinutesToSign)}`,
        icon: Clock,
      },
      {
        label: 'Utilização',
        value: summary.utilizationRate !== null ? formatPercent(summary.utilizationRate, 0) : 'N/A',
        sublabel: contract ? 'vs. contrato' : 'sem contrato',
        icon: Activity,
      },
      {
        label: 'Assinatura em lote',
        value: formatPercent(summary.batchSignRate, 0),
        sublabel: `${formatInt(summary.batchSigned)} / ${formatInt(summary.signed)}`,
        icon: Signature,
        tone: summary.batchSignRate >= 0.5 ? 'success' : summary.batchSignRate >= 0.2 ? 'default' : 'warning',
      },
      {
        label: 'Última atividade',
        value: summary.lastActivityAt ? formatDateTime(summary.lastActivityAt) : 'Nunca',
        icon: Clock,
      },
    ];
  }, [summary, contract]);

  if (!doctorProfileId) {
    return <p className="text-sm text-slate-500">Médico não especificado.</p>;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            to="/admin/produtividade"
            className="rounded-md p-2 text-slate-500 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
            aria-label="Voltar para produtividade"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-xl font-semibold text-slate-900">
              {summary?.name ?? 'Carregando…'}
            </h1>
            <p className="text-sm text-slate-500">{summary?.specialty ?? ''}</p>
          </div>
        </div>
        <PeriodPicker value={periodKey} onChange={setPeriodKey} />
      </header>

      {detailQuery.error ? (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Erro ao carregar dados do médico.
        </div>
      ) : null}

      <section>
        <KpiGrid items={kpiItems} />
      </section>

      <section className="grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Atividade por dia × hora</h2>
          {detail ? (
            <Heatmap cells={detail.heatmap} />
          ) : (
            <div className="h-40 animate-pulse rounded bg-slate-100" />
          )}
        </div>

        <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Funil do médico</h2>
          {detail ? (
            <FunnelChart funnel={detail.funnel} />
          ) : (
            <div className="h-40 animate-pulse rounded bg-slate-100" />
          )}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Receita por tipo de atendimento</h2>
        {detail && detail.revenueByProduct.length > 0 ? (
          <ul className="divide-y divide-slate-100 text-sm">
            {detail.revenueByProduct.map((b) => (
              <li key={b.productKey} className="flex items-center justify-between py-2">
                <div>
                  <span className="font-medium text-slate-900">{b.label}</span>
                  <span className="ml-2 text-xs text-slate-500">
                    {b.quantity}× @ {formatCents(b.unitPriceCents)}
                  </span>
                </div>
                <span className="font-semibold text-emerald-700 tabular-nums">
                  {formatCents(b.totalCents)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">Sem receita registrada neste período.</p>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Últimos pedidos atendidos</h2>
        {detail && detail.recentTimeline.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-2 py-2 text-left">Código</th>
                  <th className="px-2 py-2 text-left">Tipo</th>
                  <th className="px-2 py-2 text-left">Status</th>
                  <th className="px-2 py-2 text-right">Criado</th>
                  <th className="px-2 py-2 text-right">Revisado</th>
                  <th className="px-2 py-2 text-right">Assinado</th>
                  <th className="px-2 py-2 text-right">Tempo total</th>
                  <th className="px-2 py-2 text-right">Receita</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {detail.recentTimeline.map((item) => (
                  <tr key={item.requestId}>
                    <td className="px-2 py-1.5 font-mono text-[11px]">{item.shortCode || '—'}</td>
                    <td className="px-2 py-1.5">{requestTypeLabel(item.requestType)}</td>
                    <td className="px-2 py-1.5">{statusLabel(item.status)}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums">
                      {formatDateTime(item.createdAt)}
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums">
                      {item.reviewedAt ? formatDateTime(item.reviewedAt) : '—'}
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums">
                      {item.signedAt ? formatDateTime(item.signedAt) : '—'}
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums">
                      {formatMinutes(item.minutesCreatedToSigned)}
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums text-emerald-700">
                      {item.productRevenueCents > 0 ? formatCents(item.productRevenueCents) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-slate-500">Sem pedidos atendidos no período.</p>
        )}
      </section>
    </div>
  );
}
