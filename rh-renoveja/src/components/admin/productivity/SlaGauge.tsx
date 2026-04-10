import { memo } from 'react';
import type { SlaByPriority } from '../../../types/productivity';
import { formatMinutes, formatPercent } from '../../../lib/productivity-utils';

interface SlaGaugeProps {
  label: string;
  data: SlaByPriority;
  tone: 'urgent' | 'high' | 'normal';
}

const TONE_MAP: Record<SlaGaugeProps['tone'], { ring: string; dot: string }> = {
  urgent: { ring: 'stroke-red-500', dot: 'bg-red-500' },
  high: { ring: 'stroke-amber-500', dot: 'bg-amber-500' },
  normal: { ring: 'stroke-emerald-500', dot: 'bg-emerald-500' },
};

function SlaGaugeInner({ label, data, tone }: SlaGaugeProps) {
  const ratio = Math.max(0, Math.min(1, data.withinTargetRate));
  const circumference = 2 * Math.PI * 36;
  const dashOffset = circumference * (1 - ratio);
  const styles = TONE_MAP[tone];

  return (
    <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="relative flex h-20 w-20 shrink-0 items-center justify-center">
        <svg viewBox="0 0 80 80" className="h-20 w-20 -rotate-90">
          <circle cx="40" cy="40" r="36" strokeWidth="8" className="stroke-slate-200 fill-none" />
          <circle
            cx="40"
            cy="40"
            r="36"
            strokeWidth="8"
            strokeLinecap="round"
            className={`fill-none ${styles.ring}`}
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{ transition: 'stroke-dashoffset 600ms ease-out' }}
          />
        </svg>
        <span className="absolute text-sm font-semibold text-slate-900 tabular-nums">
          {formatPercent(ratio, 0)}
        </span>
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${styles.dot}`} aria-hidden />
          <h3 className="text-sm font-semibold text-slate-900">{label}</h3>
        </div>
        <p className="text-xs text-slate-500">
          Target: <strong>{data.targetMinutes}min</strong>
        </p>
        <p className="text-xs text-slate-500 tabular-nums">
          p50 {formatMinutes(data.p50Minutes)} · p95 {formatMinutes(data.p95Minutes)}
        </p>
        {data.breached > 0 ? (
          <p className="text-xs font-medium text-red-600 tabular-nums">
            {data.breached} fora do SLA
          </p>
        ) : null}
      </div>
    </div>
  );
}

export default memo(SlaGaugeInner);
