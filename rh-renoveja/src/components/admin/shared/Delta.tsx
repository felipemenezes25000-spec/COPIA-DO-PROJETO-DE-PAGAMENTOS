import { ArrowDown, ArrowUp, Minus } from 'lucide-react';

interface DeltaProps {
  /** Current period value. */
  current: number;
  /** Previous period value used to compute the delta. */
  previous: number;
  /** What "positive" means visually — some KPIs like rejections are inverted. */
  polarity?: 'positive' | 'negative' | 'neutral';
  /** Short label shown after the delta, e.g. "vs semana passada". */
  suffix?: string;
  className?: string;
}

/**
 * Delta indicator for KPI cards. Handles three visual states:
 *  - up arrow (green if polarity-positive, red if polarity-negative)
 *  - down arrow (inverted semantic)
 *  - dash (no change)
 *
 * `polarity` lets callers declare whether a rising value is "good" or
 * "bad" — e.g. a rising "Rejeitados" count should render red, not green.
 */
export default function Delta({
  current,
  previous,
  polarity = 'positive',
  suffix,
  className = '',
}: DeltaProps) {
  // No baseline to compare — don't show anything (caller can conditionally render).
  if (previous === 0 && current === 0) {
    return (
      <span
        className={[
          'inline-flex items-center gap-1 text-[11px] font-medium text-slate-400',
          className,
        ].join(' ')}
      >
        <Minus size={11} aria-hidden="true" />
        {suffix && <span className="text-slate-400">{suffix}</span>}
      </span>
    );
  }

  const diff = current - previous;
  const pct = previous === 0 ? 100 : Math.round((diff / previous) * 100);
  const isUp = diff > 0;
  const isDown = diff < 0;

  // Resolve color based on polarity.
  // - positive polarity: up = good (emerald), down = bad (rose)
  // - negative polarity: up = bad (rose),    down = good (emerald)
  // - neutral polarity: always slate
  let color = 'text-slate-500';
  if (polarity !== 'neutral') {
    if (isUp) {
      color = polarity === 'positive' ? 'text-emerald-600' : 'text-rose-600';
    } else if (isDown) {
      color = polarity === 'positive' ? 'text-rose-600' : 'text-emerald-600';
    }
  }

  const Icon = isUp ? ArrowUp : isDown ? ArrowDown : Minus;
  const sign = isUp ? '+' : '';

  return (
    <span
      className={[
        'inline-flex items-center gap-1 text-[11px] font-semibold tabular-nums',
        color,
        className,
      ].join(' ')}
      aria-label={`${sign}${pct}% ${suffix ?? ''}`}
    >
      <Icon size={11} strokeWidth={3} aria-hidden="true" />
      {sign}
      {pct}%
      {suffix && <span className="ml-1 font-normal text-slate-400">{suffix}</span>}
    </span>
  );
}
