import { motion } from 'framer-motion';
import { useId, useMemo } from 'react';

/* ──────────────────────────────────────────────────────────────
   Shared SVG chart primitives — zero deps, animated via framer
   ────────────────────────────────────────────────────────────── */

export interface SeriesPoint {
  label: string;
  value: number;
}

interface LineAreaChartProps {
  data: SeriesPoint[];
  height?: number;
  stroke?: string;
  fill?: string;
  formatValue?: (v: number) => string;
}

/** Animated line + gradient area chart (pure SVG). */
export function LineAreaChart({
  data,
  height = 220,
  stroke = '#2563eb',
  fill = '#2563eb',
  formatValue = (v) => v.toString(),
}: LineAreaChartProps) {
  const gid = useId();
  const width = 640;
  const pad = { t: 16, r: 16, b: 28, l: 44 };
  const innerW = width - pad.l - pad.r;
  const innerH = height - pad.t - pad.b;

  const { pathLine, pathArea, ticks, xs } = useMemo(() => {
    if (data.length === 0) {
      return { pathLine: '', pathArea: '', ticks: [], xs: [] as number[] };
    }
    const values = data.map((d) => d.value);
    const max = Math.max(...values) * 1.1;
    const min = Math.min(0, Math.min(...values));
    const range = max - min || 1;
    const step = innerW / Math.max(1, data.length - 1);
    const xArr = data.map((_, i) => pad.l + i * step);
    const yArr = data.map(
      (d) => pad.t + innerH - ((d.value - min) / range) * innerH
    );
    const line = xArr
      .map(
        (x, i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${yArr[i].toFixed(1)}`
      )
      .join(' ');
    const area =
      `M${xArr[0].toFixed(1)},${(pad.t + innerH).toFixed(1)} ` +
      xArr.map((x, i) => `L${x.toFixed(1)},${yArr[i].toFixed(1)}`).join(' ') +
      ` L${xArr[xArr.length - 1].toFixed(1)},${(pad.t + innerH).toFixed(1)} Z`;
    const t = [0, 0.25, 0.5, 0.75, 1].map((p) => ({
      y: pad.t + innerH - p * innerH,
      v: min + p * range,
    }));
    return { pathLine: line, pathArea: area, ticks: t, xs: xArr };
  }, [data, innerH, innerW, pad.l, pad.t]);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-auto w-full"
      role="img"
      aria-label="Gráfico de linha"
    >
      <defs>
        <linearGradient id={`grad-${gid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={fill} stopOpacity={0.35} />
          <stop offset="100%" stopColor={fill} stopOpacity={0} />
        </linearGradient>
      </defs>

      {/* Gridlines + Y ticks */}
      {ticks.map((t, i) => (
        <g key={i}>
          <line
            x1={pad.l}
            x2={width - pad.r}
            y1={t.y}
            y2={t.y}
            stroke="currentColor"
            strokeOpacity={0.08}
          />
          <text
            x={pad.l - 6}
            y={t.y + 3}
            textAnchor="end"
            fontSize={10}
            fill="currentColor"
            opacity={0.5}
          >
            {formatValue(t.v)}
          </text>
        </g>
      ))}

      {/* Area fill */}
      <motion.path
        d={pathArea}
        fill={`url(#grad-${gid})`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      />

      {/* Line */}
      <motion.path
        d={pathLine}
        fill="none"
        stroke={stroke}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.1, ease: 'easeOut' }}
      />

      {/* X labels */}
      {data.map((d, i) => (
        <text
          key={d.label}
          x={xs[i]}
          y={height - 8}
          textAnchor="middle"
          fontSize={10}
          fill="currentColor"
          opacity={0.6}
        >
          {d.label}
        </text>
      ))}
    </svg>
  );
}

/* ────────────────────────────────────────────────────────────── */

interface ForecastChartProps {
  history: SeriesPoint[];
  forecast: SeriesPoint[];
  confidence: Array<{ label: string; low: number; high: number }>;
  formatValue?: (v: number) => string;
  height?: number;
}

/** Historical solid line + dashed forecast + confidence band. */
export function ForecastChart({
  history,
  forecast,
  confidence,
  formatValue = (v) => v.toString(),
  height = 260,
}: ForecastChartProps) {
  const gid = useId();
  const width = 720;
  const pad = { t: 16, r: 20, b: 30, l: 56 };
  const innerW = width - pad.l - pad.r;
  const innerH = height - pad.t - pad.b;

  const { histPath, fcPath, bandPath, ticks, allLabels, xAt, split } =
    useMemo(() => {
      const all = [...history, ...forecast];
      if (all.length === 0) {
        return {
          histPath: '',
          fcPath: '',
          bandPath: '',
          ticks: [] as Array<{ y: number; v: number }>,
          allLabels: [] as string[],
          xAt: (() => 0) as (i: number) => number,
          split: 0,
        };
      }
      const vals = [
        ...all.map((d) => d.value),
        ...confidence.map((c) => c.high),
        ...confidence.map((c) => c.low),
      ];
      const max = Math.max(...vals) * 1.1;
      const min = Math.min(0, Math.min(...vals));
      const range = max - min || 1;
      const step = innerW / Math.max(1, all.length - 1);
      const x = (i: number) => pad.l + i * step;
      const y = (v: number) => pad.t + innerH - ((v - min) / range) * innerH;

      const histPts = history.map((d, i) => ({ x: x(i), y: y(d.value) }));
      const fcStartIdx = history.length - 1;
      const fcPts = forecast.map((d, i) => ({
        x: x(fcStartIdx + 1 + i),
        y: y(d.value),
      }));

      const histStr = histPts
        .map(
          (p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`
        )
        .join(' ');
      // connect forecast to last historical point
      const fcStrSegs = [
        `M${histPts[histPts.length - 1].x.toFixed(1)},${histPts[histPts.length - 1].y.toFixed(1)}`,
      ];
      fcPts.forEach((p) =>
        fcStrSegs.push(`L${p.x.toFixed(1)},${p.y.toFixed(1)}`)
      );
      const fcStr = fcStrSegs.join(' ');

      // confidence band (aligned to forecast section)
      const bandStart = fcStartIdx;
      const upper = confidence.map((c, i) => ({
        x: x(bandStart + i),
        y: y(c.high),
      }));
      const lower = confidence.map((c, i) => ({
        x: x(bandStart + i),
        y: y(c.low),
      }));
      const bandStr =
        upper
          .map(
            (p, i) =>
              `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`
          )
          .join(' ') +
        ' ' +
        [...lower]
          .reverse()
          .map((p) => `L${p.x.toFixed(1)},${p.y.toFixed(1)}`)
          .join(' ') +
        ' Z';

      const t = [0, 0.25, 0.5, 0.75, 1].map((p) => ({
        y: pad.t + innerH - p * innerH,
        v: min + p * range,
      }));

      return {
        histPath: histStr,
        fcPath: fcStr,
        bandPath: bandStr,
        ticks: t,
        allLabels: all.map((a) => a.label),
        xAt: x,
        split: histPts[histPts.length - 1].x,
      };
    }, [history, forecast, confidence, innerW, innerH, pad.l, pad.t]);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-auto w-full"
      role="img"
      aria-label="Projeção"
    >
      <defs>
        <linearGradient id={`band-${gid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.28} />
          <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.05} />
        </linearGradient>
      </defs>

      {ticks.map((t, i) => (
        <g key={i}>
          <line
            x1={pad.l}
            x2={width - pad.r}
            y1={t.y}
            y2={t.y}
            stroke="currentColor"
            strokeOpacity={0.08}
          />
          <text
            x={pad.l - 6}
            y={t.y + 3}
            textAnchor="end"
            fontSize={10}
            fill="currentColor"
            opacity={0.5}
          >
            {formatValue(t.v)}
          </text>
        </g>
      ))}

      {/* Split vertical line */}
      <line
        x1={split}
        x2={split}
        y1={pad.t}
        y2={height - pad.b}
        stroke="currentColor"
        strokeOpacity={0.25}
        strokeDasharray="3 3"
      />

      <motion.path
        d={bandPath}
        fill={`url(#band-${gid})`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.3 }}
      />

      <motion.path
        d={histPath}
        fill="none"
        stroke="#2563eb"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1, ease: 'easeOut' }}
      />

      <motion.path
        d={fcPath}
        fill="none"
        stroke="#8b5cf6"
        strokeWidth={2.5}
        strokeDasharray="5 5"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1, ease: 'easeOut', delay: 0.6 }}
      />

      {allLabels.map((l, i) => (
        <text
          key={`${l}-${i}`}
          x={xAt(i)}
          y={height - 10}
          textAnchor="middle"
          fontSize={10}
          fill="currentColor"
          opacity={0.6}
        >
          {l}
        </text>
      ))}
    </svg>
  );
}

/* ──────────────────────────────────────────────────────────────
   Donut chart
   ────────────────────────────────────────────────────────────── */

export interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  data: DonutSlice[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: string;
}

export function DonutChart({
  data,
  size = 220,
  thickness = 34,
  centerLabel,
  centerValue,
}: DonutChartProps) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const radius = size / 2 - thickness / 2 - 4;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * radius;

  const dashes = data.map((slice) => (slice.value / total) * circumference);
  const offsets = dashes.reduce<number[]>((arr, _d, i) => {
    arr.push(i === 0 ? 0 : arr[i - 1]! + dashes[i - 1]!);
    return arr;
  }, []);
  const arcs = data.map((slice, i) => ({
    color: slice.color,
    dash: dashes[i]!,
    gap: circumference - dashes[i]!,
    offset: offsets[i]!,
    label: slice.label,
    value: slice.value,
  }));

  return (
    <div className="flex flex-col items-center">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="h-auto w-full max-w-[220px]"
        role="img"
        aria-label="Distribuição"
      >
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeOpacity={0.08}
          strokeWidth={thickness}
        />
        {arcs.map((a, i) => (
          <motion.circle
            key={i}
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke={a.color}
            strokeWidth={thickness}
            strokeDasharray={`${a.dash} ${a.gap}`}
            strokeDashoffset={-a.offset}
            strokeLinecap="butt"
            transform={`rotate(-90 ${cx} ${cy})`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 * i, duration: 0.5 }}
          />
        ))}
        {(centerLabel || centerValue) && (
          <g>
            <text
              x={cx}
              y={cy - 4}
              textAnchor="middle"
              fontSize={18}
              fontWeight={700}
              fill="currentColor"
            >
              {centerValue}
            </text>
            <text
              x={cx}
              y={cy + 14}
              textAnchor="middle"
              fontSize={10}
              fill="currentColor"
              opacity={0.6}
            >
              {centerLabel}
            </text>
          </g>
        )}
      </svg>
      <ul className="mt-4 w-full space-y-1.5">
        {data.map((d) => {
          const pct = ((d.value / total) * 100).toFixed(0);
          return (
            <li
              key={d.label}
              className="flex items-center justify-between text-xs"
            >
              <span className="flex items-center gap-2 text-muted-foreground">
                <span
                  className="h-2.5 w-2.5 rounded-sm"
                  style={{ background: d.color }}
                />
                {d.label}
              </span>
              <span className="font-medium tabular-nums">{pct}%</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   Comparative grouped bars
   ────────────────────────────────────────────────────────────── */

export interface ComparativeBarsDatum {
  label: string;
  a: number;
  b: number;
}

interface ComparativeBarsProps {
  data: ComparativeBarsDatum[];
  labelA: string;
  labelB: string;
  colorA?: string;
  colorB?: string;
  height?: number;
  formatValue?: (v: number) => string;
}

export function ComparativeBars({
  data,
  labelA,
  labelB,
  colorA = '#ef4444',
  colorB = '#10b981',
  height = 240,
  formatValue = (v) => v.toString(),
}: ComparativeBarsProps) {
  const width = 760;
  const pad = { t: 16, r: 16, b: 30, l: 56 };
  const innerW = width - pad.l - pad.r;
  const innerH = height - pad.t - pad.b;
  const max = Math.max(...data.flatMap((d) => [d.a, d.b])) * 1.1 || 1;
  const groupW = innerW / data.length;
  const barW = Math.min(18, groupW * 0.35);
  const gap = 4;

  return (
    <div>
      <div className="mb-2 flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm" style={{ background: colorA }} />
          {labelA}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm" style={{ background: colorB }} />
          {labelB}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full"
        role="img"
        aria-label="Comparativo"
      >
        {[0, 0.25, 0.5, 0.75, 1].map((p) => {
          const y = pad.t + innerH - p * innerH;
          return (
            <g key={p}>
              <line
                x1={pad.l}
                x2={width - pad.r}
                y1={y}
                y2={y}
                stroke="currentColor"
                strokeOpacity={0.08}
              />
              <text
                x={pad.l - 6}
                y={y + 3}
                textAnchor="end"
                fontSize={10}
                fill="currentColor"
                opacity={0.5}
              >
                {formatValue(p * max)}
              </text>
            </g>
          );
        })}
        {data.map((d, i) => {
          const cx = pad.l + i * groupW + groupW / 2;
          const hA = (d.a / max) * innerH;
          const hB = (d.b / max) * innerH;
          const xA = cx - barW - gap / 2;
          const xB = cx + gap / 2;
          const yA = pad.t + innerH - hA;
          const yB = pad.t + innerH - hB;
          return (
            <g key={d.label}>
              <motion.rect
                x={xA}
                y={yA}
                width={barW}
                height={hA}
                fill={colorA}
                rx={3}
                initial={{ height: 0, y: pad.t + innerH }}
                animate={{ height: hA, y: yA }}
                transition={{ duration: 0.6, delay: i * 0.04 }}
              />
              <motion.rect
                x={xB}
                y={yB}
                width={barW}
                height={hB}
                fill={colorB}
                rx={3}
                initial={{ height: 0, y: pad.t + innerH }}
                animate={{ height: hB, y: yB }}
                transition={{ duration: 0.6, delay: i * 0.04 + 0.08 }}
              />
              <text
                x={cx}
                y={height - 10}
                textAnchor="middle"
                fontSize={10}
                fill="currentColor"
                opacity={0.6}
              >
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   Inline sparkline for KPI cards
   ────────────────────────────────────────────────────────────── */

interface SparklineProps {
  points: number[];
  color?: string;
  width?: number;
  height?: number;
}

export function Sparkline({
  points,
  color = '#2563eb',
  width = 120,
  height = 36,
}: SparklineProps) {
  if (points.length === 0) return null;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;
  const step = width / Math.max(1, points.length - 1);
  const d = points
    .map((v, i) => {
      const x = i * step;
      const y = height - ((v - min) / range) * (height - 4) - 2;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-9 w-full"
      aria-hidden="true"
    >
      <motion.path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1, ease: 'easeOut' }}
      />
    </svg>
  );
}
