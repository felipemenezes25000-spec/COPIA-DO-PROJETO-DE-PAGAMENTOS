/**
 * RhDesempenho — Desempenho & Feedback do Portal RH.
 *
 * Avaliações 360, matriz 9-Box, evolução por ciclo e análise de
 * sentimento por IA. Consome `@/services/rhApi` via TanStack Query
 * em QueryClient singleton local. Tudo com dados mock determinísticos
 * (sem dependências novas).
 *
 * Stack: Vite + React + TS + Tailwind + shadcn + framer-motion.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  Award,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Medal,
  MessageSquare,
  Plus,
  Sparkles,
  Star,
  Target,
  TrendingDown,
  TrendingUp,
  Trophy,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

import { RhLayout } from '@/components/admin/rh/RhLayout';
import { AiInsightsPanel } from '@/components/admin/ai/AiInsightsPanel';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { listAvaliacoes, listColaboradores } from '@/services/rhApi';
import type {
  AvaliacaoDesempenho,
  Colaborador,
  SentimentoAvaliacao,
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

function fmtNota(n: number): string {
  return n.toFixed(1).replace('.', ',');
}

function fmtDatePtBR(iso: string): string {
  try {
    return format(parseISO(iso), "dd 'de' MMM yyyy", { locale: ptBR });
  } catch {
    return iso;
  }
}

function getInitials(nome: string): string {
  const parts = nome.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase();
}

/* ------------------------------------------------------------------ */
/* Constantes                                                          */
/* ------------------------------------------------------------------ */

const CICLOS = [
  '2026-Q1',
  '2025-Q4',
  '2025-Q3',
  '2025-Q2',
  '2025-Q1',
  '2024-Q4',
];

const sentimentoStyles: Record<
  SentimentoAvaliacao,
  { label: string; cls: string; dot: string }
> = {
  positivo: {
    label: 'Positivo',
    cls: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    dot: 'bg-emerald-500',
  },
  neutro: {
    label: 'Neutro',
    cls: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
    dot: 'bg-amber-500',
  },
  negativo: {
    label: 'Negativo',
    cls: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30',
    dot: 'bg-rose-500',
  },
};

/* ------------------------------------------------------------------ */
/* Estrelas SVG animadas (0-5, suporta meia estrela)                   */
/* ------------------------------------------------------------------ */

interface StarRatingProps {
  value: number;
  size?: number;
  animated?: boolean;
}

function StarRating({
  value,
  size = 18,
  animated = true,
}: StarRatingProps): JSX.Element {
  const stars = Array.from({ length: 5 }, (_, i) => {
    const fill = Math.max(0, Math.min(1, value - i));
    return { idx: i, fill };
  });
  return (
    <div
      className="inline-flex items-center gap-0.5"
      aria-label={`Nota ${fmtNota(value)} de 5`}
    >
      {stars.map((s) => (
        <svg
          key={s.idx}
          width={size}
          height={size}
          viewBox="0 0 24 24"
          className="shrink-0"
          aria-hidden="true"
        >
          <defs>
            <linearGradient
              id={`star-grad-${s.idx}-${Math.round(value * 10)}`}
              x1="0"
              x2="1"
              y1="0"
              y2="0"
            >
              <stop offset={`${s.fill * 100}%`} stopColor="#f59e0b" />
              <stop
                offset={`${s.fill * 100}%`}
                stopColor="transparent"
                stopOpacity="0"
              />
            </linearGradient>
          </defs>
          <motion.path
            d="M12 2.5l2.9 6.3 6.6.7-4.9 4.7 1.3 6.5L12 17.5 6.1 20.7 7.4 14.2 2.5 9.5l6.6-.7L12 2.5z"
            fill={`url(#star-grad-${s.idx}-${Math.round(value * 10)})`}
            stroke="#f59e0b"
            strokeWidth="1.3"
            strokeLinejoin="round"
            initial={animated ? { scale: 0.6, opacity: 0 } : false}
            animate={animated ? { scale: 1, opacity: 1 } : false}
            transition={{ delay: s.idx * 0.05, duration: 0.3 }}
          />
        </svg>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Progress circular SVG                                               */
/* ------------------------------------------------------------------ */

interface CircularProgressProps {
  value: number; // 0-100
  size?: number;
  stroke?: number;
  color?: string;
  children?: ReactNode;
}

function CircularProgress({
  value,
  size = 76,
  stroke = 8,
  color = '#10b981',
  children,
}: CircularProgressProps): JSX.Element {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.max(0, Math.min(100, value)) / 100);
  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={stroke}
          fill="none"
          className="text-muted/40"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold">
        {children}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Radar chart SVG                                                     */
/* ------------------------------------------------------------------ */

interface RadarPoint {
  label: string;
  value: number; // 0-5
}

interface RadarChartProps {
  points: RadarPoint[];
  size?: number;
  max?: number;
}

function RadarChart({
  points,
  size = 220,
  max = 5,
}: RadarChartProps): JSX.Element {
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 28;
  const n = points.length;

  const polar = (i: number, r: number): { x: number; y: number } => {
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / n;
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  };

  const polygon = points
    .map((p, i) => {
      const { x, y } = polar(i, radius * (p.value / max));
      return `${x},${y}`;
    })
    .join(' ');

  const grid = [0.25, 0.5, 0.75, 1].map((f) => {
    const pts = Array.from({ length: n }, (_, i) => {
      const { x, y } = polar(i, radius * f);
      return `${x},${y}`;
    }).join(' ');
    return pts;
  });

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="overflow-visible"
    >
      {grid.map((g, i) => (
        <polygon
          key={i}
          points={g}
          fill="none"
          stroke="currentColor"
          strokeOpacity={0.15}
          className="text-muted-foreground"
        />
      ))}
      {points.map((_, i) => {
        const { x, y } = polar(i, radius);
        return (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={x}
            y2={y}
            stroke="currentColor"
            strokeOpacity={0.1}
            className="text-muted-foreground"
          />
        );
      })}
      <motion.polygon
        points={polygon}
        fill="#6366f1"
        fillOpacity={0.28}
        stroke="#6366f1"
        strokeWidth={2}
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        style={{ transformOrigin: `${cx}px ${cy}px` }}
      />
      {points.map((p, i) => {
        const { x, y } = polar(i, radius * (p.value / max));
        return <circle key={`pt-${i}`} cx={x} cy={y} r={3.5} fill="#6366f1" />;
      })}
      {points.map((p, i) => {
        const { x, y } = polar(i, radius + 16);
        return (
          <text
            key={`lb-${i}`}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-current text-[10px] font-medium text-muted-foreground"
          >
            {p.label}
          </text>
        );
      })}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Mini radar (cards ranking)                                          */
/* ------------------------------------------------------------------ */

function MiniRadar({
  values,
}: {
  values: [number, number, number];
}): JSX.Element {
  return (
    <RadarChart
      size={110}
      points={[
        { label: 'Lid', value: values[0] },
        { label: 'Téc', value: values[1] },
        { label: 'Com', value: values[2] },
      ]}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Line chart SVG (evolução)                                           */
/* ------------------------------------------------------------------ */

interface LineSeries {
  label: string;
  color: string;
  points: number[]; // 0-5
}

interface LineChartProps {
  series: LineSeries[];
  xLabels: string[];
  width?: number;
  height?: number;
}

function LineChart({
  series,
  xLabels,
  width = 640,
  height = 260,
}: LineChartProps): JSX.Element {
  const pad = { top: 16, right: 16, bottom: 28, left: 32 };
  const w = width - pad.left - pad.right;
  const h = height - pad.top - pad.bottom;
  const n = xLabels.length;
  const xStep = n > 1 ? w / (n - 1) : w;

  const yFor = (v: number): number => pad.top + h - (v / 5) * h;
  const xFor = (i: number): number => pad.left + i * xStep;

  const ticks = [0, 1, 2, 3, 4, 5];

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${width} ${height}`}
      className="overflow-visible"
    >
      {ticks.map((t) => (
        <g key={t}>
          <line
            x1={pad.left}
            y1={yFor(t)}
            x2={pad.left + w}
            y2={yFor(t)}
            stroke="currentColor"
            strokeOpacity={0.12}
            className="text-muted-foreground"
          />
          <text
            x={pad.left - 6}
            y={yFor(t)}
            textAnchor="end"
            dominantBaseline="middle"
            className="fill-current text-[10px] text-muted-foreground"
          >
            {t}
          </text>
        </g>
      ))}
      {xLabels.map((lb, i) => (
        <text
          key={lb}
          x={xFor(i)}
          y={height - 8}
          textAnchor="middle"
          className="fill-current text-[10px] text-muted-foreground"
        >
          {lb}
        </text>
      ))}
      {series.map((s, si) => {
        const d = s.points
          .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i)} ${yFor(p)}`)
          .join(' ');
        return (
          <g key={s.label}>
            <motion.path
              d={d}
              stroke={s.color}
              strokeWidth={2.5}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.8, delay: si * 0.1 }}
            />
            {s.points.map((p, i) => (
              <circle key={i} cx={xFor(i)} cy={yFor(p)} r={3} fill={s.color} />
            ))}
          </g>
        );
      })}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Pie SVG (sentimento)                                                */
/* ------------------------------------------------------------------ */

interface PieSlice {
  label: string;
  value: number;
  color: string;
}

function PieChart({
  slices,
  size = 200,
}: {
  slices: PieSlice[];
  size?: number;
}): JSX.Element {
  const total = slices.reduce((a, s) => a + s.value, 0) || 1;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 8;
  const prefixSums = slices.reduce<number[]>((arr, s, i) => {
    arr.push((i === 0 ? 0 : arr[i - 1]!) + s.value);
    return arr;
  }, []);

  const arcs = slices.map((s, i) => {
    const prior = i === 0 ? 0 : prefixSums[i - 1]!;
    const current = prefixSums[i]!;
    const startAngle = (prior / total) * Math.PI * 2 - Math.PI / 2;
    const endAngle = (current / total) * Math.PI * 2 - Math.PI / 2;
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
    const d = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
    return { d, color: s.color, key: `${s.label}-${i}` };
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {arcs.map((a, i) => (
        <motion.path
          key={a.key}
          d={a.d}
          fill={a.color}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.1, duration: 0.4 }}
          style={{ transformOrigin: `${cx}px ${cy}px` }}
        />
      ))}
      <circle cx={cx} cy={cy} r={r * 0.55} className="fill-background" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Página                                                              */
/* ------------------------------------------------------------------ */

export function RhDesempenho(): JSX.Element {
  return (
    <QueryClientProvider client={getLocalQueryClient()}>
      <RhDesempenhoInner />
    </QueryClientProvider>
  );
}

export default RhDesempenho;

function RhDesempenhoInner(): JSX.Element {
  const [ciclo, setCiclo] = useState<string>(CICLOS[0] ?? '2026-Q1');
  const [departamento, setDepartamento] = useState<string>('todos');
  const [activeTab, setActiveTab] = useState<
    'ranking' | 'matriz' | 'evolucao' | 'ia'
  >('ranking');
  const [drawerAval, setDrawerAval] = useState<AvaliacaoDesempenho | null>(
    null
  );
  const [openNovaAvaliacao, setOpenNovaAvaliacao] = useState(false);
  const [colabEvolucaoId, setColabEvolucaoId] = useState<string | null>(null);

  const avaliacoesQuery = useQuery<AvaliacaoDesempenho[]>({
    queryKey: ['rh', 'avaliacoes'],
    queryFn: () => listAvaliacoes(),
  });

  const colaboradoresQuery = useQuery({
    queryKey: ['rh', 'colaboradores', 'all'],
    queryFn: () => listColaboradores({ pageSize: 200 }),
  });

  const colaboradores = useMemo(
    () => colaboradoresQuery.data?.items ?? [],
    [colaboradoresQuery.data]
  );
  const avaliacoes = useMemo(
    () => avaliacoesQuery.data ?? [],
    [avaliacoesQuery.data]
  );

  const colabMap = useMemo(() => {
    const m = new Map<string, Colaborador>();
    colaboradores.forEach((c) => m.set(c.id, c));
    return m;
  }, [colaboradores]);

  const departamentos = useMemo(() => {
    const s = new Set<string>();
    colaboradores.forEach((c) => s.add(c.departamento));
    return Array.from(s).sort();
  }, [colaboradores]);

  // Filtra avaliações pelo período + depto
  const avaliacoesFiltradas = useMemo(() => {
    return avaliacoes.filter((a) => {
      if (a.periodo !== ciclo && ciclo !== 'todos') {
        // Dataset mock só tem 1 período; para ciclos anteriores, mostra tudo como "histórico"
        if (ciclo === '2026-Q1') return a.periodo === '2026-Q1';
        return true;
      }
      if (departamento !== 'todos') {
        const c = colabMap.get(a.colaboradorId);
        if (!c || c.departamento !== departamento) return false;
      }
      return true;
    });
  }, [avaliacoes, ciclo, departamento, colabMap]);

  // Seleciona primeiro colaborador para aba evolução ao montar / quando
  // filtros mudam. Reset legítimo de estado derivado, não cascade.
  useEffect(() => {
    if (!colabEvolucaoId && avaliacoesFiltradas.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setColabEvolucaoId(avaliacoesFiltradas[0]!.colaboradorId);
    }
  }, [avaliacoesFiltradas, colabEvolucaoId]);

  const isLoading = avaliacoesQuery.isLoading || colaboradoresQuery.isLoading;

  /* ----------------------- KPIs ----------------------- */
  const kpis = useMemo(() => {
    const list = avaliacoesFiltradas;
    const total = list.length || 1;
    const notaMedia = list.reduce((a, x) => a + x.notaGeral, 0) / total;
    const concluidas = list.length;
    const totalEsperado = colaboradores.length || concluidas;
    const objetivosAtingidosPct =
      list.reduce(
        (a, x) => a + x.objetivosAtingidos / Math.max(1, x.objetivosTotais),
        0
      ) / total;
    const sentimentos = list.reduce(
      (acc, x) => {
        acc[x.sentimento] += 1;
        return acc;
      },
      { positivo: 0, neutro: 0, negativo: 0 } as Record<
        SentimentoAvaliacao,
        number
      >
    );
    const pctPos = (sentimentos.positivo / total) * 100;
    const pctNeu = (sentimentos.neutro / total) * 100;
    const pctNeg = (sentimentos.negativo / total) * 100;
    const pip = list.filter((x) => x.notaGeral < 3).length;
    return {
      notaMedia,
      concluidas,
      totalEsperado,
      objetivosAtingidosPct,
      sentimentos,
      pctPos,
      pctNeu,
      pctNeg,
      pip,
    };
  }, [avaliacoesFiltradas, colaboradores.length]);

  /* ----------------------- Ranking ----------------------- */
  const ranking = useMemo(
    () => [...avaliacoesFiltradas].sort((a, b) => b.notaGeral - a.notaGeral),
    [avaliacoesFiltradas]
  );

  /* ----------------------- Matriz 9-Box ----------------------- */
  // Usa notaGeral como Performance e média(Lid+Comp) como Potencial (mock determinístico)
  const matrizBuckets = useMemo(() => {
    const buckets: Record<
      string,
      { aval: AvaliacaoDesempenho; col?: Colaborador }[]
    > = {};
    for (let py = 0; py < 3; py++) {
      for (let px = 0; px < 3; px++) {
        buckets[`${px}-${py}`] = [];
      }
    }
    avaliacoesFiltradas.forEach((a) => {
      const perf = a.notaGeral; // 0-5
      const potencial = (a.notaLideranca + a.notaComportamental) / 2;
      const px = perf < 2.5 ? 0 : perf < 3.8 ? 1 : 2;
      const py = potencial < 2.5 ? 0 : potencial < 3.8 ? 1 : 2;
      buckets[`${px}-${py}`]!.push({
        aval: a,
        col: colabMap.get(a.colaboradorId),
      });
    });
    return buckets;
  }, [avaliacoesFiltradas, colabMap]);

  /* ----------------------- Evolução ----------------------- */
  const evolucaoData = useMemo(() => {
    if (!colabEvolucaoId) return null;
    const atual = avaliacoes.find((a) => a.colaboradorId === colabEvolucaoId);
    if (!atual) return null;
    // Mock: gera histórico determinístico baseado no hash do id + nota atual
    const hash = colabEvolucaoId
      .split('')
      .reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    const jitter = (base: number, i: number, amp: number): number => {
      const v = base + Math.sin((hash + i * 1.3) * 0.9) * amp;
      return Math.max(1, Math.min(5, Math.round(v * 10) / 10));
    };
    const ciclos = [
      '2024-Q3',
      '2024-Q4',
      '2025-Q1',
      '2025-Q2',
      '2025-Q3',
      '2025-Q4',
      '2026-Q1',
    ];
    const geral = ciclos.map((_, i) =>
      i === ciclos.length - 1
        ? atual.notaGeral
        : jitter(atual.notaGeral, i, 0.8)
    );
    const lid = ciclos.map((_, i) =>
      i === ciclos.length - 1
        ? atual.notaLideranca
        : jitter(atual.notaLideranca, i + 2, 0.7)
    );
    const tec = ciclos.map((_, i) =>
      i === ciclos.length - 1
        ? atual.notaTecnica
        : jitter(atual.notaTecnica, i + 4, 0.6)
    );
    const com = ciclos.map((_, i) =>
      i === ciclos.length - 1
        ? atual.notaComportamental
        : jitter(atual.notaComportamental, i + 6, 0.7)
    );
    const trend: 'up' | 'down' | 'stable' =
      geral[geral.length - 1]! > geral[0]!
        ? 'up'
        : geral[geral.length - 1]! < geral[0]!
          ? 'down'
          : 'stable';
    return {
      colab: colabMap.get(colabEvolucaoId),
      ciclos,
      geral,
      lid,
      tec,
      com,
      trend,
      maior: Math.max(...geral),
      atual,
    };
  }, [colabEvolucaoId, avaliacoes, colabMap]);

  /* ----------------------- Análise IA ----------------------- */
  const wordCloud = useMemo(
    () =>
      [
        { t: 'liderança', w: 38 },
        { t: 'comunicação', w: 32 },
        { t: 'colaboração', w: 28 },
        { t: 'entrega', w: 26 },
        { t: 'crescimento', w: 24 },
        { t: 'prazo', w: 22 },
        { t: 'qualidade', w: 20 },
        { t: 'aprendizado', w: 19 },
        { t: 'iniciativa', w: 18 },
        { t: 'sobrecarga', w: 17 },
        { t: 'clareza', w: 16 },
        { t: 'feedback', w: 15 },
        { t: 'autonomia', w: 14 },
        { t: 'onboarding', w: 13 },
        { t: 'empatia', w: 12 },
        { t: 'estratégia', w: 11 },
        { t: 'processo', w: 10 },
        { t: 'inovação', w: 10 },
        { t: 'reuniões', w: 9 },
        { t: 'planejamento', w: 9 },
      ] as const,
    []
  );

  const temasIa = useMemo(
    () => [
      {
        tema: 'Comunicação com liderança',
        polaridade: 'positivo' as const,
        pct: 72,
      },
      { tema: 'Carga de trabalho', polaridade: 'negativo' as const, pct: 41 },
      {
        tema: 'Oportunidades de crescimento',
        polaridade: 'neutro' as const,
        pct: 58,
      },
      { tema: 'Reconhecimento', polaridade: 'positivo' as const, pct: 66 },
      { tema: 'Processos internos', polaridade: 'negativo' as const, pct: 35 },
      {
        tema: 'Colaboração entre times',
        polaridade: 'positivo' as const,
        pct: 69,
      },
    ],
    []
  );

  const riscos = useMemo(
    () =>
      avaliacoesFiltradas
        .filter((a) => a.sentimento === 'negativo')
        .slice(0, 6),
    [avaliacoesFiltradas]
  );

  /* ----------------------- Handlers ----------------------- */
  const handleExportar = useCallback(() => {
    toast.success('Relatório de desempenho em preparação', {
      description: 'O CSV será baixado em instantes.',
    });
  }, []);

  const handleCiclo = useCallback(() => {
    toast.info('Ciclo de avaliação', {
      description: 'Configuração do ciclo será aberta em nova janela.',
    });
  }, []);

  /* ----------------------- Render ----------------------- */
  return (
    <RhLayout
      title="Desempenho & Feedback"
      subtitle="Avaliações, objetivos e análise de clima"
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleCiclo}>
            <CalendarDays className="mr-2 h-4 w-4" />
            Ciclo de avaliação
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportar}>
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
          <Button size="sm" onClick={() => setOpenNovaAvaliacao(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nova avaliação
          </Button>
        </div>
      }
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-6">
          {/* Filtros ciclo + depto */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">Ciclo</Label>
              <Select value={ciclo} onValueChange={setCiclo}>
                <SelectTrigger className="h-9 w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CICLOS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">
                Departamento
              </Label>
              <Select value={departamento} onValueChange={setDepartamento}>
                <SelectTrigger className="h-9 w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {departamentos.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="ml-auto text-xs text-muted-foreground">
              {avaliacoesFiltradas.length} avaliações neste recorte
            </div>
          </div>

          {/* KPIs */}
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-32 w-full rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              <KpiCard
                icon={<Star className="h-4 w-4" />}
                label="Nota média da empresa"
                delay={0}
              >
                <div className="flex items-end gap-2">
                  <div className="text-3xl font-bold tabular-nums">
                    {fmtNota(kpis.notaMedia)}
                  </div>
                  <div className="mb-1 text-xs text-muted-foreground">
                    / 5,0
                  </div>
                </div>
                <div className="mt-2">
                  <StarRating value={kpis.notaMedia} size={16} />
                </div>
              </KpiCard>

              <KpiCard
                icon={<CheckCircle2 className="h-4 w-4" />}
                label="Avaliações concluídas"
                delay={0.05}
              >
                <div className="flex items-center gap-3">
                  <CircularProgress
                    value={
                      (kpis.concluidas / Math.max(1, kpis.totalEsperado)) * 100
                    }
                    size={64}
                    stroke={7}
                    color="#6366f1"
                  >
                    <span className="text-[10px] font-semibold">
                      {Math.round(
                        (kpis.concluidas / Math.max(1, kpis.totalEsperado)) *
                          100
                      )}
                      %
                    </span>
                  </CircularProgress>
                  <div>
                    <div className="text-xl font-bold tabular-nums">
                      {kpis.concluidas}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      de {kpis.totalEsperado}
                    </div>
                  </div>
                </div>
              </KpiCard>

              <KpiCard
                icon={<Target className="h-4 w-4" />}
                label="Objetivos atingidos"
                delay={0.1}
              >
                <div className="text-3xl font-bold tabular-nums">
                  {Math.round(kpis.objetivosAtingidosPct * 100)}%
                </div>
                <Progress
                  value={kpis.objetivosAtingidosPct * 100}
                  className="mt-3 h-2"
                />
              </KpiCard>

              <KpiCard
                icon={<Sparkles className="h-4 w-4" />}
                label="Sentimento geral"
                delay={0.15}
              >
                <div className="text-3xl font-bold tabular-nums text-emerald-500">
                  {Math.round(kpis.pctPos)}%
                </div>
                <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="bg-emerald-500"
                    style={{ width: `${kpis.pctPos}%` }}
                  />
                  <div
                    className="bg-amber-500"
                    style={{ width: `${kpis.pctNeu}%` }}
                  />
                  <div
                    className="bg-rose-500"
                    style={{ width: `${kpis.pctNeg}%` }}
                  />
                </div>
                <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                  <span>+{Math.round(kpis.pctPos)}%</span>
                  <span>~{Math.round(kpis.pctNeu)}%</span>
                  <span>-{Math.round(kpis.pctNeg)}%</span>
                </div>
              </KpiCard>

              <KpiCard
                icon={<AlertTriangle className="h-4 w-4" />}
                label="PIP / Atenção"
                delay={0.2}
                highlight
              >
                <div className="text-3xl font-bold tabular-nums text-rose-500">
                  {kpis.pip}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Nota geral abaixo de 3,0
                </div>
              </KpiCard>
            </div>
          )}

          {/* Tabs */}
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as typeof activeTab)}
          >
            <TabsList className="grid w-full grid-cols-4 lg:w-auto">
              <TabsTrigger value="ranking">Ranking</TabsTrigger>
              <TabsTrigger value="matriz">Matriz 9-Box</TabsTrigger>
              <TabsTrigger value="evolucao">Evolução</TabsTrigger>
              <TabsTrigger value="ia">Análise IA</TabsTrigger>
            </TabsList>

            {/* RANKING */}
            <TabsContent value="ranking" className="mt-5">
              <RankingTab
                ranking={ranking}
                colabMap={colabMap}
                onOpen={setDrawerAval}
                isLoading={isLoading}
              />
            </TabsContent>

            {/* MATRIZ 9-BOX */}
            <TabsContent value="matriz" className="mt-5">
              <NineBoxTab
                buckets={matrizBuckets}
                onOpen={(a) => setDrawerAval(a)}
                isLoading={isLoading}
              />
            </TabsContent>

            {/* EVOLUÇÃO */}
            <TabsContent value="evolucao" className="mt-5">
              <EvolucaoTab
                colaboradores={colaboradores}
                selectedId={colabEvolucaoId}
                onSelect={setColabEvolucaoId}
                data={evolucaoData}
                isLoading={isLoading}
              />
            </TabsContent>

            {/* ANÁLISE IA */}
            <TabsContent value="ia" className="mt-5">
              <AnaliseIaTab
                pctPos={kpis.pctPos}
                pctNeu={kpis.pctNeu}
                pctNeg={kpis.pctNeg}
                wordCloud={wordCloud}
                temas={temasIa}
                riscos={riscos}
                colabMap={colabMap}
                onOpen={setDrawerAval}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar IA */}
        <aside className="hidden xl:block">
          <div className="sticky top-4">
            <AiInsightsPanel scope="rh" maxItems={4} compact />
          </div>
        </aside>
      </div>

      {/* Drawer avaliação individual */}
      <AvaliacaoDrawer
        open={!!drawerAval}
        aval={drawerAval}
        colab={drawerAval ? colabMap.get(drawerAval.colaboradorId) : undefined}
        onClose={() => setDrawerAval(null)}
      />

      {/* Sheet Nova avaliação */}
      <NovaAvaliacaoSheet
        open={openNovaAvaliacao}
        onClose={() => setOpenNovaAvaliacao(false)}
        colaboradores={colaboradores}
      />
    </RhLayout>
  );
}

/* ------------------------------------------------------------------ */
/* KPI Card                                                            */
/* ------------------------------------------------------------------ */

interface KpiCardProps {
  icon: ReactNode;
  label: string;
  children: ReactNode;
  delay?: number;
  highlight?: boolean;
}

function KpiCard({
  icon,
  label,
  children,
  delay = 0,
  highlight,
}: KpiCardProps): JSX.Element {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
    >
      <Card
        className={cn(
          'relative overflow-hidden border',
          highlight && 'border-rose-500/40 bg-rose-500/5'
        )}
      >
        <CardContent className="p-4">
          <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="rounded-md bg-muted p-1.5">{icon}</span>
            <span>{label}</span>
          </div>
          {children}
        </CardContent>
      </Card>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Ranking Tab                                                         */
/* ------------------------------------------------------------------ */

interface RankingTabProps {
  ranking: AvaliacaoDesempenho[];
  colabMap: Map<string, Colaborador>;
  onOpen: (a: AvaliacaoDesempenho) => void;
  isLoading: boolean;
}

function MedalIcon({ pos }: { pos: number }): JSX.Element | null {
  if (pos === 0) return <Trophy className="h-5 w-5 text-amber-400" />;
  if (pos === 1) return <Medal className="h-5 w-5 text-slate-400" />;
  if (pos === 2) return <Medal className="h-5 w-5 text-orange-500" />;
  return null;
}

function RankingTab({
  ranking,
  colabMap,
  onOpen,
  isLoading,
}: RankingTabProps): JSX.Element {
  const top10 = ranking.slice(0, 10);
  const rest = ranking.slice(10);

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-56 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-3 flex items-center gap-2">
          <Award className="h-4 w-4 text-amber-500" />
          <h3 className="text-sm font-semibold">Top 10 performers</h3>
          <Badge variant="outline" className="ml-2 text-[10px]">
            {top10.length}
          </Badge>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence>
            {top10.map((a, i) => {
              const col = colabMap.get(a.colaboradorId);
              const sent = sentimentoStyles[a.sentimento];
              return (
                <motion.div
                  key={a.id}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: i * 0.04 }}
                >
                  <Card className="group overflow-hidden transition-colors hover:border-primary/50">
                    <CardContent className="p-4">
                      <div className="mb-3 flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <Avatar className="h-12 w-12">
                              <AvatarImage
                                src={col?.avatarUrl}
                                alt={col?.nome}
                              />
                              <AvatarFallback>
                                {col ? getInitials(col.nome) : '--'}
                              </AvatarFallback>
                            </Avatar>
                            {i < 3 && (
                              <div className="absolute -bottom-1 -right-1 rounded-full bg-background p-0.5 ring-1 ring-border">
                                <MedalIcon pos={i} />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-semibold text-muted-foreground">
                                #{i + 1}
                              </span>
                              <span className="truncate text-sm font-semibold">
                                {col?.nome ?? '—'}
                              </span>
                            </div>
                            <div className="truncate text-xs text-muted-foreground">
                              {col?.cargo}
                            </div>
                            <div className="truncate text-[10px] text-muted-foreground">
                              {col?.departamento}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-2xl font-bold tabular-nums">
                            {fmtNota(a.notaGeral)}
                          </div>
                          <StarRating value={a.notaGeral} size={14} />
                        </div>
                        <MiniRadar
                          values={[
                            a.notaLideranca,
                            a.notaTecnica,
                            a.notaComportamental,
                          ]}
                        />
                      </div>

                      <div className="mt-3 flex items-center justify-between">
                        <Badge
                          variant="outline"
                          className={cn('text-[10px]', sent.cls)}
                        >
                          <span
                            className={cn(
                              'mr-1 h-1.5 w-1.5 rounded-full',
                              sent.dot
                            )}
                          />
                          {sent.label}
                        </Badge>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs"
                          onClick={() => onOpen(a)}
                        >
                          Ver avaliação
                          <ChevronRight className="ml-1 h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {rest.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold">Lista completa</h3>
          <Card>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {rest.map((a, i) => {
                  const col = colabMap.get(a.colaboradorId);
                  const sent = sentimentoStyles[a.sentimento];
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => onOpen(a)}
                      className="flex w-full items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-muted/50"
                    >
                      <span className="w-8 text-xs font-semibold text-muted-foreground">
                        #{i + 11}
                      </span>
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={col?.avatarUrl} alt={col?.nome} />
                        <AvatarFallback>
                          {col ? getInitials(col.nome) : '--'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">
                          {col?.nome ?? '—'}
                        </div>
                        <div className="truncate text-xs text-muted-foreground">
                          {col?.cargo} · {col?.departamento}
                        </div>
                      </div>
                      <div className="hidden w-28 sm:block">
                        <StarRating
                          value={a.notaGeral}
                          size={12}
                          animated={false}
                        />
                      </div>
                      <div className="w-12 text-right text-sm font-semibold tabular-nums">
                        {fmtNota(a.notaGeral)}
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          'hidden text-[10px] md:inline-flex',
                          sent.cls
                        )}
                      >
                        {sent.label}
                      </Badge>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Matriz 9-Box Tab                                                    */
/* ------------------------------------------------------------------ */

interface NineBoxTabProps {
  buckets: Record<string, { aval: AvaliacaoDesempenho; col?: Colaborador }[]>;
  onOpen: (a: AvaliacaoDesempenho) => void;
  isLoading: boolean;
}

// Matriz (x=performance, y=potencial) — label por quadrante
// py=2 (alto potencial) topo; py=0 (baixo) base
const BOX_LABELS: Record<string, { title: string; cls: string }> = {
  '0-2': { title: 'Enigma', cls: 'bg-amber-500/10 border-amber-500/30' },
  '1-2': {
    title: 'Growth Employee',
    cls: 'bg-emerald-500/10 border-emerald-500/30',
  },
  '2-2': {
    title: 'Top Talent',
    cls: 'bg-emerald-500/20 border-emerald-500/50',
  },
  '0-1': { title: 'Emerging', cls: 'bg-amber-500/10 border-amber-500/30' },
  '1-1': { title: 'Core Player', cls: 'bg-amber-500/15 border-amber-500/40' },
  '2-1': {
    title: 'High Performer',
    cls: 'bg-emerald-500/15 border-emerald-500/40',
  },
  '0-0': { title: 'Low Performer', cls: 'bg-rose-500/10 border-rose-500/30' },
  '1-0': { title: 'Solid', cls: 'bg-rose-500/10 border-rose-500/30' },
  '2-0': { title: 'Future Star', cls: 'bg-amber-500/15 border-amber-500/40' },
};

function NineBoxTab({
  buckets,
  onOpen,
  isLoading,
}: NineBoxTabProps): JSX.Element {
  if (isLoading) {
    return <Skeleton className="h-[500px] w-full rounded-xl" />;
  }
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          Matriz 9-Box (Performance × Potencial)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-3">
          {/* Eixo Y */}
          <div className="flex w-6 flex-col items-center justify-between py-3 text-[10px] font-medium uppercase tracking-wide text-muted-foreground [transform:rotate(180deg)] [writing-mode:vertical-rl]">
            <span>Alto potencial</span>
            <span>Baixo potencial</span>
          </div>
          <div className="flex-1">
            <div className="grid grid-cols-3 gap-2">
              {[2, 1, 0].flatMap((py) =>
                [0, 1, 2].map((px) => {
                  const key = `${px}-${py}`;
                  const box = BOX_LABELS[key]!;
                  const items = buckets[key] ?? [];
                  return (
                    <motion.div
                      key={key}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{
                        duration: 0.3,
                        delay: (2 - py) * 0.05 + px * 0.03,
                      }}
                      className={cn(
                        'flex min-h-[140px] flex-col rounded-lg border p-3',
                        box.cls
                      )}
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <div className="text-[11px] font-semibold">
                          {box.title}
                        </div>
                        <Badge
                          variant="outline"
                          className="h-4 px-1 text-[9px]"
                        >
                          {items.length}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {items.slice(0, 10).map(({ aval, col }) => (
                          <button
                            key={aval.id}
                            type="button"
                            onClick={() => onOpen(aval)}
                            title={col?.nome}
                            className="group relative"
                          >
                            <Avatar className="h-7 w-7 ring-1 ring-background transition-transform group-hover:scale-110">
                              <AvatarImage
                                src={col?.avatarUrl}
                                alt={col?.nome}
                              />
                              <AvatarFallback className="text-[9px]">
                                {col ? getInitials(col.nome) : '--'}
                              </AvatarFallback>
                            </Avatar>
                          </button>
                        ))}
                        {items.length > 10 && (
                          <span className="inline-flex h-7 items-center rounded-full bg-muted px-2 text-[10px] font-semibold">
                            +{items.length - 10}
                          </span>
                        )}
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
            {/* Eixo X */}
            <div className="mt-2 grid grid-cols-3 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              <span className="text-center">Baixa performance</span>
              <span className="text-center">Média</span>
              <span className="text-center">Alta performance</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Evolução Tab                                                        */
/* ------------------------------------------------------------------ */

interface EvolucaoTabProps {
  colaboradores: Colaborador[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  data: {
    colab?: Colaborador;
    ciclos: string[];
    geral: number[];
    lid: number[];
    tec: number[];
    com: number[];
    trend: 'up' | 'down' | 'stable';
    maior: number;
    atual: AvaliacaoDesempenho;
  } | null;
  isLoading: boolean;
}

function EvolucaoTab({
  colaboradores,
  selectedId,
  onSelect,
  data,
  isLoading,
}: EvolucaoTabProps): JSX.Element {
  if (isLoading) return <Skeleton className="h-[400px] w-full rounded-xl" />;
  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <Label className="text-xs text-muted-foreground">Colaborador</Label>
            <Select value={selectedId ?? ''} onValueChange={onSelect}>
              <SelectTrigger className="h-9 w-[280px]">
                <SelectValue placeholder="Selecione um colaborador" />
              </SelectTrigger>
              <SelectContent>
                {colaboradores.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nome} · {c.cargo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {data ? (
        <>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                Evolução — últimos 7 ciclos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <LineChart
                xLabels={data.ciclos}
                series={[
                  { label: 'Geral', color: '#6366f1', points: data.geral },
                  { label: 'Liderança', color: '#10b981', points: data.lid },
                  { label: 'Técnica', color: '#f59e0b', points: data.tec },
                  {
                    label: 'Comportamental',
                    color: '#ef4444',
                    points: data.com,
                  },
                ]}
              />
              <div className="mt-3 flex flex-wrap gap-3 text-xs">
                {[
                  { label: 'Geral', color: '#6366f1' },
                  { label: 'Liderança', color: '#10b981' },
                  { label: 'Técnica', color: '#f59e0b' },
                  { label: 'Comportamental', color: '#ef4444' },
                ].map((l) => (
                  <div key={l.label} className="flex items-center gap-1.5">
                    <span
                      className="h-2 w-3 rounded-sm"
                      style={{ background: l.color }}
                    />
                    <span className="text-muted-foreground">{l.label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground">Tendência</div>
                <div className="mt-2 flex items-center gap-2">
                  {data.trend === 'up' ? (
                    <>
                      <TrendingUp className="h-5 w-5 text-emerald-500" />
                      <span className="text-sm font-semibold text-emerald-500">
                        Subindo
                      </span>
                    </>
                  ) : data.trend === 'down' ? (
                    <>
                      <TrendingDown className="h-5 w-5 text-rose-500" />
                      <span className="text-sm font-semibold text-rose-500">
                        Descendo
                      </span>
                    </>
                  ) : (
                    <span className="text-sm font-semibold text-muted-foreground">
                      Estável
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground">
                  Maior nota histórica
                </div>
                <div className="mt-1 text-2xl font-bold tabular-nums">
                  {fmtNota(data.maior)}
                </div>
                <StarRating value={data.maior} size={12} animated={false} />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground">
                  Pontos fortes
                </div>
                <div className="mt-1 text-sm font-medium">
                  {data.atual.notaTecnica >= data.atual.notaLideranca
                    ? 'Técnica'
                    : 'Liderança'}
                </div>
                <div className="text-xs text-muted-foreground">
                  {fmtNota(
                    Math.max(data.atual.notaTecnica, data.atual.notaLideranca)
                  )}{' '}
                  / 5
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground">
                  Piores pontos
                </div>
                <div className="mt-1 text-sm font-medium">
                  {data.atual.notaLideranca <= data.atual.notaComportamental
                    ? 'Liderança'
                    : 'Comportamental'}
                </div>
                <div className="text-xs text-muted-foreground">
                  {fmtNota(
                    Math.min(
                      data.atual.notaLideranca,
                      data.atual.notaComportamental
                    )
                  )}{' '}
                  / 5
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Selecione um colaborador para ver a evolução.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Análise IA Tab                                                      */
/* ------------------------------------------------------------------ */

interface AnaliseIaTabProps {
  pctPos: number;
  pctNeu: number;
  pctNeg: number;
  wordCloud: ReadonlyArray<{ t: string; w: number }>;
  temas: { tema: string; polaridade: SentimentoAvaliacao; pct: number }[];
  riscos: AvaliacaoDesempenho[];
  colabMap: Map<string, Colaborador>;
  onOpen: (a: AvaliacaoDesempenho) => void;
}

function AnaliseIaTab({
  pctPos,
  pctNeu,
  pctNeg,
  wordCloud,
  temas,
  riscos,
  colabMap,
  onOpen,
}: AnaliseIaTabProps): JSX.Element {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="lg:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Sentimento da empresa</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-8">
            <div className="relative">
              <PieChart
                slices={[
                  { label: 'Positivo', value: pctPos || 1, color: '#10b981' },
                  { label: 'Neutro', value: pctNeu || 1, color: '#f59e0b' },
                  { label: 'Negativo', value: pctNeg || 1, color: '#ef4444' },
                ]}
              />
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-2xl font-bold tabular-nums text-emerald-500">
                  {Math.round(pctPos)}%
                </div>
                <div className="text-[10px] text-muted-foreground">
                  Positivo
                </div>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              {[
                { label: 'Positivo', v: pctPos, c: 'bg-emerald-500' },
                { label: 'Neutro', v: pctNeu, c: 'bg-amber-500' },
                { label: 'Negativo', v: pctNeg, c: 'bg-rose-500' },
              ].map((l) => (
                <div key={l.label} className="flex items-center gap-2">
                  <span className={cn('h-3 w-3 rounded-sm', l.c)} />
                  <span className="w-20 text-muted-foreground">{l.label}</span>
                  <span className="font-semibold tabular-nums">
                    {Math.round(l.v)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Palavras mais citadas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {wordCloud.map((w, i) => {
              const size = 10 + (w.w / 40) * 22;
              const opacity = 0.55 + (w.w / 40) * 0.45;
              return (
                <motion.span
                  key={w.t}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity, scale: 1 }}
                  transition={{ delay: i * 0.02, duration: 0.3 }}
                  className="rounded-full bg-indigo-500/10 px-2.5 py-1 font-medium text-indigo-600 dark:text-indigo-300"
                  style={{ fontSize: `${size}px` }}
                >
                  {w.t}
                </motion.span>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            Principais temas detectados
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {temas.map((t) => {
            const sent = sentimentoStyles[t.polaridade];
            const sign =
              t.polaridade === 'positivo'
                ? '+'
                : t.polaridade === 'negativo'
                  ? '-'
                  : '~';
            return (
              <div key={t.tema}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-medium">
                    {t.tema}{' '}
                    <span
                      className={cn('ml-1 font-bold', sent.cls.split(' ')[1])}
                    >
                      ({sign})
                    </span>
                  </span>
                  <span className="tabular-nums text-muted-foreground">
                    {t.pct}%
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      'h-full rounded-full',
                      t.polaridade === 'positivo'
                        ? 'bg-emerald-500'
                        : t.polaridade === 'negativo'
                          ? 'bg-rose-500'
                          : 'bg-amber-500'
                    )}
                    style={{ width: `${t.pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-4 w-4 text-rose-500" />
            Riscos identificados pela IA
          </CardTitle>
        </CardHeader>
        <CardContent>
          {riscos.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Nenhum risco identificado neste ciclo.
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {riscos.map((a) => {
                const col = colabMap.get(a.colaboradorId);
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => onOpen(a)}
                    className="flex items-center gap-3 rounded-lg border border-rose-500/30 bg-rose-500/5 p-3 text-left transition-colors hover:bg-rose-500/10"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={col?.avatarUrl} alt={col?.nome} />
                      <AvatarFallback>
                        {col ? getInitials(col.nome) : '--'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">
                        {col?.nome}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        Nota {fmtNota(a.notaGeral)} · {col?.departamento}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Drawer — avaliação individual                                       */
/* ------------------------------------------------------------------ */

interface AvaliacaoDrawerProps {
  open: boolean;
  aval: AvaliacaoDesempenho | null;
  colab?: Colaborador | undefined;
  onClose: () => void;
}

function AvaliacaoDrawer({
  open,
  aval,
  colab,
  onClose,
}: AvaliacaoDrawerProps): JSX.Element {
  const [novoComentario, setNovoComentario] = useState('');

  const sent = aval ? sentimentoStyles[aval.sentimento] : null;

  const handleAddComentario = useCallback(() => {
    if (!novoComentario.trim()) return;
    toast.success('Comentário adicionado');
    setNovoComentario('');
  }, [novoComentario]);

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
        {aval && (
          <>
            <SheetHeader className="space-y-0">
              <div className="flex items-start gap-3">
                <Avatar className="h-14 w-14">
                  <AvatarImage src={colab?.avatarUrl} alt={colab?.nome} />
                  <AvatarFallback>
                    {colab ? getInitials(colab.nome) : '--'}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <SheetTitle className="truncate text-lg">
                    {colab?.nome ?? '—'}
                  </SheetTitle>
                  <SheetDescription className="text-xs">
                    {colab?.cargo} · {colab?.departamento} · {aval.periodo}
                  </SheetDescription>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-2xl font-bold tabular-nums">
                      {fmtNota(aval.notaGeral)}
                    </span>
                    <StarRating value={aval.notaGeral} size={16} />
                  </div>
                </div>
              </div>
            </SheetHeader>

            <div className="mt-6 space-y-5">
              {/* Radar 4 dimensões */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Dimensões avaliadas</CardTitle>
                </CardHeader>
                <CardContent className="flex justify-center">
                  <RadarChart
                    size={240}
                    points={[
                      { label: 'Geral', value: aval.notaGeral },
                      { label: 'Liderança', value: aval.notaLideranca },
                      { label: 'Técnica', value: aval.notaTecnica },
                      {
                        label: 'Comportamental',
                        value: aval.notaComportamental,
                      },
                    ]}
                  />
                </CardContent>
              </Card>

              {/* Sentimento */}
              {sent && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">
                      Análise de sentimento
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex items-center justify-between">
                    <Badge variant="outline" className={sent.cls}>
                      <span
                        className={cn('mr-1.5 h-2 w-2 rounded-full', sent.dot)}
                      />
                      {sent.label}
                    </Badge>
                    <div className="text-xs text-muted-foreground">
                      Confiança: 89%
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Feedback da IA */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Sparkles className="h-4 w-4 text-indigo-500" />
                    Feedback da IA
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {aval.feedbackIa}
                  </p>
                </CardContent>
              </Card>

              {/* Comentários dos pares */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <MessageSquare className="h-4 w-4" />
                    Comentários dos pares ({aval.comentariosPares.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {aval.comentariosPares.length === 0 ? (
                    <div className="text-xs text-muted-foreground">
                      Nenhum comentário registrado.
                    </div>
                  ) : (
                    aval.comentariosPares.map((c, i) => (
                      <div
                        key={i}
                        className="relative rounded-lg border border-border/60 bg-muted/40 p-3 text-sm"
                      >
                        <span className="absolute -left-1 top-2 text-2xl leading-none text-muted-foreground/60">
                          &ldquo;
                        </span>
                        <p className="pl-3 text-muted-foreground">{c}</p>
                      </div>
                    ))
                  )}
                  <div className="pt-2">
                    <Textarea
                      placeholder="Adicionar novo comentário..."
                      value={novoComentario}
                      onChange={(e) => setNovoComentario(e.target.value)}
                      className="min-h-[70px] text-sm"
                    />
                    <div className="mt-2 flex justify-end">
                      <Button size="sm" onClick={handleAddComentario}>
                        Enviar comentário
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Objetivos */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Target className="h-4 w-4" />
                    Objetivos ({aval.objetivosAtingidos}/{aval.objetivosTotais})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Progress
                    value={
                      (aval.objetivosAtingidos /
                        Math.max(1, aval.objetivosTotais)) *
                      100
                    }
                    className="h-2"
                  />
                  <div className="space-y-1.5 pt-1">
                    {Array.from({ length: aval.objetivosTotais }).map(
                      (_, i) => {
                        const done = i < aval.objetivosAtingidos;
                        return (
                          <div
                            key={i}
                            className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2 text-xs"
                          >
                            <div className="flex items-center gap-2">
                              <CheckCircle2
                                className={cn(
                                  'h-4 w-4',
                                  done
                                    ? 'text-emerald-500'
                                    : 'text-muted-foreground/40'
                                )}
                              />
                              <span
                                className={cn(
                                  done && 'line-through opacity-70'
                                )}
                              >
                                Objetivo {i + 1} do ciclo
                              </span>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 px-2 text-[10px]"
                              onClick={() => toast.info('Objetivo atualizado')}
                            >
                              {done ? 'Desmarcar' : 'Marcar'}
                            </Button>
                          </div>
                        );
                      }
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Timeline histórico */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">
                    Histórico de avaliações
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ol className="relative space-y-3 border-l border-border/60 pl-4">
                    {CICLOS.slice(0, 4).map((c, i) => (
                      <li key={c} className="relative">
                        <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-background" />
                        <div className="text-xs font-medium">{c}</div>
                        <div className="text-[11px] text-muted-foreground">
                          Nota {fmtNota(aval.notaGeral - i * 0.2)} ·{' '}
                          {fmtDatePtBR(
                            new Date(
                              // eslint-disable-next-line react-hooks/purity
                              Date.now() - i * 90 * 86400000
                            ).toISOString()
                          )}
                        </div>
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>

              {/* Ações */}
              <div className="flex flex-wrap gap-2 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => toast.info('1:1 agendado')}
                >
                  <CalendarDays className="mr-2 h-4 w-4" />
                  Agendar 1:1
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => toast.success('Exportando PDF')}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Exportar PDF
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onClose}
                  className="ml-auto"
                >
                  Fechar
                </Button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

/* ------------------------------------------------------------------ */
/* Sheet Nova avaliação (wizard 4 steps)                               */
/* ------------------------------------------------------------------ */

interface NovaAvaliacaoSheetProps {
  open: boolean;
  onClose: () => void;
  colaboradores: Colaborador[];
}

interface NovaAvaliacaoForm {
  colaboradorId: string;
  notaGeral: number;
  notaLideranca: number;
  notaTecnica: number;
  notaComportamental: number;
  comentarioFortes: string;
  comentarioMelhorar: string;
}

const initialForm: NovaAvaliacaoForm = {
  colaboradorId: '',
  notaGeral: 3.5,
  notaLideranca: 3.5,
  notaTecnica: 3.5,
  notaComportamental: 3.5,
  comentarioFortes: '',
  comentarioMelhorar: '',
};

function NovaAvaliacaoSheet({
  open,
  onClose,
  colaboradores,
}: NovaAvaliacaoSheetProps): JSX.Element {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<NovaAvaliacaoForm>(initialForm);

  // Reset do wizard ao fechar o Sheet — reset legítimo.
  useEffect(() => {
    if (!open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStep(0);
      setForm(initialForm);
    }
  }, [open]);

  const steps = ['Colaborador', 'Dimensões', 'Comentários', 'Revisão'] as const;
  const progress = ((step + 1) / steps.length) * 100;

  const selected = colaboradores.find((c) => c.id === form.colaboradorId);

  const handleSave = useCallback(() => {
    toast.success('Avaliação registrada', {
      description: `Nota geral ${fmtNota(form.notaGeral)} salva para o ciclo atual.`,
    });
    onClose();
  }, [form.notaGeral, onClose]);

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Nova avaliação</SheetTitle>
          <SheetDescription>
            Registre uma avaliação 360 para o ciclo atual.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-1">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>
              Passo {step + 1} de {steps.length}
            </span>
            <span>{steps[step]}</span>
          </div>
          <Progress value={progress} className="h-1.5" />
          <div className="flex items-center justify-between pt-2">
            {steps.map((s, i) => (
              <div
                key={s}
                className={cn(
                  'flex items-center gap-1.5 text-[10px]',
                  i === step
                    ? 'font-semibold text-primary'
                    : 'text-muted-foreground'
                )}
              >
                <span
                  className={cn(
                    'flex h-4 w-4 items-center justify-center rounded-full border text-[9px]',
                    i <= step
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border'
                  )}
                >
                  {i + 1}
                </span>
                {s}
              </div>
            ))}
          </div>
        </div>

        <Separator className="my-4" />

        <div className="space-y-4">
          {step === 0 && (
            <div className="space-y-3">
              <Label className="text-xs">Selecione o colaborador</Label>
              <Select
                value={form.colaboradorId}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, colaboradorId: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Escolha..." />
                </SelectTrigger>
                <SelectContent>
                  {colaboradores.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome} · {c.cargo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selected && (
                <Card>
                  <CardContent className="flex items-center gap-3 p-3">
                    <Avatar>
                      <AvatarImage
                        src={selected.avatarUrl}
                        alt={selected.nome}
                      />
                      <AvatarFallback>
                        {getInitials(selected.nome)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-xs">
                      <div className="font-medium">{selected.nome}</div>
                      <div className="text-muted-foreground">
                        {selected.cargo} · {selected.departamento}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              {(
                [
                  { key: 'notaGeral', label: 'Nota Geral' },
                  { key: 'notaLideranca', label: 'Liderança' },
                  { key: 'notaTecnica', label: 'Técnica' },
                  { key: 'notaComportamental', label: 'Comportamental' },
                ] as const
              ).map((dim) => (
                <div key={dim.key}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-medium">{dim.label}</span>
                    <span className="tabular-nums">
                      {fmtNota(form[dim.key])}
                    </span>
                  </div>
                  <Input
                    type="range"
                    min={0}
                    max={5}
                    step={0.1}
                    value={form[dim.key]}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        [dim.key]: parseFloat(e.target.value),
                      }))
                    }
                    className="h-2 cursor-pointer"
                  />
                  <div className="mt-1">
                    <StarRating
                      value={form[dim.key]}
                      size={14}
                      animated={false}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <Label className="text-xs">Pontos fortes</Label>
                <Textarea
                  value={form.comentarioFortes}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, comentarioFortes: e.target.value }))
                  }
                  placeholder="O que o colaborador faz bem?"
                  className="mt-1 min-h-[80px]"
                />
              </div>
              <div>
                <Label className="text-xs">Pontos a melhorar</Label>
                <Textarea
                  value={form.comentarioMelhorar}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      comentarioMelhorar: e.target.value,
                    }))
                  }
                  placeholder="Em que ele pode evoluir?"
                  className="mt-1 min-h-[80px]"
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3 text-sm">
              <Card>
                <CardContent className="space-y-2 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Colaborador</span>
                    <span className="font-medium">{selected?.nome ?? '—'}</span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Geral</span>
                    <span className="font-semibold tabular-nums">
                      {fmtNota(form.notaGeral)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Liderança</span>
                    <span className="font-semibold tabular-nums">
                      {fmtNota(form.notaLideranca)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Técnica</span>
                    <span className="font-semibold tabular-nums">
                      {fmtNota(form.notaTecnica)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">
                      Comportamental
                    </span>
                    <span className="font-semibold tabular-nums">
                      {fmtNota(form.notaComportamental)}
                    </span>
                  </div>
                </CardContent>
              </Card>
              {form.comentarioFortes && (
                <div>
                  <div className="mb-1 text-xs font-medium text-muted-foreground">
                    Pontos fortes
                  </div>
                  <p className="rounded-md border border-border/60 p-2 text-xs">
                    {form.comentarioFortes}
                  </p>
                </div>
              )}
              {form.comentarioMelhorar && (
                <div>
                  <div className="mb-1 text-xs font-medium text-muted-foreground">
                    A melhorar
                  </div>
                  <p className="rounded-md border border-border/60 p-2 text-xs">
                    {form.comentarioMelhorar}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-6 flex items-center justify-between gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Voltar
          </Button>
          {step < steps.length - 1 ? (
            <Button
              size="sm"
              onClick={() => setStep((s) => Math.min(steps.length - 1, s + 1))}
              disabled={step === 0 && !form.colaboradorId}
            >
              Próximo
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button size="sm" onClick={handleSave}>
              <CheckCircle2 className="mr-1 h-4 w-4" />
              Salvar avaliação
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
