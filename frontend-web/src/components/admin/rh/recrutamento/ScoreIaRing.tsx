/**
 * ScoreIaRing — Indicador circular animado do score IA do candidato.
 * SVG puro, sem dependências novas.
 */
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface ScoreIaRingProps {
  value: number; // 0-100
  size?: number;
  strokeWidth?: number;
  className?: string;
  label?: string;
}

// eslint-disable-next-line react-refresh/only-export-components
export function scoreColor(value: number): {
  stroke: string;
  text: string;
  bg: string;
  label: string;
} {
  if (value >= 85)
    return {
      stroke: 'stroke-emerald-500',
      text: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-500',
      label: 'Excelente',
    };
  if (value >= 70)
    return {
      stroke: 'stroke-yellow-500',
      text: 'text-yellow-600 dark:text-yellow-400',
      bg: 'bg-yellow-500',
      label: 'Bom',
    };
  if (value >= 50)
    return {
      stroke: 'stroke-orange-500',
      text: 'text-orange-600 dark:text-orange-400',
      bg: 'bg-orange-500',
      label: 'Atenção',
    };
  return {
    stroke: 'stroke-red-500',
    text: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-500',
    label: 'Baixo fit',
  };
}

export const ScoreIaRing = ({
  value,
  size = 120,
  strokeWidth = 10,
  className,
  label,
}: ScoreIaRingProps) => {
  const clamped = Math.max(0, Math.min(100, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;
  const colors = scoreColor(clamped);

  return (
    <div
      className={cn(
        'relative inline-flex items-center justify-center',
        className
      )}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          className="fill-none stroke-muted"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className={cn('fill-none', colors.stroke)}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: 'easeOut' }}
          style={{ strokeDasharray: circumference }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn('text-3xl font-bold tabular-nums', colors.text)}>
          {Math.round(clamped)}
        </span>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {label ?? 'Score IA'}
        </span>
      </div>
    </div>
  );
};
