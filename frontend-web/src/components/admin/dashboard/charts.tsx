/**
 * Componentes visuais SVG puros para o AdminDashboard.
 * Sem dependências de chart libs — apenas SVG + Tailwind tokens semânticos.
 */
import { motion } from 'framer-motion';
import { Progress } from '@/components/ui/progress';

// ---------- Sparkline ----------
interface SparklineProps {
  data: number[];
  trend: 'up' | 'down' | 'stable';
  width?: number;
  height?: number;
}

export function AiMiniSparkline({
  data,
  trend,
  width = 96,
  height = 32,
}: SparklineProps) {
  if (!data.length) return <svg width={width} height={height} aria-hidden />;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const step = width / Math.max(1, data.length - 1);
  const points = data
    .map((v, i) => `${i * step},${height - ((v - min) / range) * height}`)
    .join(' ');
  const stroke =
    trend === 'up'
      ? 'hsl(var(--success, 142 71% 45%))'
      : trend === 'down'
        ? 'hsl(var(--destructive))'
        : 'hsl(var(--muted-foreground))';
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden
    >
      <polyline
        fill="none"
        stroke={stroke}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

// ---------- Line/Area chart (Consultas) ----------
interface AreaLineProps {
  data: number[];
  height?: number;
  color?: string;
  label?: string;
}

export function AreaLineChart({
  data,
  height = 220,
  color = 'hsl(var(--primary))',
  label,
}: AreaLineProps) {
  const width = 800;
  if (!data.length) return null;
  const min = Math.min(...data) * 0.95;
  const max = Math.max(...data) * 1.05;
  const range = max - min || 1;
  const step = width / Math.max(1, data.length - 1);
  const points = data.map(
    (v, i) => [i * step, height - ((v - min) / range) * height] as const
  );
  const path = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]},${p[1]}`)
    .join(' ');
  const area = `${path} L${width},${height} L0,${height} Z`;
  return (
    <div className="w-full">
      {label && <p className="mb-1 text-xs text-muted-foreground">{label}</p>}
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="areaGrad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((t) => (
          <line
            key={t}
            x1={0}
            x2={width}
            y1={height * t}
            y2={height * t}
            stroke="hsl(var(--border))"
            strokeDasharray="4 6"
            strokeWidth={1}
          />
        ))}
        <motion.path
          d={area}
          fill="url(#areaGrad)"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
        />
        <motion.path
          d={path}
          fill="none"
          stroke={color}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />
        {points.map(([x, y], i) =>
          i === points.length - 1 ? (
            <circle key={i} cx={x} cy={y} r={4} fill={color} />
          ) : null
        )}
      </svg>
    </div>
  );
}

// ---------- Donut (gênero) ----------
interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

interface DonutProps {
  segments: DonutSegment[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
}

export function DonutChart({
  segments,
  size = 180,
  thickness = 28,
  centerLabel,
}: DonutProps) {
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;
  const radius = size / 2 - thickness / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * radius;
  const prefix = segments.reduce<number[]>((arr, seg) => {
    arr.push((arr[arr.length - 1] ?? 0) + seg.value);
    return arr;
  }, []);
  return (
    <div className="relative inline-flex items-center justify-center">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        aria-hidden
      >
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={thickness}
        />
        {segments.map((seg, i) => {
          const frac = seg.value / total;
          const dash = frac * circumference;
          const prior = i === 0 ? 0 : prefix[i - 1]!;
          const offset = (prior / total) * circumference;
          return (
            <motion.circle
              key={seg.label}
              cx={cx}
              cy={cy}
              r={radius}
              fill="none"
              stroke={seg.color}
              strokeWidth={thickness}
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-offset}
              transform={`rotate(-90 ${cx} ${cy})`}
              strokeLinecap="butt"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.15, duration: 0.6 }}
            />
          );
        })}
      </svg>
      {centerLabel && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-2xl font-bold tabular-nums">
            {total.toLocaleString('pt-BR')}
          </p>
          <p className="text-xs text-muted-foreground">{centerLabel}</p>
        </div>
      )}
    </div>
  );
}

// ---------- Funil horizontal ----------
interface FunnelProps {
  data: Array<{ etapa: string; count: number }>;
}

export function FunnelChart({ data }: FunnelProps) {
  if (!data.length) return null;
  const max = Math.max(...data.map((d) => d.count));
  return (
    <div className="space-y-3">
      {data.map((row, i) => {
        const pct = (row.count / max) * 100;
        const convRate =
          i > 0 ? Math.round((row.count / data[i - 1].count) * 100) : 100;
        return (
          <div key={row.etapa}>
            <div className="mb-1 flex justify-between text-xs">
              <span className="font-medium">{row.etapa}</span>
              <span className="tabular-nums text-muted-foreground">
                {row.count.toLocaleString('pt-BR')} ({convRate}%)
              </span>
            </div>
            <div className="h-7 overflow-hidden rounded-md bg-secondary/60">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ delay: i * 0.08, duration: 0.7, ease: 'easeOut' }}
                className="h-full rounded-md bg-gradient-to-r from-primary/80 to-primary"
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------- Barras horizontais (faixa etária) ----------
interface BarListProps {
  data: Array<{ label: string; value: number }>;
  colorFrom?: string;
  colorTo?: string;
}

export function HorizontalBars({ data }: BarListProps) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="space-y-3">
      {data.map((row, i) => {
        const pct = (row.value / max) * 100;
        return (
          <div key={row.label} className="flex items-center gap-3">
            <span className="w-14 text-xs font-medium text-muted-foreground">
              {row.label}
            </span>
            <div className="h-5 flex-1 overflow-hidden rounded-full bg-secondary/60">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ delay: i * 0.07, duration: 0.7, ease: 'easeOut' }}
                className="h-full bg-gradient-to-r from-primary/70 via-primary to-primary/90"
              />
            </div>
            <span className="w-20 text-right text-xs tabular-nums">
              {row.value.toLocaleString('pt-BR')}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ---------- Top Estados + barras ----------
interface TopEstadosListProps {
  estados: Array<{ uf: string; count: number; pct: number }>;
}

export function TopEstadosList({ estados }: TopEstadosListProps) {
  return (
    <div className="space-y-3">
      {estados.map((e, i) => (
        <motion.div
          key={e.uf}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05 }}
          className="flex items-center gap-3"
        >
          <div className="flex h-8 w-10 items-center justify-center rounded-md bg-primary/10 text-xs font-bold text-primary">
            {e.uf}
          </div>
          <div className="flex-1">
            <div className="mb-1 flex justify-between text-xs">
              <span className="font-medium">
                {e.count.toLocaleString('pt-BR')} pacientes
              </span>
              <span className="tabular-nums text-muted-foreground">
                {e.pct}%
              </span>
            </div>
            <Progress value={e.pct * 3} className="h-2" />
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// ---------- Mapa simplificado do Brasil ----------
interface BrasilMapProps {
  estados: Array<{ uf: string; count: number; pct: number }>;
}

// Coordenadas aproximadas (viewport 320x340) de cada UF para visual ilustrativo.
const UF_COORDS: Record<string, { x: number; y: number }> = {
  AC: { x: 50, y: 145 },
  AM: { x: 95, y: 110 },
  RR: { x: 110, y: 45 },
  RO: { x: 90, y: 160 },
  PA: { x: 155, y: 100 },
  AP: { x: 170, y: 55 },
  TO: { x: 175, y: 150 },
  MA: { x: 200, y: 105 },
  PI: { x: 215, y: 130 },
  CE: { x: 240, y: 105 },
  RN: { x: 265, y: 115 },
  PB: { x: 268, y: 130 },
  PE: { x: 260, y: 145 },
  AL: { x: 255, y: 160 },
  SE: { x: 245, y: 170 },
  BA: { x: 220, y: 175 },
  MT: { x: 130, y: 180 },
  DF: { x: 180, y: 195 },
  GO: { x: 170, y: 205 },
  MG: { x: 200, y: 220 },
  ES: { x: 235, y: 225 },
  RJ: { x: 220, y: 245 },
  SP: { x: 180, y: 245 },
  PR: { x: 160, y: 270 },
  SC: { x: 155, y: 290 },
  RS: { x: 135, y: 310 },
  MS: { x: 135, y: 225 },
};

export function BrasilMap({ estados }: BrasilMapProps) {
  const maxCount = Math.max(...estados.map((e) => e.count), 1);
  const byUf = new Map(estados.map((e) => [e.uf, e]));
  return (
    <svg
      viewBox="0 0 320 340"
      className="h-auto w-full"
      aria-label="Mapa do Brasil — concentração de pacientes"
    >
      <rect
        x={10}
        y={10}
        width={300}
        height={320}
        rx={16}
        fill="hsl(var(--muted) / 0.3)"
        stroke="hsl(var(--border))"
        strokeWidth={1}
      />
      <text
        x={160}
        y={30}
        textAnchor="middle"
        className="fill-muted-foreground"
        fontSize={10}
      >
        Concentração aproximada por UF
      </text>
      {Object.entries(UF_COORDS).map(([uf, coord]) => {
        const match = byUf.get(uf);
        const count = match?.count ?? 0;
        const intensity = count / maxCount;
        const r = 6 + intensity * 18;
        return (
          <g key={uf}>
            <motion.circle
              cx={coord.x}
              cy={coord.y}
              initial={{ r: 0, opacity: 0 }}
              animate={{ r, opacity: match ? 0.85 : 0.25 }}
              transition={{ duration: 0.6, delay: 0.05 }}
              fill="hsl(var(--primary))"
              fillOpacity={0.25 + intensity * 0.6}
              stroke="hsl(var(--primary))"
              strokeWidth={match ? 1.2 : 0.6}
            />
            <text
              x={coord.x}
              y={coord.y + 3}
              textAnchor="middle"
              fontSize={8}
              className="fill-foreground font-semibold"
              pointerEvents="none"
            >
              {uf}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ---------- Heatmap 7x24 ----------
interface HeatmapProps {
  cells: Array<{ dia: number; hora: number; intensidade: number }>;
}

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export function HeatmapGrid({ cells }: HeatmapProps) {
  const grid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
  cells.forEach((c) => {
    if (c.dia >= 0 && c.dia < 7 && c.hora >= 0 && c.hora < 24) {
      grid[c.dia][c.hora] = c.intensidade;
    }
  });
  const cell = 22;
  const gap = 3;
  const leftPad = 36;
  const topPad = 18;
  const width = leftPad + 24 * (cell + gap);
  const height = topPad + 7 * (cell + gap) + 18;
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-auto w-full"
      aria-label="Heatmap de atividade"
    >
      {Array.from({ length: 24 }, (_, h) =>
        h % 3 === 0 ? (
          <text
            key={h}
            x={leftPad + h * (cell + gap) + cell / 2}
            y={12}
            textAnchor="middle"
            fontSize={9}
            className="fill-muted-foreground"
          >
            {h.toString().padStart(2, '0')}h
          </text>
        ) : null
      )}
      {DIAS.map((label, d) => (
        <text
          key={label}
          x={4}
          y={topPad + d * (cell + gap) + cell / 2 + 3}
          fontSize={10}
          className="fill-muted-foreground"
        >
          {label}
        </text>
      ))}
      {grid.map((row, d) =>
        row.map((intensity, h) => (
          <motion.rect
            key={`${d}-${h}`}
            x={leftPad + h * (cell + gap)}
            y={topPad + d * (cell + gap)}
            width={cell}
            height={cell}
            rx={4}
            fill="hsl(var(--primary))"
            fillOpacity={0.08 + intensity * 0.82}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: (d * 24 + h) * 0.002, duration: 0.3 }}
          />
        ))
      )}
      <text
        x={leftPad}
        y={height - 4}
        fontSize={9}
        className="fill-muted-foreground"
      >
        Menos
      </text>
      {Array.from({ length: 5 }, (_, i) => (
        <rect
          key={i}
          x={leftPad + 34 + i * 14}
          y={height - 13}
          width={12}
          height={10}
          rx={2}
          fill="hsl(var(--primary))"
          fillOpacity={0.1 + i * 0.2}
        />
      ))}
      <text
        x={leftPad + 34 + 5 * 14 + 4}
        y={height - 4}
        fontSize={9}
        className="fill-muted-foreground"
      >
        Mais
      </text>
    </svg>
  );
}
