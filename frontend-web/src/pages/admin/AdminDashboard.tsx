/**
 * AdminDashboard — visão geral completa com KPIs, gráficos, heatmap,
 * mapa e insights de IA. Usa apenas SVG puro + framer-motion.
 */
import { useMemo, useState } from 'react';
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  ChevronDown,
  Download,
  FileSpreadsheet,
  FileText,
  FileType,
  RefreshCw,
  Users,
  UserCheck,
  UserX,
  Clock,
  AlertTriangle,
} from 'lucide-react';

import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';

import {
  getDashboardSummary,
  getHeatmapAtividade,
  getPredicoesIa,
  type DashboardSummary,
  type DashboardKpi,
  type HeatmapCell,
  type PredicoesIa,
  type Anomalia,
} from '@/services/adminAnalyticsApi';
import { getDoctors } from '@/services/adminApi';

import {
  AreaLineChart,
  DonutChart,
  FunnelChart,
  HorizontalBars,
  TopEstadosList,
  BrasilMap,
  HeatmapGrid,
  AiMiniSparkline,
} from '@/components/admin/dashboard/charts';
import {
  AiSuggestionBanner,
  AiForecastChart,
  AiInsightsPanel,
} from '@/components/admin/dashboard/ai-widgets';

// ---------- QueryClient local (App.tsx não provê um) ----------
const dashboardQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// ---------- Tipos auxiliares ----------
type RangeKey = 'today' | '7d' | '30d' | '90d';

const RANGE_LABEL: Record<RangeKey, string> = {
  today: 'Hoje',
  '7d': 'Últimos 7 dias',
  '30d': 'Últimos 30 dias',
  '90d': 'Últimos 90 dias',
};

interface DoctorCounts {
  total: number;
  pendentes: number;
  aprovados: number;
  recusados: number;
}

interface DoctorListResponse {
  totalCount?: number;
}

async function fetchDoctorCounts(): Promise<DoctorCounts> {
  const pick = (d: unknown): number => {
    if (d && typeof d === 'object' && 'totalCount' in d) {
      const v = (d as DoctorListResponse).totalCount;
      return typeof v === 'number' ? v : 0;
    }
    if (Array.isArray(d)) return d.length;
    return 0;
  };
  const [all, pend, appr, rej] = await Promise.all([
    getDoctors({ page: 1, pageSize: 1 }),
    getDoctors({ status: 'pending', page: 1, pageSize: 1 }),
    getDoctors({ status: 'approved', page: 1, pageSize: 1 }),
    getDoctors({ status: 'rejected', page: 1, pageSize: 1 }),
  ]);
  return {
    total: pick(all),
    pendentes: pick(pend),
    aprovados: pick(appr),
    recusados: pick(rej),
  };
}

// ---------- Helpers ----------
function formatNumber(v: number): string {
  if (v >= 1000) return v.toLocaleString('pt-BR');
  if (Number.isInteger(v)) return String(v);
  return v.toFixed(1).replace('.', ',');
}

function severityStyle(sev: Anomalia['severidade']): string {
  switch (sev) {
    case 'alta':
      return 'bg-destructive/10 text-destructive border-destructive/30';
    case 'media':
      return 'bg-warning/10 text-warning-foreground border-warning/30';
    case 'baixa':
    default:
      return 'bg-primary/10 text-primary border-primary/30';
  }
}

// ---------- Error card ----------
function ErrorCard({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <Card className="border-destructive/40">
      <CardContent className="flex items-center gap-4 p-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle className="h-5 w-5 text-destructive" aria-hidden />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium">Algo deu errado</p>
          <p className="text-xs text-muted-foreground">{message}</p>
        </div>
        <Button size="sm" variant="outline" onClick={onRetry} className="gap-2">
          <RefreshCw className="h-3.5 w-3.5" aria-hidden />
          Tentar novamente
        </Button>
      </CardContent>
    </Card>
  );
}

// ---------- KPI Card ----------
interface KpiCardProps {
  kpi: DashboardKpi;
  index: number;
}

function KpiCard({ kpi, index }: KpiCardProps) {
  const positive = kpi.delta >= 0;
  const deltaColor = positive ? 'text-success' : 'text-destructive';
  const DeltaIcon = positive ? ArrowUpRight : ArrowDownRight;
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4, ease: 'easeOut' }}
      whileHover={{ y: -3 }}
      className="group"
    >
      <Card className="relative overflow-hidden border-border/60 bg-gradient-to-br from-card to-card/80 shadow-sm transition-shadow hover:shadow-lg">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(var(--primary)/0.08),transparent_70%)] opacity-0 transition-opacity group-hover:opacity-100" />
        <CardContent className="relative p-5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {kpi.label}
              </p>
              <p className="mt-2 text-3xl font-bold tabular-nums tracking-tight">
                {formatNumber(kpi.value)}
              </p>
              <div
                className={`mt-2 flex items-center gap-1 text-xs font-semibold ${deltaColor}`}
              >
                <DeltaIcon className="h-3.5 w-3.5" aria-hidden />
                <span>
                  {positive ? '+' : ''}
                  {kpi.delta.toFixed(1)}%
                </span>
                <span className="font-normal text-muted-foreground">
                  vs período anterior
                </span>
              </div>
            </div>
            <div className="shrink-0">
              <AiMiniSparkline data={kpi.sparkline} trend={kpi.trend} />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ---------- Doctor stat card ----------
interface DoctorStatCardProps {
  label: string;
  value: number;
  icon: typeof Users;
  gradient: string;
  iconTint: string;
  index: number;
  loading: boolean;
}

function DoctorStatCard({
  label,
  value,
  icon: Icon,
  gradient,
  iconTint,
  index,
  loading,
}: DoctorStatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card className="relative overflow-hidden">
        <div className={`absolute inset-0 opacity-[0.08] ${gradient}`} />
        <CardContent className="relative flex items-center justify-between gap-3 p-5">
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">
              {label}
            </p>
            {loading ? (
              <Skeleton className="mt-2 h-8 w-20" />
            ) : (
              <p className="mt-1 text-3xl font-bold tabular-nums">
                {value.toLocaleString('pt-BR')}
              </p>
            )}
          </div>
          <div className={`rounded-2xl p-3 ${iconTint}`}>
            <Icon className="h-6 w-6" aria-hidden />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ---------- Mock últimos cadastros ----------
const MOCK_RECENT_DOCTORS = [
  {
    name: 'Dra. Marina Souza',
    crm: 'CRM/SP 123456',
    status: 'Pendente',
    when: 'há 2h',
  },
  {
    name: 'Dr. Rafael Lima',
    crm: 'CRM/RJ 98321',
    status: 'Aprovado',
    when: 'há 5h',
  },
  {
    name: 'Dra. Helena Castro',
    crm: 'CRM/MG 45678',
    status: 'Aprovado',
    when: 'há 1d',
  },
  {
    name: 'Dr. André Nunes',
    crm: 'CRM/BA 77231',
    status: 'Recusado',
    when: 'há 2d',
  },
  {
    name: 'Dra. Júlia Ferreira',
    crm: 'CRM/PR 11290',
    status: 'Pendente',
    when: 'há 3d',
  },
];

function statusTone(status: string): string {
  if (status === 'Aprovado') return 'bg-success/15 text-success';
  if (status === 'Recusado') return 'bg-destructive/15 text-destructive';
  return 'bg-warning/15 text-warning-foreground';
}

// ---------- Core dashboard (dentro do QueryClientProvider) ----------
function DashboardInner() {
  const [range, setRange] = useState<RangeKey>('30d');

  const summaryQuery = useQuery<DashboardSummary>({
    queryKey: ['admin-dashboard-summary', range],
    queryFn: getDashboardSummary,
  });

  const heatmapQuery = useQuery<HeatmapCell[]>({
    queryKey: ['admin-dashboard-heatmap', range],
    queryFn: getHeatmapAtividade,
  });

  const predictionsQuery = useQuery<PredicoesIa>({
    queryKey: ['admin-dashboard-predictions', range],
    queryFn: getPredicoesIa,
  });

  const doctorCountsQuery = useQuery<DoctorCounts>({
    queryKey: ['admin-dashboard-doctor-counts'],
    queryFn: fetchDoctorCounts,
  });

  const summary = summaryQuery.data;
  const kpis = summary?.kpis ?? [];

  const generoSegments = useMemo(() => {
    if (!summary) return [];
    return [
      {
        label: 'Feminino',
        value: summary.generoSplit.f,
        color: 'hsl(340 82% 62%)',
      },
      {
        label: 'Masculino',
        value: summary.generoSplit.m,
        color: 'hsl(210 82% 58%)',
      },
      {
        label: 'Outros',
        value: summary.generoSplit.outros,
        color: 'hsl(270 60% 62%)',
      },
    ];
  }, [summary]);

  const faixaEtariaData = useMemo(
    () =>
      (summary?.faixaEtaria ?? []).map((f) => ({
        label: f.faixa,
        value: f.count,
      })),
    [summary]
  );

  const counts = doctorCountsQuery.data ?? {
    total: 0,
    pendentes: 0,
    aprovados: 0,
    recusados: 0,
  };

  return (
    <div className="space-y-6">
      {/* ---------- Header ---------- */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Bem-vindo de volta — aqui está o que está acontecendo no RenoveJá+
            hoje.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Range picker */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Calendar className="h-4 w-4" aria-hidden />
                {RANGE_LABEL[range]}
                <ChevronDown className="h-3.5 w-3.5 opacity-70" aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Período</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {(Object.keys(RANGE_LABEL) as RangeKey[]).map((k) => (
                <DropdownMenuItem key={k} onSelect={() => setRange(k)}>
                  {RANGE_LABEL[k]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Export */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Download className="h-4 w-4" aria-hidden />
                Exportar
                <ChevronDown className="h-3.5 w-3.5 opacity-70" aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <FileType className="mr-2 h-4 w-4" aria-hidden /> PDF
              </DropdownMenuItem>
              <DropdownMenuItem>
                <FileSpreadsheet className="mr-2 h-4 w-4" aria-hidden /> Excel
              </DropdownMenuItem>
              <DropdownMenuItem>
                <FileText className="mr-2 h-4 w-4" aria-hidden /> CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Separator
            orientation="vertical"
            className="mx-1 hidden h-8 sm:block"
          />

          <Avatar className="h-9 w-9 border-2 border-primary/20">
            <AvatarFallback className="bg-primary/10 font-semibold text-primary">
              AD
            </AvatarFallback>
          </Avatar>
        </div>
      </motion.div>

      {/* ---------- AI Suggestion ---------- */}
      <AiSuggestionBanner
        message="A IA detectou um padrão incomum em cadastros nas últimas 24h — clique para investigar."
        actionLabel="Ver detalhes"
        onAction={() => {
          /* placeholder de ação */
        }}
      />

      {/* ---------- KPIs ---------- */}
      {summaryQuery.isError ? (
        <ErrorCard
          message="Não foi possível carregar os KPIs."
          onRetry={() => summaryQuery.refetch()}
        />
      ) : summaryQuery.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {kpis.slice(0, 4).map((kpi, i) => (
            <KpiCard key={kpi.label} kpi={kpi} index={i} />
          ))}
        </div>
      )}

      {/* ---------- Tabs principais ---------- */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid h-auto w-full grid-cols-2 sm:grid-cols-5">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="doctors">Médicos</TabsTrigger>
          <TabsTrigger value="geo">Geografia</TabsTrigger>
          <TabsTrigger value="ai">IA & Predições</TabsTrigger>
          <TabsTrigger value="activity">Atividade</TabsTrigger>
        </TabsList>

        {/* ----- Visão Geral ----- */}
        <TabsContent value="overview" className="mt-6 space-y-6">
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">
                  Consultas — últimos 30 dias
                </CardTitle>
              </CardHeader>
              <CardContent>
                {summaryQuery.isLoading ? (
                  <Skeleton className="h-56 w-full" />
                ) : summary ? (
                  <AreaLineChart
                    data={summary.consultasUltimos30Dias}
                    height={220}
                  />
                ) : null}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Gênero</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-4">
                {summaryQuery.isLoading ? (
                  <Skeleton className="h-44 w-44 rounded-full" />
                ) : (
                  <>
                    <DonutChart
                      segments={generoSegments}
                      centerLabel="pacientes"
                    />
                    <div className="w-full space-y-1.5">
                      {generoSegments.map((seg) => (
                        <div
                          key={seg.label}
                          className="flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className="inline-block h-3 w-3 rounded-sm"
                              style={{ backgroundColor: seg.color }}
                            />
                            <span>{seg.label}</span>
                          </div>
                          <span className="tabular-nums text-muted-foreground">
                            {seg.value.toLocaleString('pt-BR')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Funil de cadastro</CardTitle>
            </CardHeader>
            <CardContent>
              {summaryQuery.isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-7 w-full" />
                  ))}
                </div>
              ) : summary ? (
                <FunnelChart data={summary.funilCadastro} />
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ----- Médicos ----- */}
        <TabsContent value="doctors" className="mt-6 space-y-6">
          {doctorCountsQuery.isError ? (
            <ErrorCard
              message="Não foi possível carregar as estatísticas de médicos."
              onRetry={() => doctorCountsQuery.refetch()}
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <DoctorStatCard
                index={0}
                loading={doctorCountsQuery.isLoading}
                label="Total"
                value={counts.total}
                icon={Users}
                gradient="bg-gradient-to-br from-primary to-primary/60"
                iconTint="bg-primary/15 text-primary"
              />
              <DoctorStatCard
                index={1}
                loading={doctorCountsQuery.isLoading}
                label="Pendentes"
                value={counts.pendentes}
                icon={Clock}
                gradient="bg-gradient-to-br from-warning to-warning/60"
                iconTint="bg-warning/15 text-warning-foreground"
              />
              <DoctorStatCard
                index={2}
                loading={doctorCountsQuery.isLoading}
                label="Aprovados"
                value={counts.aprovados}
                icon={UserCheck}
                gradient="bg-gradient-to-br from-success to-success/60"
                iconTint="bg-success/15 text-success"
              />
              <DoctorStatCard
                index={3}
                loading={doctorCountsQuery.isLoading}
                label="Recusados"
                value={counts.recusados}
                icon={UserX}
                gradient="bg-gradient-to-br from-destructive to-destructive/60"
                iconTint="bg-destructive/15 text-destructive"
              />
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Últimos cadastros</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {MOCK_RECENT_DOCTORS.map((d, i) => (
                  <motion.div
                    key={d.name}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="flex items-center gap-4 px-5 py-3"
                  >
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                        {d.name
                          .split(' ')
                          .slice(0, 2)
                          .map((n) => n[0])
                          .join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{d.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {d.crm}
                      </p>
                    </div>
                    <Badge
                      className={`${statusTone(d.status)} border-transparent`}
                      variant="outline"
                    >
                      {d.status}
                    </Badge>
                    <span className="w-14 text-right text-xs text-muted-foreground">
                      {d.when}
                    </span>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ----- Geografia ----- */}
        <TabsContent value="geo" className="mt-6 space-y-6">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top estados</CardTitle>
              </CardHeader>
              <CardContent>
                {summaryQuery.isLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <Skeleton key={i} className="h-8 w-full" />
                    ))}
                  </div>
                ) : summary ? (
                  <TopEstadosList estados={summary.topEstados.slice(0, 10)} />
                ) : null}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Mapa — concentração</CardTitle>
              </CardHeader>
              <CardContent>
                {summaryQuery.isLoading ? (
                  <Skeleton className="aspect-square w-full" />
                ) : summary ? (
                  <BrasilMap estados={summary.topEstados} />
                ) : null}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ----- IA & Predições ----- */}
        <TabsContent value="ai" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Previsão de consultas — próximos 30 dias
              </CardTitle>
            </CardHeader>
            <CardContent>
              {summaryQuery.isLoading || predictionsQuery.isLoading ? (
                <Skeleton className="h-60 w-full" />
              ) : summary && predictionsQuery.data ? (
                <AiForecastChart
                  historical={summary.consultasUltimos30Dias}
                  forecast={predictionsQuery.data.forecastConsultas30d}
                  confidence={predictionsQuery.data.confidence}
                  label="Consultas/dia"
                />
              ) : null}
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <AiInsightsPanel scope="admin" />
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Anomalias detectadas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {predictionsQuery.isLoading
                  ? Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))
                  : predictionsQuery.data
                    ? predictionsQuery.data.anomalias.map((a, i) => (
                        <motion.div
                          key={`${a.data}-${a.metrica}`}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.06 }}
                          className={`rounded-lg border p-3 ${severityStyle(a.severidade)}`}
                        >
                          <div className="mb-1 flex items-center justify-between">
                            <p className="text-xs font-semibold uppercase tracking-wide">
                              {a.metrica}
                            </p>
                            <Badge
                              variant="outline"
                              className="text-[10px] uppercase"
                            >
                              {a.severidade}
                            </Badge>
                          </div>
                          <p className="text-sm leading-snug">{a.descricao}</p>
                          <p className="mt-1 text-[11px] opacity-70">
                            {a.data}
                          </p>
                        </motion.div>
                      ))
                    : null}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ----- Atividade ----- */}
        <TabsContent value="activity" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Heatmap de atividade — dia x hora
              </CardTitle>
            </CardHeader>
            <CardContent>
              {heatmapQuery.isError ? (
                <ErrorCard
                  message="Não foi possível carregar o heatmap."
                  onRetry={() => heatmapQuery.refetch()}
                />
              ) : heatmapQuery.isLoading ? (
                <Skeleton className="h-60 w-full" />
              ) : heatmapQuery.data ? (
                <HeatmapGrid cells={heatmapQuery.data} />
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ---------- Grid final (fixa, fora das tabs) ---------- */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Faixa etária</CardTitle>
          </CardHeader>
          <CardContent>
            {summaryQuery.isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-5 w-full" />
                ))}
              </div>
            ) : (
              <HorizontalBars data={faixaEtariaData} />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribuição por gênero</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            {summaryQuery.isLoading ? (
              <Skeleton className="h-44 w-44 rounded-full" />
            ) : (
              <DonutChart
                segments={generoSegments}
                centerLabel="pacientes"
                size={200}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ---------- Export ----------
const AdminDashboard = () => (
  <AdminLayout>
    <QueryClientProvider client={dashboardQueryClient}>
      <DashboardInner />
    </QueryClientProvider>
  </AdminLayout>
);

export default AdminDashboard;
