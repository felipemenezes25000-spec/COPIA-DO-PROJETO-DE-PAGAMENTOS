/**
 * SkillMatchBar — Barra de match de skill individual (0-100).
 */
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface SkillMatchBarProps {
  skill: string;
  match: number; // 0-100
  className?: string;
}

export const SkillMatchBar = ({
  skill,
  match,
  className,
}: SkillMatchBarProps) => {
  const pct = Math.max(0, Math.min(100, match));
  const tone =
    pct >= 85
      ? 'bg-emerald-500'
      : pct >= 70
        ? 'bg-yellow-500'
        : pct >= 50
          ? 'bg-orange-500'
          : 'bg-red-500';
  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-foreground">{skill}</span>
        <span className="tabular-nums text-muted-foreground">
          {Math.round(pct)}%
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className={cn('h-full rounded-full', tone)}
        />
      </div>
    </div>
  );
};
