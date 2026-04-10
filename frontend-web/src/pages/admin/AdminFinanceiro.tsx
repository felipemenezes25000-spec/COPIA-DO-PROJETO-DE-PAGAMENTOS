import { useMemo, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  Download,
  FileSpreadsheet,
  FileText,
  Sparkles,
  RefreshCw,
  AlertCircle,
  DollarSign,
  Wallet,
  Activity,
  BarChart3,
} from 'lucide-react';

import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { DashboardTab } from '@/components/admin/SimuladorDashboard';
import { FunilConsultaTab } from '@/components/admin/SimuladorFunilConsulta';
import { CenariosTab } from '@/components/admin/SimuladorCenarios';
import { CidadePotencialTab } from '@/components/admin/SimuladorCidadePotencial';
import { AiInsightsPanel } from '@/components/admin/ai/AiInsightsPanel';

import {
  LineAreaChart,
  DonutChart,
  ComparativeBars,
  ForecastChart,
  Sparkline,
  type DonutSlice,
  type ComparativeBarsDatum,
  type SeriesPoint,
} from '@/components/admin/financeiro/Charts';

/* ──────────────────────────────────────────────────────────────
   Helpers
   ────────────────────────────────────────────────────────────── */

const BRL = (v: number): string => {
  const a = Math.abs(v);
  const s = v < 0 ? '-' : '';
  if (a >= 1_000_000) return `${s}R$ ${(a / 1_000_000).toFixed(1)}M`;
  if (a >= 1_000) return `${s}R$ ${(a / 1_000).toFixed(1)}k`;
  return `${s}R$ ${Math.round(a).toLocaleString('pt-BR')}`;
};

const PCT = (v: number): string => `${v.toFixed(0)}%`;

/* ──────────────────────────────────────────────────────────────
   Mock datasets (placeholder — to be wired to adminApi later)
   ────────────────────────────────────────────────────────────── */

const MONTH_LABELS = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
];

const ECONOMIA_12M: SeriesPoint[] = [
  { label: 'Jan', value: 720_000 },
  { label: 'Fev', value: 812_000 },
  { label: 'Mar', value: 870_000 },
  { label: 'Abr', value: 905_000 },
  { label: 'Mai', value: 960_000 },
  { label: 'Jun', value: 1_020_000 },
  { label: 'Jul', value: 1_050_000 },
  { label: 'Ago', value: 1_120_000 },
  { label: 'Set', value: 1_140_000 },
  { label: 'Out', value: 1_180_000 },
  { label: 'Nov', value: 1_220_000 },
  { label: 'Dez', value: 1_260_000 },
];

const DIST_CUSTOS: DonutSlice[] = [
  { label: 'Consultas telemedicina', value: 65, color: '#2563eb' },
  { label: 'Infraestrutura', value: 20, color: '#8b5cf6' },
  { label: 'IA / Processamento', value: 10, color: '#10b981' },
  { label: 'Outros', value: 5, color: '#f59e0b' },
];

const COMPARATIVO: ComparativeBarsDatum[] = MONTH_LABELS.map((m, i) => ({
  label: m,
  a: 120_000 + i * 2200 + (i % 3) * 4000, // presencial
  b: 32_000 + i * 900 + (i % 4) * 1500, // telemedicina
}));

const HIST_FORECAST: SeriesPoint[] = ECONOMIA_12M.slice(0, 8);
const FORECAST_SERIES: SeriesPoint[] = [
  { label: 'Set', value: 1_170_000 },
  { label: 'Out', value: 1_230_000 },
  { label: 'Nov', value: 1_295_000 },
  { label: 'Dez', value: 1_360_000 },
];
const FORECAST_CONFIDENCE = [
  { label: 'Ago', low: 1_120_000, high: 1_120_000 },
  { label: 'Set', low: 1_060_000, high: 1_290_000 },
  { label: 'Out', low: 1_080_000, high: 1_400_000 },
  { label: 'Nov', low: 1_100_000, high: 1_510_000 },
  { label: 'Dez', low: 1_110_000, high: 1_620_000 },
];

interface CategoryRow {
  key: string;
  categoria: string;
  atual: number;
  telemed: number;
}

const CATEGORIAS: CategoryRow[] = [
  {
    key: 'clinica',
    categoria: 'Consultas clínicas',
    atual: 480_000,
    telemed: 160_000,
  },
  {
    key: 'exames',
    categoria: 'Exames básicos',
    atual: 220_000,
    telemed: 135_000,
  },
  { key: 'retornos', categoria: 'Retornos', atual: 180_000, telemed: 45_000 },
  {
    key: 'prescricoes',
    categoria: 'Prescrições',
    atual: 90_000,
    telemed: 18_000,
  },
  {
    key: 'emergencias',
    categoria: 'Emergências',
    atual: 260_000,
    telemed: 190_000,
  },
  {
    key: 'psiq',
    categoria: 'Telepsiquiatria',
    atual: 140_000,
    telemed: 55_000,
  },
  {
    key: 'derma',
    categoria: 'Teledermatologia',
    atual: 96_000,
    telemed: 29_000,
  },
];

/* ──────────────────────────────────────────────────────────────
   KPI card
   ────────────────────────────────────────────────────────────── */

interface KpiCardProps {
  label: string;
  value: string;
  delta: number; // percentage
  deltaLabel?: string;
  icon: React.ReactNode;
  sparkPoints: number[];
  sparkColor?: string;
  index: number;
}

function KpiCard({
  label,
  value,
  delta,
  deltaLabel,
  icon,
  sparkPoints,
  sparkColor,
  index,
}: KpiCardProps) {
  const positive = delta >= 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.05, ease: 'easeOut' }}
    >
      <Card className="relative overflow-hidden">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {label}
              </p>
              <p className="mt-1 truncate text-2xl font-bold tabular-nums">
                {value}
              </p>
              <div className="mt-1.5 flex items-center gap-1.5">
                {positive ? (
                  <TrendingUp
                    className="h-3.5 w-3.5 text-emerald-600"
                    aria-hidden
                  />
                ) : (
                  <TrendingDown
                    className="h-3.5 w-3.5 text-rose-600"
                    aria-hidden
                  />
                )}
                <span
                  className={`text-xs font-semibold ${positive ? 'text-emerald-600' : 'text-rose-600'}`}
                >
                  {positive ? '+' : ''}
                  {delta.toFixed(0)}%
                </span>
                {deltaLabel && (
                  <span className="text-xs text-muted-foreground">
                    {deltaLabel}
                  </span>
                )}
              </div>
            </div>
            <div className="shrink-0 rounded-lg bg-primary/10 p-2 text-primary">
              {icon}
            </div>
          </div>
          <div className="-mx-1 mt-3">
            <Sparkline
              points={sparkPoints}
              color={sparkColor ?? (positive ? '#10b981' : '#ef4444')}
            />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

/* ──────────────────────────────────────────────────────────────
   ROI Calculator sub-component
   ────────────────────────────────────────────────────────────── */

function RoiCalculator() {
  const [populacao, setPopulacao] = useState<number>(150_000);
  const [adocaoPct, setAdocaoPct] = useState<number>(25);
  const [custoAtual, setCustoAtual] = useState<number>(80);
  const [ticketTelemed, setTicketTelemed] = useState<number>(32);

  const results = useMemo(() => {
    const consultasMes = Math.round((populacao * (adocaoPct / 100)) / 6); // ~1 consulta / 6 meses
    const custoAtualMes = consultasMes * custoAtual;
    const custoTelemedMes = consultasMes * ticketTelemed;
    const economiaMes = custoAtualMes - custoTelemedMes;
    const economia12m = economiaMes * 12;
    const investimentoEstimado = Math.max(economiaMes * 2.5, 150_000);
    const paybackMeses =
      economiaMes > 0 ? investimentoEstimado / economiaMes : 0;
    const roi12m =
      investimentoEstimado > 0
        ? ((economia12m - investimentoEstimado) / investimentoEstimado) * 100
        : 0;

    return {
      consultasMes,
      economiaMes,
      economia12m,
      paybackMeses,
      roi12m,
      investimentoEstimado,
    };
  }, [populacao, adocaoPct, custoAtual, ticketTelemed]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <DollarSign className="h-4 w-4 text-primary" />
          Calculadora de ROI
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Ajuste as premissas para simular o retorno de investimento do
          município.
        </p>
      </CardHeader>
      <CardContent className="grid gap-6 md:grid-cols-2">
        {/* Inputs */}
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="roi-pop" className="text-xs font-medium">
              População do município
            </label>
            <Input
              id="roi-pop"
              type="number"
              min={1000}
              value={populacao}
              onChange={(e) => setPopulacao(Number(e.target.value) || 0)}
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="roi-adocao"
              className="flex justify-between text-xs font-medium"
            >
              <span>Adoção estimada</span>
              <span className="font-semibold tabular-nums text-primary">
                {adocaoPct}%
              </span>
            </label>
            <input
              id="roi-adocao"
              type="range"
              min={1}
              max={100}
              value={adocaoPct}
              onChange={(e) => setAdocaoPct(Number(e.target.value))}
              className="w-full accent-primary"
              aria-label="Percentual de adoção"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="roi-atual" className="text-xs font-medium">
              Custo médio atual por consulta (R$)
            </label>
            <Input
              id="roi-atual"
              type="number"
              min={0}
              value={custoAtual}
              onChange={(e) => setCustoAtual(Number(e.target.value) || 0)}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="roi-ticket" className="text-xs font-medium">
              Ticket telemedicina (R$)
            </label>
            <Input
              id="roi-ticket"
              type="number"
              min={0}
              value={ticketTelemed}
              onChange={(e) => setTicketTelemed(Number(e.target.value) || 0)}
            />
          </div>
        </div>

        {/* Outputs */}
        <div className="space-y-3">
          <ResultRow
            label="Consultas estimadas / mês"
            value={results.consultasMes.toLocaleString('pt-BR')}
          />
          <ResultRow
            label="Economia mensal"
            value={BRL(results.economiaMes)}
            highlight
          />
          <ResultRow
            label="Economia anual"
            value={BRL(results.economia12m)}
            highlight
          />
          <ResultRow
            label="Payback estimado"
            value={
              results.paybackMeses > 0
                ? `${results.paybackMeses.toFixed(1)} meses`
                : '—'
            }
          />
          <ResultRow
            label="ROI projetado (12m)"
            value={`${results.roi12m.toFixed(0)}%`}
            highlight
          />
          <ResultRow
            label="Investimento estimado"
            value={BRL(results.investimentoEstimado)}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function ResultRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between border-b border-border/60 py-2 last:border-b-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span
        className={`text-sm tabular-nums ${highlight ? 'font-bold text-primary' : 'font-medium'}`}
      >
        {value}
      </span>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   Forecast tab
   ────────────────────────────────────────────────────────────── */

function ForecastSection() {
  const [recalculating, setRecalculating] = useState(false);
  const [version, setVersion] = useState(0);

  const handleRecalc = useCallback(() => {
    setRecalculating(true);
    window.setTimeout(() => {
      setRecalculating(false);
      setVersion((v) => v + 1);
    }, 1500);
  }, []);

  const scenarios = useMemo(
    () => ({
      otimista: 1_560_000 + version * 15_000,
      realista: 1_260_000 + version * 10_000,
      pessimista: 980_000 + version * 5_000,
    }),
    [version]
  );

  return (
    <div className="grid gap-5 lg:grid-cols-[2fr_1fr]">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
          <div>
            <CardTitle className="text-base">
              Projeção de economia — próximos 12 meses
            </CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Linha sólida = histórico. Linha pontilhada = forecast IA. Área
              sombreada = intervalo de confiança.
            </p>
          </div>
          <Button size="sm" onClick={handleRecalc} disabled={recalculating}>
            {recalculating ? (
              <RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
            )}
            {recalculating ? 'Recalculando…' : 'Recalcular com IA'}
          </Button>
        </CardHeader>
        <CardContent>
          <ForecastChart
            history={HIST_FORECAST}
            forecast={FORECAST_SERIES}
            confidence={FORECAST_CONFIDENCE}
            formatValue={BRL}
          />
          <div className="mt-4 space-y-1 text-xs text-muted-foreground">
            <p className="font-semibold text-foreground">Premissas do modelo</p>
            <ul className="list-inside list-disc space-y-0.5">
              <li>Base de consultas: 48.000 / mês</li>
              <li>Crescimento médio anual: 12% a.a.</li>
              <li>Taxa de adoção acumulada: +3,2 p.p./trimestre</li>
              <li>Inflação médica (IPCA saúde): 6,5% a.a.</li>
              <li>Mix atual: 65% clínica · 25% psi · 10% especialidades</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              Cenários — Dez/{new Date().getFullYear()}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ScenarioRow
              label="Otimista"
              value={BRL(scenarios.otimista)}
              tone="positive"
              sub="+24% vs realista"
            />
            <Separator />
            <ScenarioRow
              label="Realista"
              value={BRL(scenarios.realista)}
              tone="neutral"
              sub="base IA"
            />
            <Separator />
            <ScenarioRow
              label="Pessimista"
              value={BRL(scenarios.pessimista)}
              tone="negative"
              sub="-22% vs realista"
            />
          </CardContent>
        </Card>

        <Card className="border-dashed bg-muted/30">
          <CardContent className="flex items-start gap-3 p-4">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              Projeções geradas por modelo estatístico com fallback Gemini. Use
              como referência — valores reais podem variar conforme contratos e
              efetiva adoção municipal.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ScenarioRow({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub: string;
  tone: 'positive' | 'neutral' | 'negative';
}) {
  const color =
    tone === 'positive'
      ? 'text-emerald-600'
      : tone === 'negative'
        ? 'text-rose-600'
        : 'text-primary';
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className={`text-2xl font-bold tabular-nums ${color}`}>{value}</p>
      <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   Category table
   ────────────────────────────────────────────────────────────── */

function CategoryTable() {
  const rows = useMemo(() => {
    const totalAtual = CATEGORIAS.reduce((s, r) => s + r.atual, 0);
    return CATEGORIAS.map((r) => {
      const economia = r.atual - r.telemed;
      const pct = (r.atual / totalAtual) * 100;
      return { ...r, economia, pct };
    });
  }, []);

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, r) => ({
        atual: acc.atual + r.atual,
        telemed: acc.telemed + r.telemed,
        economia: acc.economia + r.economia,
      }),
      { atual: 0, telemed: 0, economia: 0 }
    );
  }, [rows]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="text-base">Custo por categoria</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Comparativo entre modelo tradicional e telemedicina por linha de
            serviço.
          </p>
        </div>
        <Button variant="outline" size="sm">
          <Download className="mr-1.5 h-3.5 w-3.5" /> Exportar
        </Button>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Categoria</TableHead>
                <TableHead className="text-right">Custo atual</TableHead>
                <TableHead className="text-right">Custo telemed</TableHead>
                <TableHead className="text-right">Economia</TableHead>
                <TableHead className="text-right">% do total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.key}>
                  <TableCell className="font-medium">{r.categoria}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {BRL(r.atual)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {BRL(r.telemed)}
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums text-emerald-600">
                    {BRL(r.economia)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {PCT(r.pct)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell className="font-semibold">Total</TableCell>
                <TableCell className="text-right font-semibold tabular-nums">
                  {BRL(totals.atual)}
                </TableCell>
                <TableCell className="text-right font-semibold tabular-nums">
                  {BRL(totals.telemed)}
                </TableCell>
                <TableCell className="text-right font-semibold tabular-nums text-emerald-600">
                  {BRL(totals.economia)}
                </TableCell>
                <TableCell className="text-right font-semibold tabular-nums">
                  100%
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

/* ──────────────────────────────────────────────────────────────
   Loading / error states
   ────────────────────────────────────────────────────────────── */

function LoadingState() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-80 rounded-xl" />
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <Card className="border-destructive/40">
      <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <div>
          <h3 className="font-semibold">
            Não foi possível carregar os dados financeiros
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Verifique sua conexão ou tente novamente em alguns instantes.
          </p>
        </div>
        <Button onClick={onRetry} variant="outline" size="sm">
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Tentar novamente
        </Button>
      </CardContent>
    </Card>
  );
}

/* ──────────────────────────────────────────────────────────────
   Page
   ────────────────────────────────────────────────────────────── */

type UiState = 'ready' | 'loading' | 'error';

// Shared simulator inputs (defaults taken from the legacy page)
const SIM_DEFAULTS = {
  pacientesMes: 8000,
  valConsulta: 60,
  durMedia: 15,
  diasMes: 22,
  medicos: 12,
  psicologos: 4,
  custoMedDia: 900,
  custoPsicoDia: 700,
};

export default function AdminFinanceiro() {
  const [uiState, setUiState] = useState<UiState>('ready');
  const [dateRangeLabel, setDateRangeLabel] =
    useState<string>('Últimos 12 meses');

  const handleRetry = useCallback(() => {
    setUiState('loading');
    window.setTimeout(() => setUiState('ready'), 600);
  }, []);

  return (
    <AdminLayout>
      <div className="space-y-6 p-5 md:p-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between"
        >
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
                Financeiro & Simulações
              </h1>
              <Badge variant="secondary" className="gap-1">
                <Sparkles className="h-3 w-3" /> IA
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Modelagem de custo, economia projetada e ROI para a operação
              municipal.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Calendar className="mr-1.5 h-3.5 w-3.5" />
                  {dateRangeLabel}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Período</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {[
                  'Últimos 30 dias',
                  'Últimos 3 meses',
                  'Últimos 6 meses',
                  'Últimos 12 meses',
                  'Ano atual',
                ].map((opt) => (
                  <DropdownMenuItem
                    key={opt}
                    onSelect={() => setDateRangeLabel(opt)}
                  >
                    {opt}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm">
                  <Download className="mr-1.5 h-3.5 w-3.5" /> Exportar relatório
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <FileText className="mr-2 h-3.5 w-3.5" /> PDF (resumo
                  executivo)
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <FileSpreadsheet className="mr-2 h-3.5 w-3.5" /> Excel (dados
                  brutos)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </motion.div>

        {uiState === 'loading' && <LoadingState />}
        {uiState === 'error' && <ErrorState onRetry={handleRetry} />}

        {uiState === 'ready' && (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="min-w-0 space-y-6">
              {/* KPI strip */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <KpiCard
                  index={0}
                  label="Economia estimada / mês"
                  value="R$ 1,2M"
                  delta={18}
                  deltaLabel="vs mês anterior"
                  icon={<Wallet className="h-4 w-4" />}
                  sparkPoints={[
                    820, 870, 905, 960, 1020, 1050, 1120, 1180, 1260,
                  ]}
                  sparkColor="#10b981"
                />
                <KpiCard
                  index={1}
                  label="Custo médio / consulta"
                  value="R$ 32"
                  delta={-8}
                  deltaLabel="vs trimestre"
                  icon={<DollarSign className="h-4 w-4" />}
                  sparkPoints={[48, 45, 42, 40, 38, 36, 35, 33, 32]}
                  sparkColor="#10b981"
                />
                <KpiCard
                  index={2}
                  label="ROI projetado (12m)"
                  value="324%"
                  delta={22}
                  deltaLabel="vs baseline"
                  icon={<TrendingUp className="h-4 w-4" />}
                  sparkPoints={[180, 200, 220, 240, 260, 280, 295, 310, 324]}
                  sparkColor="#2563eb"
                />
                <KpiCard
                  index={3}
                  label="Consultas simuladas"
                  value="12,4k"
                  delta={14}
                  deltaLabel="mês a mês"
                  icon={<Activity className="h-4 w-4" />}
                  sparkPoints={[7, 7.8, 8.6, 9.1, 9.9, 10.6, 11.3, 11.9, 12.4]}
                  sparkColor="#8b5cf6"
                />
              </div>

              {/* Tabs */}
              <Tabs defaultValue="overview" className="space-y-5">
                <TabsList className="flex h-auto flex-wrap">
                  <TabsTrigger value="overview">Visão Geral</TabsTrigger>
                  <TabsTrigger value="simulacoes">Simulações</TabsTrigger>
                  <TabsTrigger value="forecast">Forecast IA</TabsTrigger>
                  <TabsTrigger value="categorias">
                    Custo por categoria
                  </TabsTrigger>
                  <TabsTrigger value="roi">ROI Scenarios</TabsTrigger>
                </TabsList>

                {/* ── Overview ── */}
                <TabsContent value="overview" className="space-y-5">
                  <div className="grid gap-5 lg:grid-cols-[2fr_1fr]">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                          <BarChart3 className="h-4 w-4 text-primary" />
                          Economia ao longo do tempo
                        </CardTitle>
                        <p className="text-xs text-muted-foreground">
                          Últimos 12 meses — valores em R$
                        </p>
                      </CardHeader>
                      <CardContent>
                        <LineAreaChart data={ECONOMIA_12M} formatValue={BRL} />
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">
                          Distribuição de custos
                        </CardTitle>
                        <p className="text-xs text-muted-foreground">
                          Participação por categoria
                        </p>
                      </CardHeader>
                      <CardContent>
                        <DonutChart
                          data={DIST_CUSTOS}
                          centerLabel="total"
                          centerValue="100%"
                        />
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">
                        Comparativo mensal: presencial vs telemedicina
                      </CardTitle>
                      <p className="text-xs text-muted-foreground">
                        Custo total por modalidade
                      </p>
                    </CardHeader>
                    <CardContent>
                      <ComparativeBars
                        data={COMPARATIVO}
                        labelA="Presencial"
                        labelB="Telemedicina"
                        formatValue={BRL}
                      />
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* ── Simulações (reusing existing components) ── */}
                <TabsContent value="simulacoes" className="space-y-6">
                  <SimulatorBlock
                    title="Dashboard geral"
                    subtitle="Visão consolidada de receita, custo e margem simulada."
                  >
                    <DashboardTab
                      pacientesMes={SIM_DEFAULTS.pacientesMes}
                      valConsulta={SIM_DEFAULTS.valConsulta}
                      durMedia={SIM_DEFAULTS.durMedia}
                      diasMes={SIM_DEFAULTS.diasMes}
                      medicos={SIM_DEFAULTS.medicos}
                      psicologos={SIM_DEFAULTS.psicologos}
                      custoMedDia={SIM_DEFAULTS.custoMedDia}
                      custoPsicoDia={SIM_DEFAULTS.custoPsicoDia}
                    />
                  </SimulatorBlock>

                  <SimulatorBlock
                    title="Funil de consultas"
                    subtitle="Desdobramento por perfil de paciente e desfecho clínico."
                  >
                    <FunilConsultaTab
                      pacientesMes={SIM_DEFAULTS.pacientesMes}
                      durMedia={SIM_DEFAULTS.durMedia}
                      diasMes={SIM_DEFAULTS.diasMes}
                    />
                  </SimulatorBlock>

                  <SimulatorBlock
                    title="Cenários"
                    subtitle="Comparativo de planos e composições de operação."
                  >
                    <CenariosTab
                      valConsulta={SIM_DEFAULTS.valConsulta}
                      diasMes={SIM_DEFAULTS.diasMes}
                    />
                  </SimulatorBlock>

                  <SimulatorBlock
                    title="Potencial por cidade (SP)"
                    subtitle="Mapeamento de receita potencial por município paulista."
                  >
                    <CidadePotencialTab
                      valConsulta={SIM_DEFAULTS.valConsulta}
                      durMedia={SIM_DEFAULTS.durMedia}
                      diasMes={SIM_DEFAULTS.diasMes}
                    />
                  </SimulatorBlock>
                </TabsContent>

                {/* ── Forecast IA ── */}
                <TabsContent value="forecast">
                  <ForecastSection />
                </TabsContent>

                {/* ── Custo por categoria ── */}
                <TabsContent value="categorias">
                  <CategoryTable />
                </TabsContent>

                {/* ── ROI Scenarios ── */}
                <TabsContent value="roi">
                  <RoiCalculator />
                </TabsContent>
              </Tabs>
            </div>

            {/* Sidebar: AI insights (xl+) */}
            <aside className="hidden xl:block">
              <div className="sticky top-6">
                <AiInsightsPanel scope="admin" maxItems={4} compact />
              </div>
            </aside>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

/* ──────────────────────────────────────────────────────────────
   Simulator block wrapper
   ────────────────────────────────────────────────────────────── */

function SimulatorBlock({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="h-5 w-1 rounded-full bg-primary" />
        <div>
          <h2 className="text-base font-semibold tracking-tight">{title}</h2>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      <div>{children}</div>
    </section>
  );
}
