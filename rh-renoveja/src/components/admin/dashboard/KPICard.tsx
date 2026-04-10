import type { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import Sparkline from '../shared/Sparkline';
import Delta from '../shared/Delta';

interface KPICardProps {
  icon: LucideIcon;
  label: string;
  value: number | string;
  suffix?: string;
  /** Tailwind text-* class for the value color. */
  color: string;
  /** Tailwind bg-* class used for the icon tile background. */
  bg: string;
  hint?: string;
  /** Optional secondary description shown below the value. */
  description?: string;

  /** Optional trend line — if provided, renders a sparkline in the corner. */
  trend?: number[];
  /** Hex color for the sparkline stroke. */
  trendColor?: string;

  /**
   * Optional delta — when both `current` and `previous` are provided, a
   * tiny "+12% vs semana passada" indicator is rendered below the value.
   * `polarity` controls whether a rise is good (positive) or bad (negative).
   */
  delta?: {
    current: number;
    previous: number;
    polarity?: 'positive' | 'negative' | 'neutral';
    suffix?: string;
  };

  /**
   * When true, the card uses a slightly more elevated hover state and a
   * subtle gradient backdrop. Used on "primary" KPIs like "Total".
   */
  highlighted?: boolean;
}

/**
 * Dashboard KPI card. Combines an icon tile, a label, a big number, an
 * optional sparkline trend and an optional week-over-week delta.
 *
 * Use `hint` for a tooltip when the metric needs clarification
 * (e.g. taxaRejeicao is over decided candidates, not over total).
 */
export default function KPICard({
  icon: Icon,
  label,
  value,
  suffix,
  color,
  bg,
  hint,
  description,
  trend,
  trendColor,
  delta,
  highlighted = false,
}: KPICardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      role="group"
      aria-label={label}
      title={hint}
      className={[
        'relative overflow-hidden rounded-2xl border p-5 transition-all',
        highlighted
          ? 'bg-gradient-to-br from-white via-white to-primary-50/40 border-primary-200/70 hover:border-primary-300 hover:shadow-[0_14px_40px_-12px_rgba(14,165,233,0.35)]'
          : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-md',
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`flex items-center justify-center w-10 h-10 rounded-xl ${bg} shrink-0`}
            aria-hidden="true"
          >
            <Icon size={19} className={color} />
          </div>
          <span className="text-sm font-semibold text-slate-500 truncate">{label}</span>
        </div>

        {trend && trend.length > 1 && (
          <div className="shrink-0 -mr-1 -mt-1 opacity-80">
            <Sparkline data={trend} color={trendColor ?? '#0EA5E9'} width={72} height={24} />
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-2 flex-wrap">
        <p className={`text-[32px] leading-none font-display font-bold ${color} tabular-nums`}>
          {value}
          {suffix && <span className="text-lg ml-0.5 opacity-70">{suffix}</span>}
        </p>
        {delta && (
          <Delta
            current={delta.current}
            previous={delta.previous}
            polarity={delta.polarity}
            suffix={delta.suffix}
          />
        )}
      </div>

      {description && <p className="text-[11px] text-slate-400 mt-1.5">{description}</p>}

      {/* Decorative corner accent for the highlighted variant only */}
      {highlighted && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-8 -right-8 w-24 h-24 rounded-full bg-primary-200/20 blur-2xl"
        />
      )}
    </motion.div>
  );
}
