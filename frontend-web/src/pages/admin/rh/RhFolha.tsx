/**
 * RhFolha — Portal RH / Folha de Pagamento.
 *
 * Página executiva para gestão da folha mensal: KPIs de custo, composição
 * (waterfall), distribuição por departamento, simulador de reajuste,
 * evolução 12 meses e previsões de IA.
 *
 * Backend ainda é mock — consome `@/services/rhApi` via TanStack Query
 * (QueryClient singleton local, sem depender de provider externo).
 * Gráficos em SVG puro, zero dependências novas.
 */

import { useMemo, useState, type ReactNode, type ChangeEvent } from 'react';
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Wallet,
  TrendingUp,
  Percent,
  Users,
  Download,
  Lock,
  ChevronDown,
  Search,
  ArrowUpDown,
  FileDown,
  Sparkles,
  Calculator,
  LineChart,
  Receipt,
  X,
} from 'lucide-react';
import { format, parse, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

import { RhLayout } from '@/components/admin/rh/RhLayout';
import { AiInsightsPanel } from '@/components/admin/ai/AiInsightsPanel';
import { AiForecastChart } from '@/components/admin/ai/AiForecastChart';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

import {
  getFolha,
  listColaboradores,
  listDepartamentos,
} from '@/services/rhApi';
import type {
  Colaborador,
  Departamento,
  FolhaItem,
  FolhaPagamento,
} from '@/types/rh';

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
/* Formatters                                                          */
/* ------------------------------------------------------------------ */

const brl = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
});
const brl2 = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 2,
});
const pctFmt = new Intl.NumberFormat('pt-BR', {
  style: 'percent',
  maximumFractionDigits: 1,
});
const intFmt = new Intl.NumberFormat('pt-BR');

function getInitials(nome: string): string {
  const parts = nome.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase();
}

function formatMesLabel(mes: string): string {
  try {
    const d = parse(`${mes}-01`, 'yyyy-MM-dd', new Date());
    return format(d, 'MMM/yy', { locale: ptBR });
  } catch {
    return mes;
  }
}

function formatMesLong(mes: string): string {
  try {
    const d = parse(`${mes}-01`, 'yyyy-MM-dd', new Date());
    return format(d, "MMMM 'de' yyyy", { locale: ptBR });
  } catch {
    return mes;
  }
}

/* ------------------------------------------------------------------ */
/* Animation                                                           */
/* ------------------------------------------------------------------ */

function stagger(index: number) {
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
/* Gerar últimos 12 meses                                              */
/* ------------------------------------------------------------------ */

function buildLast12Months(refIso = '2026-04-08'): string[] {
  const ref = new Date(refIso);
  const list: string[] = [];
  for (let i = 11; i >= 0; i -= 1) {
    list.push(format(subMonths(ref, i), 'yyyy-MM'));
  }
  return list;
}

/* ------------------------------------------------------------------ */
/* Sparkline SVG                                                       */
/* ------------------------------------------------------------------ */

interface SparklineProps {
  data: number[];
  stroke?: string;
  fill?: string;
  width?: number;
  height?: number;
}

const Sparkline = ({
  data,
  stroke = 'currentColor',
  fill = 'currentColor',
  width = 120,
  height = 36,
}: SparklineProps) => {
  if (data.length === 0) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const step = data.length > 1 ? width / (data.length - 1) : 0;
  const points = data.map((v, i) => {
    const x = i * step;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return { x, y };
  });
  const path = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');
  const area = `${path} L ${width} ${height} L 0 ${height} Z`;
  return (
    <svg width={width} height={height} className="overflow-visible">
      <path d={area} fill={fill} fillOpacity={0.15} stroke="none" />
      <path
        d={path}
        fill="none"
        stroke={stroke}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

/* ------------------------------------------------------------------ */
/* KPI Card                                                            */
/* ------------------------------------------------------------------ */

interface KpiCardConfig {
  label: string;
  value: number;
  delta?: number;
  deltaLabel?: string;
  sub?: string;
  icon: typeof Wallet;
  gradient: string;
  format: 'currency' | 'percent' | 'int';
  sparkline: number[];
}

interface KpiCardProps {
  cfg: KpiCardConfig;
  index: number;
}

const KpiCard = ({ cfg, index }: KpiCardProps) => {
  const Icon = cfg.icon;
  const display =
    cfg.format === 'currency'
      ? brl.format(cfg.value)
      : cfg.format === 'percent'
        ? pctFmt.format(cfg.value)
        : intFmt.format(cfg.value);
  const deltaUp = (cfg.delta ?? 0) >= 0;
  return (
    <motion.div {...stagger(index)}>
      <Card className="relative overflow-hidden border-border/60 bg-gradient-to-br from-card to-card/60">
        <div
          className={cn(
            'absolute inset-x-0 top-0 h-1 bg-gradient-to-r',
            cfg.gradient
          )}
          aria-hidden
        />
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-3">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {cfg.label}
            </CardTitle>
            <div
              className={cn(
                'inline-flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br text-white shadow-sm',
                cfg.gradient
              )}
            >
              <Icon className="h-4 w-4" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-2xl font-bold tabular-nums">{display}</div>
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-col">
              {typeof cfg.delta === 'number' && (
                <span
                  className={cn(
                    'text-xs font-semibold',
                    deltaUp
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                  )}
                >
                  {deltaUp ? '+' : ''}
                  {cfg.delta.toFixed(1)}% {cfg.deltaLabel ?? 'vs mês anterior'}
                </span>
              )}
              {cfg.sub && (
                <span className="text-[11px] text-muted-foreground">
                  {cfg.sub}
                </span>
              )}
            </div>
            <div className="text-primary/70">
              <Sparkline data={cfg.sparkline} />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

/* ------------------------------------------------------------------ */
/* Waterfall SVG                                                       */
/* ------------------------------------------------------------------ */

interface WaterfallBar {
  label: string;
  value: number; // delta (positivo ou negativo)
  color: string;
  isTotal?: boolean;
  absolute?: number; // valor a exibir quando total
}

interface WaterfallProps {
  bars: WaterfallBar[];
}

const Waterfall = ({ bars }: WaterfallProps) => {
  const width = 820;
  const height = 280;
  const padX = 40;
  const padTop = 30;
  const padBottom = 60;
  const innerW = width - padX * 2;
  const innerH = height - padTop - padBottom;
  const gap = 12;
  const barW = (innerW - gap * (bars.length - 1)) / bars.length;

  // Compute cumulative
  const computed = bars.reduce<
    Array<(typeof bars)[number] & { start: number; end: number }>
  >((acc, b) => {
    const running = acc.length === 0 ? 0 : acc[acc.length - 1]!.end;
    const start = b.isTotal ? 0 : running;
    const end = b.isTotal ? (b.absolute ?? 0) : running + b.value;
    acc.push({ ...b, start, end: b.isTotal ? running : end });
    return acc;
  }, []);

  const maxAbs = Math.max(
    ...computed.map((c) => Math.max(Math.abs(c.start), Math.abs(c.end)))
  );
  const scale = innerH / (maxAbs || 1);

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full min-w-[640px]"
      >
        <line
          x1={padX}
          x2={width - padX}
          y1={padTop + innerH}
          y2={padTop + innerH}
          stroke="currentColor"
          strokeOpacity={0.15}
        />
        {computed.map((c, i) => {
          const x = padX + i * (barW + gap);
          const y1 = padTop + innerH - c.start * scale;
          const y2 = padTop + innerH - c.end * scale;
          const rectY = Math.min(y1, y2);
          const rectH = Math.max(2, Math.abs(y2 - y1));
          const displayValue = c.isTotal ? (c.absolute ?? 0) : c.value;
          return (
            <motion.g
              key={c.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.08, ease: 'easeOut' }}
            >
              <rect
                x={x}
                y={rectY}
                width={barW}
                height={rectH}
                rx={6}
                fill={c.color}
                fillOpacity={0.9}
              />
              <text
                x={x + barW / 2}
                y={rectY - 8}
                textAnchor="middle"
                className="fill-foreground text-[11px] font-semibold"
              >
                {brl.format(displayValue)}
              </text>
              <text
                x={x + barW / 2}
                y={padTop + innerH + 20}
                textAnchor="middle"
                className="fill-muted-foreground text-[11px]"
              >
                {c.label}
              </text>
              {i < computed.length - 1 && !c.isTotal && (
                <line
                  x1={x + barW}
                  x2={x + barW + gap}
                  y1={y2}
                  y2={y2}
                  stroke="currentColor"
                  strokeOpacity={0.3}
                  strokeDasharray="3 3"
                />
              )}
            </motion.g>
          );
        })}
      </svg>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Histograma salarial SVG                                             */
/* ------------------------------------------------------------------ */

interface HistogramProps {
  values: number[];
  bucketSize?: number;
}

const SalaryHistogram = ({ values, bucketSize = 2000 }: HistogramProps) => {
  const buckets = useMemo(() => {
    if (values.length === 0)
      return [] as { label: string; count: number; min: number }[];
    const max = Math.max(...values);
    const n = Math.ceil(max / bucketSize) + 1;
    const arr = Array.from({ length: n }, (_, i) => ({
      label: `${brl.format(i * bucketSize)}–${brl.format((i + 1) * bucketSize)}`,
      count: 0,
      min: i * bucketSize,
    }));
    values.forEach((v) => {
      const idx = Math.min(arr.length - 1, Math.floor(v / bucketSize));
      const bucket = arr[idx];
      if (bucket) bucket.count += 1;
    });
    // drop trailing empty
    while (arr.length > 1 && arr[arr.length - 1]?.count === 0) arr.pop();
    return arr;
  }, [values, bucketSize]);

  const width = 560;
  const height = 220;
  const padX = 30;
  const padTop = 16;
  const padBottom = 44;
  const innerW = width - padX * 2;
  const innerH = height - padTop - padBottom;
  const maxCount = Math.max(1, ...buckets.map((b) => b.count));
  const gap = 6;
  const barW =
    buckets.length > 0
      ? (innerW - gap * (buckets.length - 1)) / buckets.length
      : 0;

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full min-w-[420px]"
      >
        {buckets.map((b, i) => {
          const h = (b.count / maxCount) * innerH;
          const x = padX + i * (barW + gap);
          const y = padTop + innerH - h;
          return (
            <motion.g
              key={b.label}
              initial={{ opacity: 0, scaleY: 0 }}
              animate={{ opacity: 1, scaleY: 1 }}
              transition={{ duration: 0.4, delay: i * 0.05, ease: 'easeOut' }}
              style={{
                transformOrigin: `${x + barW / 2}px ${padTop + innerH}px`,
              }}
            >
              <rect
                x={x}
                y={y}
                width={barW}
                height={Math.max(2, h)}
                rx={4}
                className="fill-indigo-500/80"
              />
              <text
                x={x + barW / 2}
                y={y - 4}
                textAnchor="middle"
                className="fill-foreground text-[10px] font-semibold"
              >
                {b.count}
              </text>
              <text
                x={x + barW / 2}
                y={padTop + innerH + 14}
                textAnchor="middle"
                className="fill-muted-foreground text-[9px]"
              >
                {brl.format(b.min)}
              </text>
            </motion.g>
          );
        })}
      </svg>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Line chart 12 meses                                                 */
/* ------------------------------------------------------------------ */

interface LinePoint {
  mes: string;
  bruto: number;
  liquido: number;
  encargos: number;
}

const MonthlyLineChart = ({ data }: { data: LinePoint[] }) => {
  const width = 820;
  const height = 280;
  const padX = 50;
  const padTop = 20;
  const padBottom = 40;
  const innerW = width - padX * 2;
  const innerH = height - padTop - padBottom;
  if (data.length === 0) return null;
  const max = Math.max(
    ...data.flatMap((d) => [d.bruto, d.liquido, d.encargos])
  );
  const min = 0;
  const step = data.length > 1 ? innerW / (data.length - 1) : 0;
  const toY = (v: number): number =>
    padTop + innerH - ((v - min) / (max - min || 1)) * innerH;

  const series: {
    key: 'bruto' | 'liquido' | 'encargos';
    label: string;
    color: string;
  }[] = [
    { key: 'bruto', label: 'Bruto', color: '#6366f1' },
    { key: 'liquido', label: 'Líquido', color: '#10b981' },
    { key: 'encargos', label: 'Encargos', color: '#f59e0b' },
  ];

  const pathFor = (key: 'bruto' | 'liquido' | 'encargos'): string =>
    data
      .map((d, i) => {
        const x = padX + i * step;
        const y = toY(d[key]);
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');

  const ticks = 4;
  const tickValues = Array.from(
    { length: ticks + 1 },
    (_, i) => (max / ticks) * i
  );

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full min-w-[640px]"
      >
        {tickValues.map((t) => (
          <g key={t}>
            <line
              x1={padX}
              x2={width - padX}
              y1={toY(t)}
              y2={toY(t)}
              stroke="currentColor"
              strokeOpacity={0.08}
            />
            <text
              x={padX - 8}
              y={toY(t) + 4}
              textAnchor="end"
              className="fill-muted-foreground text-[10px]"
            >
              {brl.format(t)}
            </text>
          </g>
        ))}
        {data.map((d, i) => (
          <text
            key={d.mes}
            x={padX + i * step}
            y={padTop + innerH + 18}
            textAnchor="middle"
            className="fill-muted-foreground text-[10px]"
          >
            {formatMesLabel(d.mes)}
          </text>
        ))}
        {series.map((s, idx) => (
          <motion.path
            key={s.key}
            d={pathFor(s.key)}
            fill="none"
            stroke={s.color}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 0.9, delay: idx * 0.15, ease: 'easeOut' }}
          />
        ))}
        {/* legend */}
        <g transform={`translate(${padX}, ${padTop - 6})`}>
          {series.map((s, i) => (
            <g key={s.key} transform={`translate(${i * 120}, 0)`}>
              <rect width={10} height={10} rx={2} fill={s.color} />
              <text
                x={16}
                y={9}
                className="fill-foreground text-[11px] font-medium"
              >
                {s.label}
              </text>
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Skeletons                                                           */
/* ------------------------------------------------------------------ */

const KpiSkeletons = () => (
  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
    {Array.from({ length: 4 }).map((_, i) => (
      <Card key={i}>
        <CardHeader className="pb-2">
          <Skeleton className="h-3 w-24" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-4 w-full" />
        </CardContent>
      </Card>
    ))}
  </div>
);

/* ------------------------------------------------------------------ */
/* Main Page content                                                    */
/* ------------------------------------------------------------------ */

type SortKey = 'nome' | 'bruto' | 'liquido' | 'departamento';
type SortDir = 'asc' | 'desc';

const PAGE_SIZE = 10;

const RhFolhaContent = () => {
  const months = useMemo(() => buildLast12Months(), []);
  const [selectedMes, setSelectedMes] = useState<string>(
    months[months.length - 1] ?? '2026-04'
  );
  const [activeTab, setActiveTab] = useState<string>('detalhada');

  // Detalhada
  const [search, setSearch] = useState<string>('');
  const [sortKey, setSortKey] = useState<SortKey>('bruto');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState<number>(1);
  const [detalheColaborador, setDetalheColaborador] =
    useState<Colaborador | null>(null);

  // Simulador
  const [reajustePct, setReajustePct] = useState<number>(5);
  const [deptoFiltro, setDeptoFiltro] = useState<string>('');
  const [vigencia, setVigencia] = useState<string>('2026-05');

  // Queries
  const folhaQuery = useQuery<FolhaPagamento>({
    queryKey: ['rh', 'folha', selectedMes],
    queryFn: () => getFolha(selectedMes),
  });

  const prevMes = useMemo(() => {
    try {
      const d = parse(`${selectedMes}-01`, 'yyyy-MM-dd', new Date());
      return format(subMonths(d, 1), 'yyyy-MM');
    } catch {
      return selectedMes;
    }
  }, [selectedMes]);

  const folhaPrevQuery = useQuery<FolhaPagamento>({
    queryKey: ['rh', 'folha', prevMes],
    queryFn: () => getFolha(prevMes),
  });

  const colsQuery = useQuery({
    queryKey: ['rh', 'colaboradores', 'all'],
    queryFn: () => listColaboradores({ pageSize: 500 }),
  });

  const deptosQuery = useQuery<Departamento[]>({
    queryKey: ['rh', 'departamentos'],
    queryFn: () => listDepartamentos(),
  });

  const folha = folhaQuery.data;
  const folhaPrev = folhaPrevQuery.data;
  const colaboradores = useMemo(
    () => colsQuery.data?.items ?? [],
    [colsQuery.data]
  );
  const departamentos = useMemo(
    () => deptosQuery.data ?? [],
    [deptosQuery.data]
  );

  const colMap = useMemo(() => {
    const m = new Map<string, Colaborador>();
    colaboradores.forEach((c) => m.set(c.id, c));
    return m;
  }, [colaboradores]);

  /* ---------------- Series históricas (12 meses sintéticas) ---------------- */
  const history12 = useMemo<LinePoint[]>(() => {
    if (!folha) return [];
    // Gera projeção retroativa baseada em crescimento 0.8%/mês
    const base = folha.totalBruto;
    const baseLiq = folha.totalLiquido;
    const baseEnc = folha.totalEncargos;
    const growth = 0.008;
    return months.map((mes, i) => {
      const diff = months.length - 1 - i;
      const factor = 1 / Math.pow(1 + growth, diff);
      return {
        mes,
        bruto: Math.round(base * factor),
        liquido: Math.round(baseLiq * factor),
        encargos: Math.round(baseEnc * factor),
      };
    });
  }, [folha, months]);

  /* ---------------- KPI deltas ---------------- */
  const deltaBruto = useMemo(() => {
    if (!folha || !folhaPrev || folhaPrev.totalBruto === 0) return 0;
    return (
      ((folha.totalBruto - folhaPrev.totalBruto) / folhaPrev.totalBruto) * 100
    );
  }, [folha, folhaPrev]);
  const deltaLiq = useMemo(() => {
    if (!folha || !folhaPrev || folhaPrev.totalLiquido === 0) return 0;
    return (
      ((folha.totalLiquido - folhaPrev.totalLiquido) / folhaPrev.totalLiquido) *
      100
    );
  }, [folha, folhaPrev]);

  const custoMedio =
    folha && folha.colaboradores > 0
      ? folha.totalBruto / folha.colaboradores
      : 0;
  const custoMedioPrev =
    folhaPrev && folhaPrev.colaboradores > 0
      ? folhaPrev.totalBruto / folhaPrev.colaboradores
      : 0;
  const deltaCustoMedio =
    custoMedioPrev > 0
      ? ((custoMedio - custoMedioPrev) / custoMedioPrev) * 100
      : 0;

  const pctEncargos =
    folha && folha.totalBruto > 0 ? folha.totalEncargos / folha.totalBruto : 0;

  const kpis: KpiCardConfig[] = useMemo(() => {
    const histBruto = history12.slice(-6).map((h) => h.bruto);
    const histLiq = history12.slice(-6).map((h) => h.liquido);
    const histEnc = history12.slice(-6).map((h) => h.encargos);
    const histMed = history12
      .slice(-6)
      .map((h) =>
        folha && folha.colaboradores > 0 ? h.bruto / folha.colaboradores : 0
      );
    return [
      {
        label: 'Custo Total Bruto',
        value: folha?.totalBruto ?? 0,
        delta: deltaBruto,
        icon: Wallet,
        gradient: 'from-indigo-500 to-violet-500',
        format: 'currency',
        sparkline: histBruto,
      },
      {
        label: 'Custo Líquido',
        value: folha?.totalLiquido ?? 0,
        delta: deltaLiq,
        icon: TrendingUp,
        gradient: 'from-emerald-500 to-teal-500',
        format: 'currency',
        sparkline: histLiq,
      },
      {
        label: 'Encargos',
        value: folha?.totalEncargos ?? 0,
        deltaLabel: 'sobre bruto',
        delta: pctEncargos * 100,
        sub: `${pctFmt.format(pctEncargos)} do bruto`,
        icon: Percent,
        gradient: 'from-amber-500 to-orange-500',
        format: 'currency',
        sparkline: histEnc,
      },
      {
        label: 'Custo Médio / Colaborador',
        value: custoMedio,
        delta: deltaCustoMedio,
        icon: Users,
        gradient: 'from-sky-500 to-cyan-500',
        format: 'currency',
        sparkline: histMed,
      },
    ];
  }, [
    folha,
    deltaBruto,
    deltaLiq,
    pctEncargos,
    custoMedio,
    deltaCustoMedio,
    history12,
  ]);

  /* ---------------- Waterfall bars ---------------- */
  const waterfallBars: WaterfallBar[] = useMemo(() => {
    if (!folha) return [];
    const inss = folha.itens.reduce((s, i) => s + i.inss, 0);
    const irrf = folha.itens.reduce((s, i) => s + i.irrf, 0);
    const outros = folha.totalDescontos - inss - irrf;
    return [
      {
        label: 'Bruto',
        value: folha.totalBruto,
        color: '#6366f1',
        isTotal: true,
        absolute: folha.totalBruto,
      },
      { label: '− INSS', value: -inss, color: '#f43f5e' },
      { label: '− IRRF', value: -irrf, color: '#ef4444' },
      { label: '− Outros', value: -Math.max(0, outros), color: '#f97316' },
      {
        label: 'Líquido',
        value: folha.totalLiquido,
        color: '#10b981',
        isTotal: true,
        absolute: folha.totalLiquido,
      },
      {
        label: 'Encargos',
        value: folha.totalEncargos,
        color: '#f59e0b',
        isTotal: true,
        absolute: folha.totalEncargos,
      },
    ];
  }, [folha]);

  /* ---------------- Custo por depto ---------------- */
  const deptoCostList = useMemo(() => {
    if (!folha)
      return [] as { nome: string; total: number; headcount: number }[];
    const map = new Map<string, { total: number; headcount: number }>();
    folha.itens.forEach((i) => {
      const col = colMap.get(i.colaboradorId);
      if (!col) return;
      const key = col.departamento;
      const cur = map.get(key) ?? { total: 0, headcount: 0 };
      cur.total += i.bruto;
      cur.headcount += 1;
      map.set(key, cur);
    });
    return Array.from(map.entries())
      .map(([nome, v]) => ({ nome, ...v }))
      .sort((a, b) => b.total - a.total);
  }, [folha, colMap]);

  const deptoCostTotal = deptoCostList.reduce((s, d) => s + d.total, 0);

  /* ---------------- Histograma ---------------- */
  const salarios = useMemo(() => {
    if (!folha) return [] as number[];
    return folha.itens.map((i) => i.bruto);
  }, [folha]);

  /* ---------------- Tabela filtrada ---------------- */
  const filteredItens = useMemo<FolhaItem[]>(() => {
    if (!folha) return [];
    let rows = folha.itens;
    const q = search.trim().toLowerCase();
    if (q) {
      rows = rows.filter((i) => {
        const c = colMap.get(i.colaboradorId);
        if (!c) return false;
        return (
          c.nome.toLowerCase().includes(q) ||
          c.cargo.toLowerCase().includes(q) ||
          c.departamento.toLowerCase().includes(q)
        );
      });
    }
    const sorted = [...rows].sort((a, b) => {
      const ca = colMap.get(a.colaboradorId);
      const cb = colMap.get(b.colaboradorId);
      let va: string | number = 0;
      let vb: string | number = 0;
      if (sortKey === 'nome') {
        va = ca?.nome ?? '';
        vb = cb?.nome ?? '';
      } else if (sortKey === 'departamento') {
        va = ca?.departamento ?? '';
        vb = cb?.departamento ?? '';
      } else if (sortKey === 'bruto') {
        va = a.bruto;
        vb = b.bruto;
      } else {
        va = a.liquido;
        vb = b.liquido;
      }
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [folha, search, sortKey, sortDir, colMap]);

  const totalPages = Math.max(1, Math.ceil(filteredItens.length / PAGE_SIZE));
  const pagedItens = filteredItens.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  const toggleSort = (key: SortKey): void => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  /* ---------------- Totais consolidados da tabela ---------------- */
  const tableTotals = useMemo(() => {
    return filteredItens.reduce(
      (acc, i) => {
        acc.bruto += i.bruto;
        acc.inss += i.inss;
        acc.irrf += i.irrf;
        acc.fgts += i.fgts;
        acc.beneficios += i.beneficios;
        acc.liquido += i.liquido;
        return acc;
      },
      { bruto: 0, inss: 0, irrf: 0, fgts: 0, beneficios: 0, liquido: 0 }
    );
  }, [filteredItens]);

  /* ---------------- Simulador ---------------- */
  const simulacao = useMemo(() => {
    if (!folha) {
      return {
        custoAtual: 0,
        custoProjetado: 0,
        delta: 0,
        deltaPct: 0,
        impactados: 0,
        rows: [] as { id: string; nome: string; atual: number; novo: number }[],
      };
    }
    const factor = 1 + reajustePct / 100;
    let custoAtual = 0;
    let custoProjetado = 0;
    let impactados = 0;
    const rows: { id: string; nome: string; atual: number; novo: number }[] =
      [];
    folha.itens.forEach((i) => {
      const col = colMap.get(i.colaboradorId);
      const inScope = !deptoFiltro || col?.departamento === deptoFiltro;
      custoAtual += i.bruto;
      if (inScope) {
        impactados += 1;
        const novo = Math.round(i.bruto * factor);
        custoProjetado += novo;
        rows.push({
          id: i.colaboradorId,
          nome: col?.nome ?? i.colaboradorId,
          atual: i.bruto,
          novo,
        });
      } else {
        custoProjetado += i.bruto;
      }
    });
    const delta = custoProjetado - custoAtual;
    const deltaPct = custoAtual > 0 ? delta / custoAtual : 0;
    rows.sort((a, b) => b.novo - a.novo);
    return {
      custoAtual,
      custoProjetado,
      delta,
      deltaPct,
      impactados,
      rows: rows.slice(0, 15),
    };
  }, [folha, reajustePct, deptoFiltro, colMap]);

  /* ---------------- Previsões IA ---------------- */
  const forecastHist = history12.map((h) => h.bruto);
  const forecastFuture = useMemo(() => {
    if (history12.length < 2) return [];
    const last = history12[history12.length - 1]?.bruto ?? 0;
    const avgGrowth = 0.008;
    return Array.from({ length: 6 }, (_, i) =>
      Math.round(last * Math.pow(1 + avgGrowth, i + 1))
    );
  }, [history12]);

  const cenarios = useMemo(() => {
    const last =
      history12[history12.length - 1]?.bruto ?? folha?.totalBruto ?? 0;
    return {
      otimista: Math.round(last * Math.pow(1.003, 12)),
      realista: Math.round(last * Math.pow(1.008, 12)),
      pessimista: Math.round(last * Math.pow(1.015, 12)),
    };
  }, [history12, folha]);

  /* ---------------- Evolução stats ---------------- */
  const evolStats = useMemo(() => {
    if (history12.length === 0)
      return { yoy: 0, pico: 0, picoMes: '', projecao: 0 };
    const first = history12[0]?.bruto ?? 0;
    const last = history12[history12.length - 1]?.bruto ?? 0;
    const yoy = first > 0 ? ((last - first) / first) * 100 : 0;
    const pico = history12.reduce((a, b) => (a.bruto > b.bruto ? a : b));
    const projecao = forecastFuture[0] ?? last;
    return { yoy, pico: pico.bruto, picoMes: pico.mes, projecao };
  }, [history12, forecastFuture]);

  /* ---------------- Ações ---------------- */
  const handleFecharFolha = (): void => {
    toast.success(`Folha de ${formatMesLong(selectedMes)} fechada (simulação)`);
  };
  const handleExportPdf = (): void => {
    toast.info('Exportação em PDF preparada (mock).');
  };
  const handleExportCsv = (): void => {
    toast.info('CSV gerado com sucesso (mock).');
  };
  const handleAplicarReajuste = (): void => {
    toast.success(
      `Reajuste de ${reajustePct}% aplicado a ${simulacao.impactados} colaboradores (simulação)`
    );
  };

  /* ---------------- Header actions ---------------- */
  const headerActions: ReactNode = (
    <div className="flex flex-wrap items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5">
            {formatMesLong(selectedMes)}
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="max-h-80 overflow-y-auto">
          <DropdownMenuLabel>Competência</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {months
            .slice()
            .reverse()
            .map((m) => (
              <DropdownMenuItem key={m} onClick={() => setSelectedMes(m)}>
                {formatMesLong(m)}
              </DropdownMenuItem>
            ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5"
        onClick={handleExportPdf}
      >
        <Download className="h-4 w-4" />
        Exportar PDF
      </Button>
      <Button size="sm" className="gap-1.5" onClick={handleFecharFolha}>
        <Lock className="h-4 w-4" />
        Fechar folha
      </Button>
    </div>
  );

  const isLoading = folhaQuery.isLoading || colsQuery.isLoading;

  return (
    <RhLayout
      title="Folha de Pagamento"
      subtitle="Gestão de custos com pessoal"
      actions={headerActions}
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-6">
          {/* Strip de meses */}
          <motion.div {...stagger(0)}>
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {months.map((m) => {
                const active = m === selectedMes;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setSelectedMes(m)}
                    className={cn(
                      'flex-shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all',
                      active
                        ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                        : 'border-border/60 bg-card text-muted-foreground hover:border-primary/60 hover:text-foreground'
                    )}
                  >
                    {formatMesLabel(m)}
                  </button>
                );
              })}
            </div>
          </motion.div>

          {/* KPIs */}
          {isLoading ? (
            <KpiSkeletons />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {kpis.map((k, i) => (
                <KpiCard key={k.label} cfg={k} index={i} />
              ))}
            </div>
          )}

          {/* Waterfall */}
          <motion.div {...stagger(1)}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Receipt className="h-4 w-4 text-primary" />
                  Composição da folha — {formatMesLong(selectedMes)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {folha ? (
                  <Waterfall bars={waterfallBars} />
                ) : (
                  <Skeleton className="h-64 w-full" />
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Grid 2 colunas */}
          <div className="grid gap-6 lg:grid-cols-2">
            <motion.div {...stagger(2)}>
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="text-base">
                    Custo por departamento
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {deptoCostList.length === 0 && (
                    <div className="text-sm text-muted-foreground">
                      Sem dados.
                    </div>
                  )}
                  {deptoCostList.map((d, i) => {
                    const pct =
                      deptoCostTotal > 0 ? d.total / deptoCostTotal : 0;
                    return (
                      <motion.div
                        key={d.nome}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.35, delay: i * 0.05 }}
                        className="space-y-1.5"
                      >
                        <div className="flex items-center justify-between gap-3 text-xs">
                          <span className="truncate font-medium">{d.nome}</span>
                          <div className="flex items-center gap-3 tabular-nums">
                            <span className="text-muted-foreground">
                              {d.headcount} pess.
                            </span>
                            <span className="font-semibold">
                              {brl.format(d.total)}
                            </span>
                            <Badge variant="secondary" className="tabular-nums">
                              {pctFmt.format(pct)}
                            </Badge>
                          </div>
                        </div>
                        <Progress value={pct * 100} className="h-2" />
                      </motion.div>
                    );
                  })}
                </CardContent>
              </Card>
            </motion.div>

            <motion.div {...stagger(3)}>
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="text-base">
                    Distribuição salarial
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {salarios.length > 0 ? (
                    <SalaryHistogram values={salarios} />
                  ) : (
                    <Skeleton className="h-48 w-full" />
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Tabs */}
          <motion.div {...stagger(4)}>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full max-w-2xl grid-cols-4">
                <TabsTrigger value="detalhada" className="gap-1.5">
                  <Receipt className="h-3.5 w-3.5" /> Detalhada
                </TabsTrigger>
                <TabsTrigger value="simulador" className="gap-1.5">
                  <Calculator className="h-3.5 w-3.5" /> Simulador
                </TabsTrigger>
                <TabsTrigger value="evolucao" className="gap-1.5">
                  <LineChart className="h-3.5 w-3.5" /> Evolução
                </TabsTrigger>
                <TabsTrigger value="ia" className="gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" /> Previsões IA
                </TabsTrigger>
              </TabsList>

              {/* ---------------- Tab: Detalhada ---------------- */}
              <TabsContent value="detalhada" className="mt-4">
                <Card>
                  <CardHeader className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <CardTitle className="text-base">
                        Folha detalhada
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            value={search}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => {
                              setSearch(e.target.value);
                              setPage(1);
                            }}
                            placeholder="Buscar colaborador..."
                            className="h-9 w-56 pl-8"
                          />
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleExportCsv}
                          className="gap-1.5"
                        >
                          <FileDown className="h-4 w-4" /> CSV
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>
                              <button
                                type="button"
                                onClick={() => toggleSort('nome')}
                                className="inline-flex items-center gap-1 font-medium"
                              >
                                Colaborador <ArrowUpDown className="h-3 w-3" />
                              </button>
                            </TableHead>
                            <TableHead>
                              <button
                                type="button"
                                onClick={() => toggleSort('departamento')}
                                className="inline-flex items-center gap-1 font-medium"
                              >
                                Depto <ArrowUpDown className="h-3 w-3" />
                              </button>
                            </TableHead>
                            <TableHead className="text-right">
                              <button
                                type="button"
                                onClick={() => toggleSort('bruto')}
                                className="inline-flex items-center gap-1 font-medium"
                              >
                                Bruto <ArrowUpDown className="h-3 w-3" />
                              </button>
                            </TableHead>
                            <TableHead className="text-right">INSS</TableHead>
                            <TableHead className="text-right">IRRF</TableHead>
                            <TableHead className="text-right">FGTS</TableHead>
                            <TableHead className="text-right">
                              Benefícios
                            </TableHead>
                            <TableHead className="text-right">
                              <button
                                type="button"
                                onClick={() => toggleSort('liquido')}
                                className="inline-flex items-center gap-1 font-medium"
                              >
                                Líquido <ArrowUpDown className="h-3 w-3" />
                              </button>
                            </TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {pagedItens.length === 0 && (
                            <TableRow>
                              <TableCell
                                colSpan={9}
                                className="py-12 text-center text-muted-foreground"
                              >
                                {isLoading
                                  ? 'Carregando folha...'
                                  : 'Nenhum item encontrado.'}
                              </TableCell>
                            </TableRow>
                          )}
                          {pagedItens.map((it) => {
                            const col = colMap.get(it.colaboradorId);
                            return (
                              <TableRow
                                key={it.colaboradorId}
                                className="cursor-pointer hover:bg-muted/50"
                                onClick={() =>
                                  col && setDetalheColaborador(col)
                                }
                              >
                                <TableCell>
                                  <div className="flex items-center gap-2.5">
                                    <Avatar className="h-8 w-8">
                                      {col?.avatarUrl && (
                                        <AvatarImage
                                          src={col.avatarUrl}
                                          alt={col.nome}
                                        />
                                      )}
                                      <AvatarFallback className="text-[10px]">
                                        {getInitials(col?.nome ?? '??')}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0">
                                      <div className="truncate font-medium">
                                        {col?.nome ?? it.colaboradorId}
                                      </div>
                                      <div className="truncate text-xs text-muted-foreground">
                                        {col?.cargo}
                                      </div>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant="outline"
                                    className="font-normal"
                                  >
                                    {col?.departamento ?? '—'}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right tabular-nums">
                                  {brl.format(it.bruto)}
                                </TableCell>
                                <TableCell className="text-right tabular-nums text-rose-600 dark:text-rose-400">
                                  −{brl.format(it.inss)}
                                </TableCell>
                                <TableCell className="text-right tabular-nums text-rose-600 dark:text-rose-400">
                                  −{brl.format(it.irrf)}
                                </TableCell>
                                <TableCell className="text-right tabular-nums">
                                  {brl.format(it.fgts)}
                                </TableCell>
                                <TableCell className="text-right tabular-nums">
                                  {brl.format(it.beneficios)}
                                </TableCell>
                                <TableCell className="text-right font-semibold tabular-nums">
                                  {brl.format(it.liquido)}
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (col) setDetalheColaborador(col);
                                    }}
                                  >
                                    Holerite
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                        <TableFooter className="sticky bottom-0 bg-muted/70 backdrop-blur">
                          <TableRow>
                            <TableCell colSpan={2} className="font-semibold">
                              Totais ({filteredItens.length} itens)
                            </TableCell>
                            <TableCell className="text-right font-semibold tabular-nums">
                              {brl.format(tableTotals.bruto)}
                            </TableCell>
                            <TableCell className="text-right font-semibold tabular-nums">
                              −{brl.format(tableTotals.inss)}
                            </TableCell>
                            <TableCell className="text-right font-semibold tabular-nums">
                              −{brl.format(tableTotals.irrf)}
                            </TableCell>
                            <TableCell className="text-right font-semibold tabular-nums">
                              {brl.format(tableTotals.fgts)}
                            </TableCell>
                            <TableCell className="text-right font-semibold tabular-nums">
                              {brl.format(tableTotals.beneficios)}
                            </TableCell>
                            <TableCell className="text-right font-semibold tabular-nums">
                              {brl.format(tableTotals.liquido)}
                            </TableCell>
                            <TableCell />
                          </TableRow>
                        </TableFooter>
                      </Table>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between gap-3 p-3 text-xs text-muted-foreground">
                      <span>
                        Página {page} de {totalPages}
                      </span>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={page <= 1}
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                        >
                          Anterior
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={page >= totalPages}
                          onClick={() =>
                            setPage((p) => Math.min(totalPages, p + 1))
                          }
                        >
                          Próxima
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ---------------- Tab: Simulador ---------------- */}
              <TabsContent value="simulador" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Calculator className="h-4 w-4 text-primary" />
                      Simulador de reajuste salarial
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="space-y-1.5">
                        <span className="text-xs font-medium text-muted-foreground">
                          % de reajuste global
                        </span>
                        <div className="flex items-center gap-3">
                          <Input
                            type="number"
                            step="0.5"
                            value={reajustePct}
                            onChange={(e: ChangeEvent<HTMLInputElement>) =>
                              setReajustePct(Number(e.target.value) || 0)
                            }
                            className="w-24 tabular-nums"
                          />
                          <input
                            type="range"
                            min={-10}
                            max={30}
                            step={0.5}
                            value={reajustePct}
                            onChange={(e: ChangeEvent<HTMLInputElement>) =>
                              setReajustePct(Number(e.target.value))
                            }
                            className="flex-1 accent-primary"
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <span className="text-xs font-medium text-muted-foreground">
                          Departamento (opcional)
                        </span>
                        <select
                          value={deptoFiltro}
                          onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                            setDeptoFiltro(e.target.value)
                          }
                          className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                        >
                          <option value="">Todos</option>
                          {departamentos.map((d) => (
                            <option key={d.id} value={d.nome}>
                              {d.nome}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <span className="text-xs font-medium text-muted-foreground">
                          Vigência
                        </span>
                        <Input
                          type="month"
                          value={vigencia}
                          onChange={(e: ChangeEvent<HTMLInputElement>) =>
                            setVigencia(e.target.value)
                          }
                        />
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-4">
                      <div className="rounded-lg border p-3">
                        <div className="text-[11px] text-muted-foreground">
                          Custo atual
                        </div>
                        <div className="text-lg font-bold tabular-nums">
                          {brl.format(simulacao.custoAtual)}
                        </div>
                      </div>
                      <div className="rounded-lg border p-3">
                        <div className="text-[11px] text-muted-foreground">
                          Custo projetado
                        </div>
                        <div className="text-lg font-bold tabular-nums">
                          {brl.format(simulacao.custoProjetado)}
                        </div>
                      </div>
                      <div
                        className={cn(
                          'rounded-lg border p-3',
                          simulacao.delta >= 0
                            ? 'border-rose-500/40 bg-rose-500/5'
                            : 'border-emerald-500/40 bg-emerald-500/5'
                        )}
                      >
                        <div className="text-[11px] text-muted-foreground">
                          Delta
                        </div>
                        <div className="text-lg font-bold tabular-nums">
                          {simulacao.delta >= 0 ? '+' : ''}
                          {brl.format(simulacao.delta)} (
                          {pctFmt.format(simulacao.deltaPct)})
                        </div>
                      </div>
                      <div className="rounded-lg border p-3">
                        <div className="text-[11px] text-muted-foreground">
                          Colaboradores impactados
                        </div>
                        <div className="text-lg font-bold tabular-nums">
                          {intFmt.format(simulacao.impactados)}
                        </div>
                      </div>
                    </div>

                    <div className="overflow-hidden rounded-lg border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Colaborador</TableHead>
                            <TableHead className="text-right">
                              Salário atual
                            </TableHead>
                            <TableHead className="text-right">
                              Novo salário
                            </TableHead>
                            <TableHead className="text-right">Delta</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {simulacao.rows.length === 0 && (
                            <TableRow>
                              <TableCell
                                colSpan={4}
                                className="py-8 text-center text-muted-foreground"
                              >
                                Ajuste os filtros para ver a simulação.
                              </TableCell>
                            </TableRow>
                          )}
                          {simulacao.rows.map((r) => {
                            const d = r.novo - r.atual;
                            return (
                              <TableRow key={r.id}>
                                <TableCell className="font-medium">
                                  {r.nome}
                                </TableCell>
                                <TableCell className="text-right tabular-nums">
                                  {brl.format(r.atual)}
                                </TableCell>
                                <TableCell className="text-right font-semibold tabular-nums">
                                  {brl.format(r.novo)}
                                </TableCell>
                                <TableCell
                                  className={cn(
                                    'text-right tabular-nums',
                                    d >= 0
                                      ? 'text-emerald-600 dark:text-emerald-400'
                                      : 'text-rose-600 dark:text-rose-400'
                                  )}
                                >
                                  {d >= 0 ? '+' : ''}
                                  {brl.format(d)}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>

                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setReajustePct(5);
                          setDeptoFiltro('');
                        }}
                      >
                        Simular outra
                      </Button>
                      <Button onClick={handleAplicarReajuste}>Aplicar</Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ---------------- Tab: Evolução ---------------- */}
              <TabsContent value="evolucao" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Evolução 12 meses
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <MonthlyLineChart data={history12} />
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="rounded-lg border p-3">
                        <div className="text-[11px] text-muted-foreground">
                          Crescimento YoY
                        </div>
                        <div className="text-xl font-bold tabular-nums text-indigo-600 dark:text-indigo-400">
                          {evolStats.yoy >= 0 ? '+' : ''}
                          {evolStats.yoy.toFixed(1)}%
                        </div>
                      </div>
                      <div className="rounded-lg border p-3">
                        <div className="text-[11px] text-muted-foreground">
                          Maior pico ({formatMesLabel(evolStats.picoMes)})
                        </div>
                        <div className="text-xl font-bold tabular-nums">
                          {brl.format(evolStats.pico)}
                        </div>
                      </div>
                      <div className="rounded-lg border p-3">
                        <div className="text-[11px] text-muted-foreground">
                          Projeção próximo mês
                        </div>
                        <div className="text-xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                          {brl.format(evolStats.projecao)}
                        </div>
                      </div>
                    </div>
                    <div className="overflow-hidden rounded-lg border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Mês</TableHead>
                            <TableHead className="text-right">Bruto</TableHead>
                            <TableHead className="text-right">
                              Líquido
                            </TableHead>
                            <TableHead className="text-right">
                              Encargos
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {history12.map((h) => (
                            <TableRow key={h.mes}>
                              <TableCell className="capitalize">
                                {formatMesLong(h.mes)}
                              </TableCell>
                              <TableCell className="text-right tabular-nums">
                                {brl.format(h.bruto)}
                              </TableCell>
                              <TableCell className="text-right tabular-nums">
                                {brl.format(h.liquido)}
                              </TableCell>
                              <TableCell className="text-right tabular-nums">
                                {brl.format(h.encargos)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ---------------- Tab: Previsões IA ---------------- */}
              <TabsContent value="ia" className="mt-4">
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Sparkles className="h-4 w-4 text-primary" />
                        Previsão de custo — 6 meses
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <AiForecastChart
                        historical={forecastHist}
                        forecast={forecastFuture}
                        confidence={0.82}
                        label="Custo Bruto da folha"
                        width={820}
                        height={260}
                      />
                    </CardContent>
                  </Card>

                  <div className="grid gap-4 md:grid-cols-3">
                    <Card className="border-emerald-500/40">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xs uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                          Cenário otimista
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-xl font-bold tabular-nums">
                          {brl.format(cenarios.otimista)}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          Crescimento contido em 0,3% a.m.
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="border-sky-500/40">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xs uppercase tracking-wide text-sky-600 dark:text-sky-400">
                          Cenário realista
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-xl font-bold tabular-nums">
                          {brl.format(cenarios.realista)}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          Tendência atual ~0,8% a.m.
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="border-rose-500/40">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xs uppercase tracking-wide text-rose-600 dark:text-rose-400">
                          Cenário pessimista
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-xl font-bold tabular-nums">
                          {brl.format(cenarios.pessimista)}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          Dissídio + horas extras acima do teto.
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">
                        Insights da IA
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div className="flex items-start gap-2.5 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                        <TrendingUp className="mt-0.5 h-4 w-4 text-amber-500" />
                        <div>
                          <div className="font-medium">
                            Custo crescendo 3,2% ao mês
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Acima da meta orçamentária de 1,5% — revise
                            contratações pendentes.
                          </div>
                        </div>
                      </div>
                      <div className="flex items-start gap-2.5 rounded-lg border border-sky-500/30 bg-sky-500/5 p-3">
                        <Sparkles className="mt-0.5 h-4 w-4 text-sky-500" />
                        <div>
                          <div className="font-medium">
                            Dissídio previsto para maio
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Reajuste estimado em +8% impactará{' '}
                            {intFmt.format(folha?.colaboradores ?? 0)}{' '}
                            colaboradores.
                          </div>
                        </div>
                      </div>
                      <div className="flex items-start gap-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
                        <Percent className="mt-0.5 h-4 w-4 text-emerald-500" />
                        <div>
                          <div className="font-medium">
                            Encargos dentro do esperado
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {pctFmt.format(pctEncargos)} sobre o bruto — dentro
                            da banda histórica.
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </motion.div>
        </div>

        {/* Sidebar IA */}
        <aside className="hidden xl:block">
          <div className="sticky top-6">
            <AiInsightsPanel scope="rh" maxItems={3} compact />
          </div>
        </aside>
      </div>

      {/* Dialog: detalhes do colaborador (holerite) */}
      <Dialog
        open={detalheColaborador !== null}
        onOpenChange={(open) => {
          if (!open) setDetalheColaborador(null);
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-primary" />
              Holerite — {detalheColaborador?.nome}
            </DialogTitle>
            <DialogDescription>
              Competência: {formatMesLong(selectedMes)} · Matrícula:{' '}
              {detalheColaborador?.id}
            </DialogDescription>
          </DialogHeader>
          {detalheColaborador &&
            folha &&
            (() => {
              const item = folha.itens.find(
                (i) => i.colaboradorId === detalheColaborador.id
              );
              if (!item)
                return (
                  <div className="text-sm text-muted-foreground">
                    Sem dados para este mês.
                  </div>
                );
              const proventos = [
                { label: 'Salário base', value: item.bruto },
                { label: 'Benefícios', value: item.beneficios },
              ];
              const descontos = [
                { label: 'INSS (11%)', value: item.inss },
                { label: 'IRRF', value: item.irrf },
              ];
              const totalProv = proventos.reduce((s, p) => s + p.value, 0);
              const totalDesc = descontos.reduce((s, d) => s + d.value, 0);
              return (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      {detalheColaborador.avatarUrl && (
                        <AvatarImage
                          src={detalheColaborador.avatarUrl}
                          alt={detalheColaborador.nome}
                        />
                      )}
                      <AvatarFallback>
                        {getInitials(detalheColaborador.nome)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-semibold">
                        {detalheColaborador.nome}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {detalheColaborador.cargo} ·{' '}
                        {detalheColaborador.departamento}
                      </div>
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-lg border p-3">
                      <div className="mb-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        Proventos
                      </div>
                      <ul className="space-y-1.5 text-sm">
                        {proventos.map((p) => (
                          <li
                            key={p.label}
                            className="flex justify-between tabular-nums"
                          >
                            <span className="text-muted-foreground">
                              {p.label}
                            </span>
                            <span>{brl2.format(p.value)}</span>
                          </li>
                        ))}
                        <li className="flex justify-between border-t pt-1.5 font-semibold tabular-nums">
                          <span>Total</span>
                          <span>{brl2.format(totalProv)}</span>
                        </li>
                      </ul>
                    </div>
                    <div className="rounded-lg border p-3">
                      <div className="mb-2 text-xs font-semibold text-rose-600 dark:text-rose-400">
                        Descontos
                      </div>
                      <ul className="space-y-1.5 text-sm">
                        {descontos.map((d) => (
                          <li
                            key={d.label}
                            className="flex justify-between tabular-nums"
                          >
                            <span className="text-muted-foreground">
                              {d.label}
                            </span>
                            <span>−{brl2.format(d.value)}</span>
                          </li>
                        ))}
                        <li className="flex justify-between border-t pt-1.5 font-semibold tabular-nums">
                          <span>Total</span>
                          <span>−{brl2.format(totalDesc)}</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border-2 border-primary/40 bg-primary/5 p-4">
                    <div>
                      <div className="text-xs text-muted-foreground">
                        Líquido a receber
                      </div>
                      <div className="text-2xl font-bold tabular-nums text-primary">
                        {brl2.format(item.liquido)}
                      </div>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      FGTS (não desconta)
                      <div className="font-semibold tabular-nums text-foreground">
                        {brl2.format(item.fgts)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDetalheColaborador(null)}
              className="gap-1.5"
            >
              <X className="h-4 w-4" /> Fechar
            </Button>
            <Button
              onClick={() => toast.success('Holerite PDF baixado (mock)')}
              className="gap-1.5"
            >
              <Download className="h-4 w-4" /> Baixar PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </RhLayout>
  );
};

/* ------------------------------------------------------------------ */
/* Exported wrapper com QueryClientProvider                            */
/* ------------------------------------------------------------------ */

export const RhFolha = () => {
  return (
    <QueryClientProvider client={getLocalQueryClient()}>
      <RhFolhaContent />
    </QueryClientProvider>
  );
};

export default RhFolha;
