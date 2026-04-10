import { useId, useMemo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface AiForecastChartProps {
  historical: number[];
  forecast: number[];
  confidence: number; // 0-1
  label: string;
  height?: number;
  width?: number;
  className?: string;
}

interface Point {
  x: number;
  y: number;
  value: number;
}

function buildPath(points: Point[]): string {
  return points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(' ');
}

export const AiForecastChart = ({
  historical,
  forecast,
  confidence,
  label,
  height = 160,
  width = 480,
  className,
}: AiForecastChartProps) => {
  const bandId = useId();

  const { histPath, forecastPath, upperPath, lowerPath, bandPath, axisTicks } =
    useMemo(() => {
      const all = [...historical, ...forecast];
      if (all.length === 0) {
        return {
          histPath: '',
          forecastPath: '',
          upperPath: '',
          lowerPath: '',
          bandPath: '',
          axisTicks: [] as number[],
        };
      }
      const min = Math.min(...all);
      const max = Math.max(...all);
      const range = max - min || 1;

      const padL = 28;
      const padR = 8;
      const padT = 10;
      const padB = 18;
      const innerW = width - padL - padR;
      const innerH = height - padT - padB;

      const total = all.length;
      const stepX = innerW / Math.max(total - 1, 1);
      const yFor = (v: number) => padT + (1 - (v - min) / range) * innerH;

      const histPoints: Point[] = historical.map((v, i) => ({
        x: padL + i * stepX,
        y: yFor(v),
        value: v,
      }));

      // Forecast continues from last historical point for visual continuity
      const forecastStartIdx = Math.max(historical.length - 1, 0);
      const forecastPoints: Point[] = [];
      if (historical.length > 0) {
        forecastPoints.push(histPoints[histPoints.length - 1]);
      }
      forecast.forEach((v, i) => {
        forecastPoints.push({
          x: padL + (forecastStartIdx + i + 1) * stepX,
          y: yFor(v),
          value: v,
        });
      });

      const confClamp = Math.min(Math.max(confidence, 0), 1);
      const delta = (1 - confClamp) * range * 0.6;

      const upperPoints: Point[] = forecastPoints.map((p) => ({
        x: p.x,
        y: yFor(Math.min(p.value + delta, max + delta)),
        value: p.value + delta,
      }));
      const lowerPoints: Point[] = forecastPoints.map((p) => ({
        x: p.x,
        y: yFor(Math.max(p.value - delta, min - delta)),
        value: p.value - delta,
      }));

      const bandD =
        upperPoints.length > 0
          ? `${buildPath(upperPoints)} ${lowerPoints
              .slice()
              .reverse()
              .map((p) => `L ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
              .join(' ')} Z`
          : '';

      // 3 horizontal grid ticks
      const ticks = [0, 0.5, 1].map((t) => padT + t * innerH);

      return {
        histPath: buildPath(histPoints),
        forecastPath: buildPath(forecastPoints),
        upperPath: buildPath(upperPoints),
        lowerPath: buildPath(lowerPoints),
        bandPath: bandD,
        axisTicks: ticks,
      };
    }, [historical, forecast, confidence, width, height]);

  return (
    <div className={cn('w-full', className)}>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">
          {label}
        </span>
        <span className="text-[10px] text-muted-foreground">
          Confiança {(confidence * 100).toFixed(0)}%
        </span>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full"
        role="img"
        aria-label={`Previsão ${label}`}
      >
        <defs>
          <linearGradient id={bandId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity={0.18} />
            <stop offset="100%" stopColor="currentColor" stopOpacity={0.04} />
          </linearGradient>
        </defs>

        {/* Grid */}
        {axisTicks.map((y, i) => (
          <line
            key={i}
            x1={28}
            x2={width - 8}
            y1={y}
            y2={y}
            stroke="currentColor"
            className="text-muted-foreground/20"
            strokeWidth={1}
            strokeDasharray="2 3"
          />
        ))}

        {/* Confidence band */}
        {bandPath && (
          <path
            d={bandPath}
            fill={`url(#${bandId})`}
            className="text-primary"
          />
        )}

        {/* Upper/lower thin lines */}
        {upperPath && (
          <path
            d={upperPath}
            fill="none"
            stroke="currentColor"
            className="text-primary/30"
            strokeWidth={1}
          />
        )}
        {lowerPath && (
          <path
            d={lowerPath}
            fill="none"
            stroke="currentColor"
            className="text-primary/30"
            strokeWidth={1}
          />
        )}

        {/* Historical solid */}
        <motion.path
          d={histPath}
          fill="none"
          stroke="currentColor"
          className="text-foreground"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />

        {/* Forecast dashed */}
        <motion.path
          d={forecastPath}
          fill="none"
          stroke="currentColor"
          className="text-primary"
          strokeWidth={2}
          strokeDasharray="5 4"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.8, delay: 0.4, ease: 'easeOut' }}
        />

        {/* Y axis line */}
        <line
          x1={28}
          x2={28}
          y1={10}
          y2={height - 18}
          stroke="currentColor"
          className="text-muted-foreground/30"
          strokeWidth={1}
        />
        {/* X axis line */}
        <line
          x1={28}
          x2={width - 8}
          y1={height - 18}
          y2={height - 18}
          stroke="currentColor"
          className="text-muted-foreground/30"
          strokeWidth={1}
        />
      </svg>
    </div>
  );
};

export default AiForecastChart;
