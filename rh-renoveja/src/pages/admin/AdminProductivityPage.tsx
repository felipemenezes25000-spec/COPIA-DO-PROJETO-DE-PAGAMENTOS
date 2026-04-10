import { useCallback, useMemo, useState } from 'react';
import {
  Activity,
  CheckCircle2,
  Clock,
  DollarSign,
  Stethoscope,
  TrendingDown,
  Users,
  Zap,
} from 'lucide-react';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import { usePoll } from '../../hooks/useAdaptivePolling';
import {
  fetchDoctorRanking,
  fetchFunnel,
  fetchOverview,
  fetchSla,
} from '../../lib/productivity-api';
import {
  formatCents,
  formatInt,
  formatMinutes,
  formatPercent,
  resolvePeriod,
} from '../../lib/productivity-utils';
import type { PeriodKey } from '../../types/productivity';
import PeriodPicker from '../../components/admin/productivity/PeriodPicker';
import KpiGrid, { type KpiItem } from '../../components/admin/productivity/KpiGrid';
import FunnelChart from '../../components/admin/productivity/FunnelChart';
import SlaGauge from '../../components/admin/productivity/SlaGauge';
import DoctorRankingTable from '../../components/admin/productivity/DoctorRankingTable';

type SortKey = 'revenue' | 'volume' | 'p50';

export default function AdminProductivityPage() {
  const { user } = useAdminAuth();
  const token = user?.token;
  const [periodKey, setPeriodKey] = useState<PeriodKey>('30d');
  const [sort, setSort] = useState<SortKey>('revenue');
  const period = useMemo(() => resolvePeriod(periodKey), [periodKey]);

  // Polling mais lento aqui (agregados mudam devagar) — 30s visível, 120s idle.
  const overviewQuery = usePoll(
    useCallback(
      (signal) => fetchOverview(period.from, period.to, token, signal),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [period.from.getTime(), period.to.getTime(), token],
    ),
    { activeInterval: 30_000, idleInterval: 120_000, deps: [periodKey, token] },
  );

  const funnelQuery = usePoll(
    useCallback(
      (signal) => fetchFunnel(period.from, period.to, token, signal),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [period.from.getTime(), period.to.getTime(), token],
    ),
    { activeInterval: 30_000, idleInterval: 120_000, deps: [periodKey, token] },
  );

  const slaQuery = usePoll(
    useCallback(
      (signal) => fetchSla(period.from, period.to, token, signal),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [period.from.getTime(), period.to.getTime(), token],
    ),
    { activeInterval: 30_000, idleInterval: 120_000, deps: [periodKey, token] },
  );

  const rankingQuery = usePoll(
    useCallback(
      (signal) => fetchDoctorRanking(period.from, period.to, { sort, limit: 50 }, token, signal),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [period.from.getTime(), period.to.getTime(), sort, token],
    ),
    { activeInterval: 30_000, idleInterval: 120_000, deps: [periodKey, sort, token] },
  );

  const overview = overviewQuery.data;

  const kpiItems: KpiItem[] = useMemo(() => {
    if (!overview) {
      return [
        { label: 'Pedidos no período', value: '—', icon: Activity },
        { label: 'Concluídos', value: '—', icon: CheckCircle2 },
        { label: 'Tempo mediano p/ assinar', value: '—', icon: Clock },
        { label: 'Receita gerada', value: '—', icon: DollarSign, tone: 'success' },
        { label: 'Custo de ociosidade', value: '—', icon: TrendingDown, tone: 'danger' },
        { label: 'Médicos ativos', value: '—', icon: Users },
        { label: 'Médicos online agora', value: '—', icon: Zap, tone: 'success' },
        { label: 'Taxa de conclusão', value: '—', icon: Stethoscope },
      ];
    }
    return [
      {
        label: 'Pedidos no período',
        value: formatInt(overview.totalRequests),
        sublabel: `${formatInt(overview.completedRequests)} concluídos`,
        icon: Activity,
      },
      {
        label: 'Tempo mediano p/ assinar',
        value: formatMinutes(overview.p50MinutesToSign),
        sublabel: `p95: ${formatMinutes(overview.p95MinutesToSign)}`,
        icon: Clock,
      },
      {
        label: 'Receita gerada',
        value: formatCents(overview.revenueCents),
        sublabel: 'Soma por tipo de atendimento',
        icon: DollarSign,
        tone: 'success',
      },
      {
        label: 'Custo de ociosidade',
        value: formatCents(overview.idleCostCents),
        sublabel: 'Médicos com contrato ativo',
        icon: TrendingDown,
        tone: overview.idleCostCents > 0 ? 'danger' : 'default',
      },
      {
        label: 'Taxa de conclusão',
        value: formatPercent(overview.completionRate, 0),
        sublabel: `${formatInt(overview.rejectedByDoctor + overview.rejectedByAi)} rejeitados`,
        icon: CheckCircle2,
      },
      {
        label: 'Médicos ativos',
        value: formatInt(overview.activeDoctors),
        sublabel: `no período selecionado`,
        icon: Users,
      },
      {
        label: 'Médicos online agora',
        value: formatInt(overview.doctorsOnline),
        sublabel: 'ações nos últimos 5 min',
        icon: Zap,
        tone: 'success',
      },
      {
        label: 'Reaberturas após IA',
        value: formatInt(overview.reopenedFromAi),
        sublabel: 'IA errou, médico assumiu',
        icon: Activity,
        tone: overview.reopenedFromAi > 5 ? 'warning' : 'default',
      },
    ];
  }, [overview]);

  const anyError = overviewQuery.error || funnelQuery.error || slaQuery.error || rankingQuery.error;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Produtividade médica</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            KPIs agregados, funil de conversão, SLA e ranking por médico — atualiza a cada 30s.
          </p>
        </div>
        <PeriodPicker value={periodKey} onChange={setPeriodKey} />
      </header>

      {anyError ? (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Não foi possível carregar alguns dados de produtividade. Verifique a conexão ou tente
          recarregar a página.
        </div>
      ) : null}

      <section aria-label="KPIs agregados">
        <KpiGrid items={kpiItems} />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Funil de conversão</h2>
          {funnelQuery.data ? (
            <FunnelChart funnel={funnelQuery.data} />
          ) : (
            <div className="h-48 animate-pulse rounded bg-slate-100" />
          )}
        </div>

        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-900">SLA por prioridade</h2>
          {slaQuery.data ? (
            <>
              <SlaGauge label="Urgente" data={slaQuery.data.urgent} tone="urgent" />
              <SlaGauge label="Alta prioridade" data={slaQuery.data.high} tone="high" />
              <SlaGauge label="Normal" data={slaQuery.data.normal} tone="normal" />
            </>
          ) : (
            <div className="h-48 animate-pulse rounded bg-slate-100" />
          )}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Ranking de médicos</h2>
          <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 text-xs shadow-sm">
            {(['revenue', 'volume', 'p50'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSort(s)}
                className={[
                  'px-3 py-1.5 rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400',
                  sort === s
                    ? 'bg-primary-500 text-white'
                    : 'text-slate-600 hover:bg-slate-100',
                ].join(' ')}
                aria-pressed={sort === s}
              >
                {s === 'revenue' ? 'Receita' : s === 'volume' ? 'Volume' : 'Rapidez'}
              </button>
            ))}
          </div>
        </div>
        <DoctorRankingTable
          rows={rankingQuery.data ?? []}
          loading={rankingQuery.loading && !rankingQuery.data}
        />
      </section>
    </div>
  );
}
