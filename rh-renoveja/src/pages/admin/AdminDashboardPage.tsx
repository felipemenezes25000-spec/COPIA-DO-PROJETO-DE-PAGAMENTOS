import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  Clock,
  CalendarCheck,
  CheckCircle,
  XCircle,
  TrendingUp,
  Percent,
  MapPin,
  BarChart3,
  Stethoscope,
} from 'lucide-react';
import {
  fetchAnalytics,
  fetchCandidates,
  fetchAIStats,
  RateLimitError,
} from '../../lib/admin-api';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import type { DashboardAnalytics, AdminCandidate } from '../../types/admin';

import KPICard from '../../components/admin/dashboard/KPICard';
import DonutChart from '../../components/admin/dashboard/DonutChart';
import BarChart from '../../components/admin/dashboard/BarChart';
import HorizontalBar from '../../components/admin/dashboard/HorizontalBar';
import ProgressRing from '../../components/admin/dashboard/ProgressRing';
import RecentCandidatesTable from '../../components/admin/dashboard/RecentCandidatesTable';
import AIInsightsSection, {
  type AIStatsData,
} from '../../components/admin/dashboard/AIInsightsSection';
import DashboardSkeleton from '../../components/admin/dashboard/DashboardSkeleton';
import DashboardHeader from '../../components/admin/dashboard/DashboardHeader';
import AttentionStrip from '../../components/admin/dashboard/AttentionStrip';
import FunnelChart from '../../components/admin/dashboard/FunnelChart';

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/**
 * Given a list of candidates, build the "cadastros por semana" series from
 * `createdAt`. The backend's `fetchAnalytics` returns this field empty
 * (not computed on the server), so the dashboard derives it on the client.
 *
 * Returns the last 8 ISO weeks ending on the current week, oldest → newest,
 * with a short label ("dd/MM") matching the Monday that starts each bucket.
 */
function computePorSemana(
  candidates: AdminCandidate[],
): { label: string; value: number }[] {
  const WEEKS = 8;
  const MS_PER_DAY = 24 * 60 * 60 * 1000;

  // Anchor on the Monday of the current week (UTC) to avoid tz drift.
  const now = new Date();
  const nowUtc = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const dayOfWeek = nowUtc.getUTCDay(); // 0 = Sun
  const daysSinceMonday = (dayOfWeek + 6) % 7;
  const currentMonday = new Date(nowUtc.getTime() - daysSinceMonday * MS_PER_DAY);

  const buckets: { start: Date; label: string; value: number }[] = [];
  for (let i = WEEKS - 1; i >= 0; i--) {
    const start = new Date(currentMonday.getTime() - i * 7 * MS_PER_DAY);
    const label = start.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      timeZone: 'UTC',
    });
    buckets.push({ start, label, value: 0 });
  }

  const oldest = buckets[0].start.getTime();
  for (const c of candidates) {
    if (!c.createdAt) continue;
    const t = new Date(c.createdAt).getTime();
    if (Number.isNaN(t) || t < oldest) continue;
    const diffDays = Math.floor((t - oldest) / MS_PER_DAY);
    const idx = Math.floor(diffDays / 7);
    if (idx >= 0 && idx < buckets.length) buckets[idx].value += 1;
  }

  return buckets.map(({ label, value }) => ({ label, value }));
}

/**
 * Build per-status weekly trend data for the KPI sparklines.
 *
 * For each candidate we know `createdAt` (the only timestamp available
 * for a candidate's "creation" in pendente). We can't reconstruct the
 * full history of status changes without a backend audit log, so we
 * approximate:
 *
 *   - `total`      → bucketed `createdAt` over the last 8 weeks.
 *   - `pendentes`  → candidates currently pendentes, bucketed by createdAt.
 *   - `analise`    → currently em_analise, bucketed by updatedAt (falls back to createdAt).
 *   - `aprovados`  → currently aprovados, bucketed by updatedAt.
 *   - `rejeitados` → currently rejeitados, bucketed by updatedAt.
 *
 * This is visibly "directional" (the sparkline reflects when those
 * candidates entered or landed in their current status) rather than a
 * perfectly reconstructed time series, and it's labeled as such in
 * the card description. Good enough for the at-a-glance trend.
 */
function bucketByDate(
  candidates: AdminCandidate[],
  getIso: (c: AdminCandidate) => string | undefined,
): number[] {
  const WEEKS = 8;
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  const now = new Date();
  const nowUtc = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const dayOfWeek = nowUtc.getUTCDay();
  const daysSinceMonday = (dayOfWeek + 6) % 7;
  const currentMonday = new Date(nowUtc.getTime() - daysSinceMonday * MS_PER_DAY);

  const buckets: number[] = Array(WEEKS).fill(0);
  const oldest = currentMonday.getTime() - (WEEKS - 1) * 7 * MS_PER_DAY;

  for (const c of candidates) {
    const iso = getIso(c);
    if (!iso) continue;
    const t = new Date(iso).getTime();
    if (Number.isNaN(t) || t < oldest) continue;
    const diffDays = Math.floor((t - oldest) / MS_PER_DAY);
    const idx = Math.floor(diffDays / 7);
    if (idx >= 0 && idx < buckets.length) buckets[idx] += 1;
  }
  return buckets;
}

/**
 * Split a weekly bucket series into "previous weeks" and "current week"
 * so we can compute the delta shown on KPI cards. We use the last bucket
 * as the current week and the one before it as the comparison baseline.
 */
function weekDelta(buckets: number[]): { current: number; previous: number } {
  if (buckets.length < 2) return { current: buckets[buckets.length - 1] ?? 0, previous: 0 };
  return {
    current: buckets[buckets.length - 1],
    previous: buckets[buckets.length - 2],
  };
}

/* ------------------------------------------------------------------ */
/* Dashboard Page                                                      */
/* ------------------------------------------------------------------ */

export default function AdminDashboardPage() {
  const { token, user } = useAdminAuth();
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [candidates, setCandidates] = useState<AdminCandidate[]>([]);
  const [aiStats, setAIStats] = useState<AIStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    // No token = AdminLayout will already be redirecting to /admin/login.
    // Skip the load entirely instead of firing unauthenticated requests.
    if (!token) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        // Fetch the candidate list ONCE and reuse it for analytics + AI stats.
        // Previously this useEffect issued ~5 parallel requests to the same
        // endpoint per mount because both fetchAnalytics and fetchAIStats
        // internally re-fetched fetchCandidates. Combined with the missing
        // try/catch below, that turned a single 401/429 into a stuck page
        // with hundreds of unhandled promise rejections.
        const list = await fetchCandidates(undefined, token);
        if (cancelled) return;

        const [a, ai] = await Promise.all([
          fetchAnalytics(token, list),
          fetchAIStats(token, list),
        ]);
        if (cancelled) return;

        setCandidates(list);
        setAnalytics(a);
        setAIStats(ai);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof RateLimitError) {
          setError(
            'Muitas requisições ao servidor. Aguarde alguns segundos e recarregue a página.',
          );
        } else {
          // 401 is handled globally by AdminAuthContext (logout + redirect).
          // For everything else, show a generic message instead of leaving
          // the user staring at a perpetual skeleton.
          setError('Falha ao carregar o dashboard. Tente novamente em instantes.');
        }
        console.error('AdminDashboardPage load failed', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [token, reloadKey]);

  const handleRefresh = useCallback(() => {
    setReloadKey((k) => k + 1);
  }, []);

  // Client-side-computed "cadastros por semana". The backend returns an
  // empty list for this field — candidates[].createdAt is the ground truth.
  const porSemana = useMemo(() => computePorSemana(candidates), [candidates]);

  // Per-KPI weekly trend series. See `bucketByDate` comment for the
  // approximation rationale. The deltas use the last two weeks only.
  const trends = useMemo(() => {
    const totalBuckets = bucketByDate(candidates, (c) => c.createdAt);
    const pendentesBuckets = bucketByDate(
      candidates.filter((c) => c.status === 'pendente'),
      (c) => c.createdAt,
    );
    const analiseBuckets = bucketByDate(
      candidates.filter((c) => c.status === 'em_analise'),
      (c) => c.updatedAt || c.createdAt,
    );
    const aprovadosBuckets = bucketByDate(
      candidates.filter((c) => c.status === 'aprovado'),
      (c) => c.updatedAt || c.createdAt,
    );
    const rejeitadosBuckets = bucketByDate(
      candidates.filter((c) => c.status === 'rejeitado'),
      (c) => c.updatedAt || c.createdAt,
    );
    return {
      total: {
        series: totalBuckets,
        delta: weekDelta(totalBuckets),
      },
      pendentes: {
        series: pendentesBuckets,
        delta: weekDelta(pendentesBuckets),
      },
      analise: {
        series: analiseBuckets,
        delta: weekDelta(analiseBuckets),
      },
      aprovados: {
        series: aprovadosBuckets,
        delta: weekDelta(aprovadosBuckets),
      },
      rejeitados: {
        series: rejeitadosBuckets,
        delta: weekDelta(rejeitadosBuckets),
      },
    };
  }, [candidates]);

  const analyzedCount = useMemo(
    () => candidates.filter((c) => c.aiAnalysis).length,
    [candidates],
  );

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <p className="text-slate-700 font-medium mb-2">{error}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-2 px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
        >
          Recarregar
        </button>
      </div>
    );
  }

  if (loading || !analytics) {
    return <DashboardSkeleton />;
  }

  const { stats } = analytics;
  const recent = candidates.slice(0, 6);
  const displayName = user?.nome?.trim() || user?.email?.split('@')[0] || 'admin';

  // Global empty state — the whole pipeline has zero candidates.
  if (stats.total === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-6"
      >
        <DashboardHeader
          adminName={displayName}
          total={0}
          analyzedCount={0}
          onRefresh={handleRefresh}
          refreshing={loading}
        />
        <section
          role="region"
          aria-label="Estado vazio"
          className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 flex flex-col items-center justify-center text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
            <Users size={28} className="text-slate-400" aria-hidden="true" />
          </div>
          <h3 className="text-lg font-semibold text-slate-700 mb-1">
            Ainda sem candidatos cadastrados
          </h3>
          <p className="text-sm text-slate-500 max-w-md">
            Assim que um profissional concluir a inscrição pelo app RenoveJá,
            ele aparecerá aqui com status, score de IA e dados de análise.
          </p>
        </section>
      </motion.div>
    );
  }

  const statusDonut = [
    { label: 'Pendentes', value: stats.pendentes, color: '#F59E0B' },
    { label: 'Em análise', value: stats.emAnalise, color: '#0EA5E9' },
    { label: 'Entrevista', value: stats.entrevista, color: '#A855F7' },
    { label: 'Aprovados', value: stats.aprovados, color: '#22C55E' },
    { label: 'Rejeitados', value: stats.rejeitados, color: '#EF4444' },
  ];

  const decided = stats.aprovados + stats.rejeitados;
  const rejeicaoHint = `Sobre ${decided} candidato${decided === 1 ? '' : 's'} decidido${decided === 1 ? '' : 's'} (aprovados + rejeitados). Não considera pendentes ou em análise.`;
  const aprovacaoHint = `Sobre ${decided} candidato${decided === 1 ? '' : 's'} decidido${decided === 1 ? '' : 's'} (aprovados + rejeitados).`;

  // Normalize backend shapes into the generic { label, value } used by the
  // chart components.
  const estadoBars = analytics.porEstado.map((e) => ({
    label: e.estado || '—',
    value: e.total,
  }));
  const especialidadeBars = analytics.topEspecialidades.map((e) => ({
    label: e.especialidade || '—',
    value: e.total,
  }));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Rich header */}
      <DashboardHeader
        adminName={displayName}
        total={stats.total}
        analyzedCount={analyzedCount}
        onRefresh={handleRefresh}
        refreshing={loading}
      />

      {/* Attention strip — surfaces stale candidates + hot leads */}
      <AttentionStrip candidates={candidates} />

      {/* KPI row — funnel by status.
          NOTE: category KPIs (Enfermeiros/Dentistas/Psicólogos/Nutricionistas)
          and "Com telemedicina" KPI were removed because the backend currently
          only returns medical doctors and does not collect telemedicine
          experience. Keeping those cards at 0 in production was misleading. */}
      <section
        role="region"
        aria-label="Indicadores principais"
        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4"
      >
        <KPICard
          icon={Users}
          label="Total"
          value={stats.total}
          color="text-slate-800"
          bg="bg-slate-100"
          trend={trends.total.series}
          trendColor="#64748B"
          delta={{
            current: trends.total.delta.current,
            previous: trends.total.delta.previous,
            polarity: 'positive',
            suffix: 'vs sem. passada',
          }}
          highlighted
        />
        <KPICard
          icon={Clock}
          label="Pendentes"
          value={stats.pendentes}
          color="text-amber-600"
          bg="bg-amber-50"
          trend={trends.pendentes.series}
          trendColor="#F59E0B"
          delta={{
            current: trends.pendentes.delta.current,
            previous: trends.pendentes.delta.previous,
            polarity: 'negative',
            suffix: 'vs sem. passada',
          }}
        />
        <KPICard
          icon={CalendarCheck}
          label="Em análise"
          value={stats.emAnalise}
          color="text-sky-600"
          bg="bg-sky-50"
          trend={trends.analise.series}
          trendColor="#0EA5E9"
          delta={{
            current: trends.analise.delta.current,
            previous: trends.analise.delta.previous,
            polarity: 'neutral',
            suffix: 'vs sem. passada',
          }}
        />
        <KPICard
          icon={CheckCircle}
          label="Aprovados"
          value={stats.aprovados}
          color="text-emerald-600"
          bg="bg-emerald-50"
          trend={trends.aprovados.series}
          trendColor="#22C55E"
          delta={{
            current: trends.aprovados.delta.current,
            previous: trends.aprovados.delta.previous,
            polarity: 'positive',
            suffix: 'vs sem. passada',
          }}
        />
        <KPICard
          icon={XCircle}
          label="Rejeitados"
          value={stats.rejeitados}
          color="text-red-600"
          bg="bg-red-50"
          trend={trends.rejeitados.series}
          trendColor="#EF4444"
          delta={{
            current: trends.rejeitados.delta.current,
            previous: trends.rejeitados.delta.previous,
            polarity: 'negative',
            suffix: 'vs sem. passada',
          }}
        />
      </section>

      {/* Funnel (2/3 width) + Key indicators (1/3 width) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <FunnelChart stats={stats} />
        </div>

        <section
          role="region"
          aria-label="Indicadores-chave"
          className="bg-white rounded-2xl border border-slate-200 p-6 shadow-card"
        >
          <h3 className="font-display font-bold text-slate-900 text-base mb-5 flex items-center gap-2">
            <span
              aria-hidden="true"
              className="inline-block w-1 h-5 rounded-full bg-gradient-to-b from-emerald-400 to-teal-600"
            />
            <Percent size={14} className="text-slate-400" aria-hidden="true" />
            Indicadores-chave
          </h3>
          <div className="flex items-center justify-around flex-wrap gap-4">
            <ProgressRing
              value={analytics.taxaAprovacao}
              label="Taxa aprovação"
              color="#22C55E"
              hint={aprovacaoHint}
            />
            <ProgressRing
              value={analytics.taxaRejeicao}
              label="Taxa rejeição"
              color="#EF4444"
              hint={rejeicaoHint}
            />
          </div>
          <div className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-display font-bold text-slate-800 tabular-nums">
                {analytics.mediaIdade || '—'}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">Idade média</p>
            </div>
            <div>
              <p className="text-2xl font-display font-bold text-slate-800 tabular-nums">
                {stats.entrevista}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">Entrevistas</p>
            </div>
            <div title={`Base de cálculo: ${decided} decididos`}>
              <p className="text-2xl font-display font-bold text-slate-800 tabular-nums">
                {decided}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">Decididos</p>
            </div>
          </div>
        </section>
      </div>

      {/* Charts row: Status donut + Timeline bar chart.
          "Anos de experiência" foi removido: o cadastro do app não coleta esse
          campo, então o card ficava permanentemente vazio em produção. */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section
          role="region"
          aria-label="Distribuição por status"
          className="bg-white rounded-2xl border border-slate-200 p-6 shadow-card"
        >
          <h3 className="font-display font-bold text-slate-900 text-base mb-5 flex items-center gap-2">
            <span
              aria-hidden="true"
              className="inline-block w-1 h-5 rounded-full bg-gradient-to-b from-sky-400 to-sky-700"
            />
            <BarChart3 size={14} className="text-slate-400" aria-hidden="true" />
            Distribuição por status
          </h3>
          <DonutChart segments={statusDonut} ariaLabel="Candidatos por status" />
        </section>

        <section
          role="region"
          aria-label="Cadastros por semana"
          className="bg-white rounded-2xl border border-slate-200 p-6 shadow-card"
        >
          <h3 className="font-display font-bold text-slate-900 text-base mb-5 flex items-center gap-2">
            <span
              aria-hidden="true"
              className="inline-block w-1 h-5 rounded-full bg-gradient-to-b from-primary-400 to-primary-700"
            />
            <TrendingUp size={14} className="text-slate-400" aria-hidden="true" />
            Cadastros por semana
          </h3>
          <BarChart data={porSemana} color="bg-primary-500" />
          <p className="text-[11px] text-slate-400 mt-3">
            Últimas 8 semanas — baseado na data de inscrição do candidato.
          </p>
        </section>

        {estadoBars.length > 0 && (
          <section
            role="region"
            aria-label="Top estados"
            className="bg-white rounded-2xl border border-slate-200 p-6 shadow-card"
          >
            <h3 className="font-display font-bold text-slate-900 text-base mb-5 flex items-center gap-2">
              <span
                aria-hidden="true"
                className="inline-block w-1 h-5 rounded-full bg-gradient-to-b from-sky-400 to-blue-700"
              />
              <MapPin size={14} className="text-slate-400" aria-hidden="true" />
              Top estados
            </h3>
            <HorizontalBar data={estadoBars} color="bg-sky-500" />
          </section>
        )}

        {especialidadeBars.length > 0 && (
          <section
            role="region"
            aria-label="Top especialidades"
            className={[
              'bg-white rounded-2xl border border-slate-200 p-6 shadow-card',
              estadoBars.length > 0 ? '' : 'lg:col-span-2',
            ].join(' ')}
          >
            <h3 className="font-display font-bold text-slate-900 text-base mb-5 flex items-center gap-2">
              <span
                aria-hidden="true"
                className="inline-block w-1 h-5 rounded-full bg-gradient-to-b from-emerald-400 to-teal-600"
              />
              <Stethoscope size={14} className="text-slate-400" aria-hidden="true" />
              Top especialidades
            </h3>
            <HorizontalBar data={especialidadeBars} color="bg-emerald-500" />
          </section>
        )}
      </div>

      {/* AI Intelligence Section */}
      {aiStats && <AIInsightsSection aiStats={aiStats} />}

      {/* Recent candidates table */}
      <RecentCandidatesTable candidates={recent} />
    </motion.div>
  );
}
