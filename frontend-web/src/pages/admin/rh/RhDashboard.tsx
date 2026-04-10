/**
 * RhDashboard — Página de visão executiva do Portal RH.
 *
 * Consome os serviços mock de `@/services/rhApi` via TanStack Query
 * (singleton local, pois não há QueryClientProvider raiz). Os gráficos
 * são feitos em SVG puro — zero dependências novas.
 */

import { useMemo, useState, type ReactNode } from 'react';
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Users,
  TrendingDown,
  Wallet,
  UserPlus,
  CalendarX2,
  Clock,
  Briefcase,
  Smile,
  Download,
  ChevronRight,
  Cake,
} from 'lucide-react';
import { format, addDays, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { RhLayout } from '@/components/admin/rh/RhLayout';
import { AiInsightsPanel } from '@/components/admin/ai/AiInsightsPanel';
import { AiMiniSparkline } from '@/components/admin/ai/AiMiniSparkline';
import { AiForecastChart } from '@/components/admin/ai/AiForecastChart';
import { AiSuggestionBanner } from '@/components/admin/ai/AiSuggestionBanner';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

import {
  getRhKpis,
  listColaboradores,
  listDepartamentos,
  listVagas,
  listFerias,
  getFolha,
} from '@/services/rhApi';
import type {
  RhKpi,
  Colaborador,
  Departamento,
  Vaga,
  SolicitacaoFerias,
  FolhaPagamento,
  CandidatoEtapa,
} from '@/types/rh';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/* QueryClient singleton local                                         */
/* ------------------------------------------------------------------ */

let localQueryClient: QueryClient | null = null;
function getLocalQueryClient(): QueryClient {
  if (!localQueryClient) {
    localQueryClient = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 60 * 1000,
          refetchOnWindowFocus: false,
          retry: 1,
        },
      },
    });
  }
  return localQueryClient;
}

/* ------------------------------------------------------------------ */
/* Helpers de formatação                                               */
/* ------------------------------------------------------------------ */

const brl = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
});
const intFmt = new Intl.NumberFormat('pt-BR');
const pctFmt = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

type KpiFormat = 'int' | 'currency' | 'percent';

function formatKpiValue(value: number, format: KpiFormat): string {
  if (format === 'currency') return brl.format(value);
  if (format === 'percent') return `${pctFmt.format(value)}%`;
  return intFmt.format(value);
}

function inferKpiFormat(label: string): KpiFormat {
  const l = label.toLowerCase();
  if (l.includes('custo') || l.includes('folha') || l.includes('r$'))
    return 'currency';
  if (l.includes('%') || l.includes('turnover') || l.includes('ausenteísmo'))
    return 'percent';
  return 'int';
}

function getInitials(nome: string): string {
  const parts = nome.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase();
}

/* ------------------------------------------------------------------ */
/* Animação framer-motion                                              */
/* ------------------------------------------------------------------ */

function sectionVariants(index: number) {
  return {
    initial: { opacity: 0, y: 16 },
    animate: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.35,
        delay: index * 0.05,
        ease: 'easeOut' as const,
      },
    },
  };
}

/* ------------------------------------------------------------------ */
/* Tipos auxiliares                                                    */
/* ------------------------------------------------------------------ */

interface KpiCardConfig {
  icon: typeof Users;
  gradient: string;
  format: KpiFormat;
}

const PRIMARY_KPI_CONFIGS: KpiCardConfig[] = [
  { icon: Users, gradient: 'from-sky-500 to-indigo-500', format: 'int' },
  {
    icon: TrendingDown,
    gradient: 'from-rose-500 to-pink-500',
    format: 'percent',
  },
  {
    icon: Wallet,
    gradient: 'from-emerald-500 to-teal-500',
    format: 'currency',
  },
  { icon: UserPlus, gradient: 'from-amber-500 to-orange-500', format: 'int' },
];

const SECONDARY_KPI_CONFIGS: KpiCardConfig[] = [
  {
    icon: CalendarX2,
    gradient: 'from-fuchsia-500 to-purple-500',
    format: 'percent',
  },
  { icon: Clock, gradient: 'from-blue-500 to-cyan-500', format: 'int' },
  { icon: Briefcase, gradient: 'from-lime-500 to-green-500', format: 'int' },
  { icon: Smile, gradient: 'from-yellow-500 to-amber-500', format: 'int' },
];

/* ------------------------------------------------------------------ */
/* Subcomponentes — KPI cards                                          */
/* ------------------------------------------------------------------ */

interface KpiCardProps {
  kpi: RhKpi;
  config: KpiCardConfig;
  index: number;
  compact?: boolean;
}

function PrimaryKpiCard({ kpi, config, index }: KpiCardProps) {
  const Icon = config.icon;
  const format: KpiFormat = config.format ?? inferKpiFormat(kpi.label);
  const deltaPositive = kpi.delta > 0;
  const deltaNeutral = kpi.delta === 0;
  const deltaColor = deltaNeutral
    ? 'text-muted-foreground'
    : deltaPositive
      ? 'text-emerald-600 dark:text-emerald-400'
      : 'text-rose-600 dark:text-rose-400';
  return (
    <motion.div
      variants={sectionVariants(index)}
      initial="initial"
      animate="animate"
    >
      <Card className="overflow-hidden">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {kpi.label}
              </p>
              <p className="mt-2 text-3xl font-bold tracking-tight text-foreground">
                {formatKpiValue(kpi.valor, format)}
              </p>
              <p className={cn('mt-1 text-xs font-medium', deltaColor)}>
                {deltaPositive ? '+' : ''}
                {pctFmt.format(kpi.delta)}% vs. mês anterior
              </p>
            </div>
            <div
              className={cn(
                'flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-white shadow-sm',
                config.gradient
              )}
            >
              <Icon className="h-6 w-6" aria-hidden />
            </div>
          </div>
          <div className="mt-4 h-10">
            <AiMiniSparkline data={kpi.sparkline} />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function SecondaryKpiCard({ kpi, config, index }: KpiCardProps) {
  const Icon = config.icon;
  const format: KpiFormat = config.format ?? inferKpiFormat(kpi.label);
  const deltaPositive = kpi.delta > 0;
  const deltaNeutral = kpi.delta === 0;
  const deltaColor = deltaNeutral
    ? 'text-muted-foreground'
    : deltaPositive
      ? 'text-emerald-600 dark:text-emerald-400'
      : 'text-rose-600 dark:text-rose-400';
  return (
    <motion.div
      variants={sectionVariants(index)}
      initial="initial"
      animate="animate"
    >
      <Card>
        <CardContent className="flex items-center gap-3 p-4">
          <div
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-white',
              config.gradient
            )}
          >
            <Icon className="h-4 w-4" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {kpi.label}
            </p>
            <p className="text-lg font-semibold text-foreground">
              {formatKpiValue(kpi.valor, format)}
            </p>
          </div>
          <span className={cn('text-xs font-medium', deltaColor)}>
            {deltaPositive ? '+' : ''}
            {pctFmt.format(kpi.delta)}%
          </span>
        </CardContent>
      </Card>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Subcomponente — Headcount por departamento                          */
/* ------------------------------------------------------------------ */

function DepartamentosCard({
  departamentos,
}: {
  departamentos: Departamento[];
}) {
  const total = departamentos.reduce((acc, d) => acc + d.headcount, 0);
  const sorted = [...departamentos].sort((a, b) => b.headcount - a.headcount);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base">Headcount por departamento</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {sorted.map((dep, i) => {
          const pct = total > 0 ? Math.round((dep.headcount / total) * 100) : 0;
          return (
            <motion.div
              key={dep.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
            >
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="truncate font-medium text-foreground">
                  {dep.nome}
                </span>
                <span className="text-muted-foreground">
                  {dep.headcount} ({pct}%)
                </span>
              </div>
              <Progress value={pct} className="h-2" />
            </motion.div>
          );
        })}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Subcomponente — Evolução headcount (line chart SVG)                 */
/* ------------------------------------------------------------------ */

const HEADCOUNT_HISTORY: Array<{ mes: string; valor: number }> = [
  { mes: 'Mai', valor: 40 },
  { mes: 'Jun', valor: 41 },
  { mes: 'Jul', valor: 40 },
  { mes: 'Ago', valor: 42 },
  { mes: 'Set', valor: 42 },
  { mes: 'Out', valor: 43 },
  { mes: 'Nov', valor: 44 },
  { mes: 'Dez', valor: 43 },
  { mes: 'Jan', valor: 44 },
  { mes: 'Fev', valor: 45 },
  { mes: 'Mar', valor: 45 },
  { mes: 'Abr', valor: 46 },
];

function HeadcountEvolucaoCard() {
  const width = 320;
  const height = 140;
  const padding = { top: 10, right: 8, bottom: 20, left: 24 };
  const data = HEADCOUNT_HISTORY;
  const max = Math.max(...data.map((d) => d.valor));
  const min = Math.min(...data.map((d) => d.valor));
  const range = max - min || 1;
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;
  const points = data.map((d, i) => {
    const x = padding.left + (i / (data.length - 1)) * innerW;
    const y = padding.top + innerH - ((d.valor - min) / range) * innerH;
    return { x, y, ...d };
  });
  const path = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');
  const area = `${path} L ${points[points.length - 1]!.x.toFixed(1)} ${(padding.top + innerH).toFixed(1)} L ${points[0]!.x.toFixed(1)} ${(padding.top + innerH).toFixed(1)} Z`;

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base">
          Evolução do headcount (12 meses)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-40 w-full"
          role="img"
          aria-label="Evolução do headcount"
        >
          <defs>
            <linearGradient id="hcArea" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor="rgb(99 102 241)"
                stopOpacity="0.35"
              />
              <stop offset="100%" stopColor="rgb(99 102 241)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={area} fill="url(#hcArea)" />
          <path
            d={path}
            fill="none"
            stroke="rgb(99 102 241)"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {points.map((p) => (
            <circle
              key={p.mes}
              cx={p.x}
              cy={p.y}
              r={2.5}
              fill="rgb(99 102 241)"
            />
          ))}
          {points.map((p, i) =>
            i % 2 === 0 ? (
              <text
                key={`lbl-${p.mes}`}
                x={p.x}
                y={height - 4}
                textAnchor="middle"
                className="fill-muted-foreground"
                fontSize={9}
              >
                {p.mes}
              </text>
            ) : null
          )}
        </svg>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Subcomponente — Turnover por trimestre (bar chart SVG)              */
/* ------------------------------------------------------------------ */

const TURNOVER_QUARTERS: Array<{ label: string; valor: number }> = [
  { label: '2025-Q2', valor: 4.1 },
  { label: '2025-Q3', valor: 3.8 },
  { label: '2025-Q4', valor: 4.6 },
  { label: '2026-Q1', valor: 3.2 },
];

function TurnoverTrimestreCard() {
  const width = 320;
  const height = 140;
  const padding = { top: 10, right: 8, bottom: 24, left: 24 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;
  const max = Math.max(...TURNOVER_QUARTERS.map((q) => q.valor));
  const barW = (innerW / TURNOVER_QUARTERS.length) * 0.55;
  const step = innerW / TURNOVER_QUARTERS.length;

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base">Turnover por trimestre</CardTitle>
      </CardHeader>
      <CardContent>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-40 w-full"
          role="img"
          aria-label="Turnover por trimestre"
        >
          {TURNOVER_QUARTERS.map((q, i) => {
            const h = (q.valor / max) * innerH;
            const x = padding.left + i * step + (step - barW) / 2;
            const y = padding.top + innerH - h;
            return (
              <g key={q.label}>
                <rect
                  x={x}
                  y={y}
                  width={barW}
                  height={h}
                  rx={3}
                  fill="rgb(244 63 94)"
                  opacity={0.85}
                />
                <text
                  x={x + barW / 2}
                  y={y - 3}
                  textAnchor="middle"
                  className="fill-foreground"
                  fontSize={9}
                  fontWeight={600}
                >
                  {pctFmt.format(q.valor)}%
                </text>
                <text
                  x={x + barW / 2}
                  y={height - 6}
                  textAnchor="middle"
                  className="fill-muted-foreground"
                  fontSize={9}
                >
                  {q.label}
                </text>
              </g>
            );
          })}
        </svg>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Subcomponente — Calendário de férias do mês                         */
/* ------------------------------------------------------------------ */

function CalendarioFeriasCard({ ferias }: { ferias: SolicitacaoFerias[] }) {
  const today = new Date();
  const start = startOfMonth(today);
  const end = endOfMonth(today);
  const firstWeekday = start.getDay();
  const cells: Array<Date | null> = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
    cells.push(new Date(d));
  }
  while (cells.length < 35) cells.push(null);

  const feriasMap = new Map<string, SolicitacaoFerias[]>();
  for (const f of ferias) {
    if (f.status !== 'aprovada' && f.status !== 'em_andamento') continue;
    const ini = new Date(f.dataInicio);
    const fim = new Date(f.dataFim);
    for (let d = new Date(ini); d <= fim; d = addDays(d, 1)) {
      if (d < start || d > end) continue;
      const key = format(d, 'yyyy-MM-dd');
      const list = feriasMap.get(key) ?? [];
      list.push(f);
      feriasMap.set(key, list);
    }
  }

  const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base">
          Férias em {format(today, 'MMMM', { locale: ptBR })}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-muted-foreground">
          {weekdays.map((w) => (
            <div key={w} className="py-1 font-medium">
              {w}
            </div>
          ))}
          {cells.map((cell, i) => {
            if (!cell) return <div key={`e-${i}`} className="aspect-square" />;
            const key = format(cell, 'yyyy-MM-dd');
            const dayFerias = feriasMap.get(key);
            const hasFerias = Boolean(dayFerias && dayFerias.length > 0);
            const isToday =
              format(cell, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');
            const content = (
              <div
                className={cn(
                  'relative flex aspect-square items-center justify-center rounded-md border text-xs transition-colors',
                  isToday
                    ? 'border-primary bg-primary/10 font-semibold text-primary'
                    : 'border-border/60 text-foreground/80',
                  hasFerias && 'border-emerald-500/40 bg-emerald-500/10'
                )}
              >
                {format(cell, 'd')}
                {hasFerias && (
                  <span className="absolute bottom-1 h-1 w-1 rounded-full bg-emerald-500" />
                )}
              </div>
            );
            if (!hasFerias) {
              return <div key={key}>{content}</div>;
            }
            return (
              <Tooltip key={key}>
                <TooltipTrigger asChild>{content}</TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">
                    {dayFerias!.length} colaborador(es) de férias
                  </p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Subcomponente — Solicitações pendentes                              */
/* ------------------------------------------------------------------ */

function SolicitacoesPendentesCard({
  ferias,
  colaboradores,
}: {
  ferias: SolicitacaoFerias[];
  colaboradores: Colaborador[];
}) {
  const top5 = ferias.slice(0, 5);
  const colMap = new Map(colaboradores.map((c) => [c.id, c]));

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base">
          Solicitações de férias pendentes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {top5.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma solicitação pendente no momento.
          </p>
        ) : (
          top5.map((f) => {
            const col = colMap.get(f.colaboradorId);
            const nome = col?.nome ?? 'Colaborador';
            return (
              <div
                key={f.id}
                className="flex items-center gap-3 rounded-lg border border-border/60 p-3"
              >
                <Avatar className="h-9 w-9">
                  {col?.avatarUrl && (
                    <AvatarImage src={col.avatarUrl} alt={nome} />
                  )}
                  <AvatarFallback className="text-xs">
                    {getInitials(nome)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {nome}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(f.dataInicio), 'dd/MM', { locale: ptBR })}{' '}
                    –{' '}
                    {format(new Date(f.dataFim), 'dd/MM/yyyy', {
                      locale: ptBR,
                    })}{' '}
                    ({f.diasUteis} dias úteis)
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="default"
                    className="h-7 px-2 text-xs"
                  >
                    Aprovar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-xs"
                  >
                    Detalhes
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Subcomponente — Funil de candidatos                                 */
/* ------------------------------------------------------------------ */

interface FunilStage {
  etapa: CandidatoEtapa;
  label: string;
  count: number;
  color: string;
}

const FUNIL_MOCK: FunilStage[] = [
  { etapa: 'triagem', label: 'Triagem', count: 120, color: 'rgb(99 102 241)' },
  {
    etapa: 'entrevista_rh',
    label: 'Entrevista RH',
    count: 64,
    color: 'rgb(139 92 246)',
  },
  {
    etapa: 'entrevista_tecnica',
    label: 'Entrevista Técnica',
    count: 32,
    color: 'rgb(168 85 247)',
  },
  { etapa: 'proposta', label: 'Proposta', count: 14, color: 'rgb(217 70 239)' },
  {
    etapa: 'contratado',
    label: 'Contratado',
    count: 7,
    color: 'rgb(236 72 153)',
  },
];

function FunilCandidatosCard() {
  const width = 320;
  const stageH = 40;
  const gap = 6;
  const height = FUNIL_MOCK.length * (stageH + gap);
  const max = Math.max(...FUNIL_MOCK.map((s) => s.count));

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base">Funil de candidatos</CardTitle>
      </CardHeader>
      <CardContent>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full"
          style={{ maxHeight: 260 }}
          role="img"
          aria-label="Funil de candidatos"
        >
          {FUNIL_MOCK.map((s, i) => {
            const w = (s.count / max) * (width - 20);
            const x = (width - w) / 2;
            const y = i * (stageH + gap);
            return (
              <g key={s.etapa}>
                <rect
                  x={x}
                  y={y}
                  width={w}
                  height={stageH}
                  rx={6}
                  fill={s.color}
                  opacity={0.85}
                />
                <text
                  x={width / 2}
                  y={y + stageH / 2 + 4}
                  textAnchor="middle"
                  className="fill-white"
                  fontSize={12}
                  fontWeight={600}
                >
                  {s.label} · {s.count}
                </text>
              </g>
            );
          })}
        </svg>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Subcomponente — Vagas abertas destacadas                            */
/* ------------------------------------------------------------------ */

function VagasDestacadasCard({ vagas }: { vagas: Vaga[] }) {
  const abertas = vagas
    .filter((v) => v.status === 'aberta')
    .sort((a, b) => b.diasAberta - a.diasAberta)
    .slice(0, 5);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base">Vagas abertas há mais tempo</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {abertas.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma vaga aberta.</p>
        ) : (
          abertas.map((v) => (
            <div
              key={v.id}
              className="flex items-center gap-3 rounded-lg border border-border/60 p-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium text-foreground">
                    {v.titulo}
                  </p>
                  <Badge
                    variant={v.diasAberta > 45 ? 'destructive' : 'secondary'}
                    className="text-[10px]"
                  >
                    {v.diasAberta}d
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {v.departamento} · {v.candidatosCount} candidatos
                </p>
              </div>
              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs">
                Ver
                <ChevronRight className="ml-1 h-3 w-3" />
              </Button>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Subcomponente — Aniversariantes do mês                              */
/* ------------------------------------------------------------------ */

interface Aniversariante {
  id: string;
  nome: string;
  data: string; // YYYY-MM-DD
  cargo: string;
}

const ANIVERSARIANTES_MOCK: Aniversariante[] = [
  {
    id: 'a1',
    nome: 'Ana Beatriz Costa',
    data: '2026-04-03',
    cargo: 'Analista RH',
  },
  { id: 'a2', nome: 'Carlos Mendes', data: '2026-04-07', cargo: 'Dev Backend' },
  { id: 'a3', nome: 'Daniela Souza', data: '2026-04-12', cargo: 'UX Designer' },
  { id: 'a4', nome: 'Eduardo Lima', data: '2026-04-18', cargo: 'Tech Lead' },
  {
    id: 'a5',
    nome: 'Fernanda Rocha',
    data: '2026-04-22',
    cargo: 'Product Manager',
  },
  { id: 'a6', nome: 'Gabriel Alves', data: '2026-04-27', cargo: 'QA Engineer' },
];

function AniversariantesStrip() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Cake className="h-4 w-4 text-pink-500" />
          Aniversariantes do mês
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {ANIVERSARIANTES_MOCK.map((a) => (
            <div
              key={a.id}
              className="flex min-w-[180px] items-center gap-3 rounded-lg border border-border/60 p-3"
            >
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-gradient-to-br from-pink-500 to-rose-500 text-xs text-white">
                  {getInitials(a.nome)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {a.nome}
                </p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {a.cargo}
                </p>
                <p className="text-[11px] font-medium text-pink-600 dark:text-pink-400">
                  {format(new Date(a.data), "dd 'de' MMM", { locale: ptBR })}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Header actions                                                      */
/* ------------------------------------------------------------------ */

type DateRange = '7d' | '30d' | '90d' | 'ytd';
const RANGE_LABELS: Record<DateRange, string> = {
  '7d': '7d',
  '30d': '30d',
  '90d': '90d',
  ytd: 'YTD',
};

function DashboardActions({
  range,
  onRangeChange,
}: {
  range: DateRange;
  onRangeChange: (r: DateRange) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="inline-flex rounded-md border border-border bg-background p-0.5">
        {(Object.keys(RANGE_LABELS) as DateRange[]).map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => onRangeChange(r)}
            className={cn(
              'rounded-sm px-2.5 py-1 text-xs font-medium transition-colors',
              range === r
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {RANGE_LABELS[r]}
          </button>
        ))}
      </div>
      <Button size="sm" variant="outline" className="gap-1.5">
        <Download className="h-3.5 w-3.5" />
        Exportar
      </Button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Forecast mock                                                       */
/* ------------------------------------------------------------------ */

const FORECAST_HISTORICAL: Array<{ label: string; valor: number }> = [
  { label: 'Out', valor: 43 },
  { label: 'Nov', valor: 44 },
  { label: 'Dez', valor: 43 },
  { label: 'Jan', valor: 44 },
  { label: 'Fev', valor: 45 },
  { label: 'Mar', valor: 45 },
  { label: 'Abr', valor: 46 },
];
const FORECAST_PREDICTED: Array<{ label: string; valor: number }> = [
  { label: 'Mai', valor: 47 },
  { label: 'Jun', valor: 48 },
  { label: 'Jul', valor: 49 },
];

/* ------------------------------------------------------------------ */
/* Skeletons                                                           */
/* ------------------------------------------------------------------ */

function KpiCardSkeleton({ tall = false }: { tall?: boolean }) {
  return (
    <Card>
      <CardContent className={tall ? 'p-5' : 'p-4'}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className={tall ? 'h-8 w-32' : 'h-5 w-20'} />
            {tall && <Skeleton className="h-3 w-28" />}
          </div>
          <Skeleton
            className={tall ? 'h-12 w-12 rounded-full' : 'h-9 w-9 rounded-lg'}
          />
        </div>
        {tall && <Skeleton className="mt-4 h-10 w-full" />}
      </CardContent>
    </Card>
  );
}

function ChartCardSkeleton() {
  return (
    <Card className="h-full">
      <CardHeader>
        <Skeleton className="h-4 w-40" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-40 w-full" />
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Conteúdo principal                                                  */
/* ------------------------------------------------------------------ */

function RhDashboardContent() {
  const [range, setRange] = useState<DateRange>('30d');

  const kpisQuery = useQuery<RhKpi[]>({
    queryKey: ['rh', 'kpis', range],
    queryFn: getRhKpis,
  });

  const departamentosQuery = useQuery<Departamento[]>({
    queryKey: ['rh', 'departamentos'],
    queryFn: listDepartamentos,
  });

  const colaboradoresQuery = useQuery<{
    items: Colaborador[];
    totalCount: number;
  }>({
    queryKey: ['rh', 'colaboradores', 'first-page'],
    queryFn: () => listColaboradores({ pageSize: 100 }),
  });

  const vagasQuery = useQuery<Vaga[]>({
    queryKey: ['rh', 'vagas'],
    queryFn: () => listVagas(),
  });

  const feriasPendentesQuery = useQuery<SolicitacaoFerias[]>({
    queryKey: ['rh', 'ferias', 'pendente'],
    queryFn: () => listFerias('pendente'),
  });

  const feriasAprovadasQuery = useQuery<SolicitacaoFerias[]>({
    queryKey: ['rh', 'ferias', 'aprovada'],
    queryFn: () => listFerias('aprovada'),
  });

  const folhaQuery = useQuery<FolhaPagamento>({
    queryKey: ['rh', 'folha', '2026-04'],
    queryFn: () => getFolha('2026-04'),
  });

  const kpis = kpisQuery.data;
  const primaryKpis = useMemo(() => kpis?.slice(0, 4) ?? [], [kpis]);
  const secondaryKpis = useMemo(() => kpis?.slice(4, 8) ?? [], [kpis]);

  const headerActions: ReactNode = (
    <DashboardActions range={range} onRangeChange={setRange} />
  );

  // folha query é usada apenas para manter cache aquecido do custo detalhado
  void folhaQuery.data;

  return (
    <RhLayout
      title="Dashboard RH"
      subtitle="Visão executiva dos indicadores de pessoas"
      actions={headerActions}
    >
      <TooltipProvider delayDuration={200}>
        <div className="space-y-6">
          {/* 1. Banner IA */}
          <motion.div
            variants={sectionVariants(0)}
            initial="initial"
            animate="animate"
          >
            <AiSuggestionBanner
              message="A IA detectou risco elevado de turnover em Tecnologia — clique para analisar os sinais em colaboradores sênior."
              actionLabel="Ver análise"
              variant="warning"
              dismissible
            />
          </motion.div>

          {/* 2. KPIs primários */}
          <section>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {kpisQuery.isLoading
                ? Array.from({ length: 4 }).map((_, i) => (
                    <KpiCardSkeleton key={`pk-${i}`} tall />
                  ))
                : primaryKpis.map((kpi, i) => (
                    <PrimaryKpiCard
                      key={kpi.label}
                      kpi={kpi}
                      config={PRIMARY_KPI_CONFIGS[i] ?? PRIMARY_KPI_CONFIGS[0]!}
                      index={i + 1}
                    />
                  ))}
            </div>
          </section>

          {/* 3. KPIs secundários */}
          <section>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {kpisQuery.isLoading
                ? Array.from({ length: 4 }).map((_, i) => (
                    <KpiCardSkeleton key={`sk-${i}`} />
                  ))
                : secondaryKpis.map((kpi, i) => (
                    <SecondaryKpiCard
                      key={kpi.label}
                      kpi={kpi}
                      config={
                        SECONDARY_KPI_CONFIGS[i] ?? SECONDARY_KPI_CONFIGS[0]!
                      }
                      index={i + 2}
                    />
                  ))}
            </div>
          </section>

          <Separator />

          {/* 4. Saúde organizacional */}
          <motion.section
            variants={sectionVariants(3)}
            initial="initial"
            animate="animate"
          >
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Saúde organizacional
            </h2>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              {departamentosQuery.isLoading || !departamentosQuery.data ? (
                <ChartCardSkeleton />
              ) : (
                <DepartamentosCard departamentos={departamentosQuery.data} />
              )}
              <HeadcountEvolucaoCard />
              <TurnoverTrimestreCard />
            </div>
          </motion.section>

          {/* 5. Ausências & férias */}
          <motion.section
            variants={sectionVariants(4)}
            initial="initial"
            animate="animate"
          >
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Ausências e férias
            </h2>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {feriasAprovadasQuery.isLoading || !feriasAprovadasQuery.data ? (
                <ChartCardSkeleton />
              ) : (
                <CalendarioFeriasCard ferias={feriasAprovadasQuery.data} />
              )}
              {feriasPendentesQuery.isLoading ||
              colaboradoresQuery.isLoading ||
              !feriasPendentesQuery.data ||
              !colaboradoresQuery.data ? (
                <ChartCardSkeleton />
              ) : (
                <SolicitacoesPendentesCard
                  ferias={feriasPendentesQuery.data}
                  colaboradores={colaboradoresQuery.data.items}
                />
              )}
            </div>
          </motion.section>

          {/* 6. Recrutamento */}
          <motion.section
            variants={sectionVariants(5)}
            initial="initial"
            animate="animate"
          >
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Recrutamento
            </h2>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <FunilCandidatosCard />
              {vagasQuery.isLoading || !vagasQuery.data ? (
                <ChartCardSkeleton />
              ) : (
                <VagasDestacadasCard vagas={vagasQuery.data} />
              )}
            </div>
          </motion.section>

          {/* 7. IA & Predições */}
          <motion.section
            variants={sectionVariants(6)}
            initial="initial"
            animate="animate"
          >
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              IA e predições
            </h2>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle className="text-base">
                      Previsão de headcount (3 meses)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <AiForecastChart
                      historical={FORECAST_HISTORICAL.map((p) => p.valor)}
                      forecast={FORECAST_PREDICTED.map((p) => p.valor)}
                      confidence={0.82}
                      label="Headcount"
                    />
                  </CardContent>
                </Card>
              </div>
              <AiInsightsPanel scope="rh" maxItems={4} compact />
            </div>
          </motion.section>

          {/* 8. Aniversariantes */}
          <motion.section
            variants={sectionVariants(7)}
            initial="initial"
            animate="animate"
          >
            <AniversariantesStrip />
          </motion.section>
        </div>
      </TooltipProvider>
    </RhLayout>
  );
}

/* ------------------------------------------------------------------ */
/* Export raiz                                                         */
/* ------------------------------------------------------------------ */

export default function RhDashboard() {
  const client = getLocalQueryClient();
  return (
    <QueryClientProvider client={client}>
      <RhDashboardContent />
    </QueryClientProvider>
  );
}
