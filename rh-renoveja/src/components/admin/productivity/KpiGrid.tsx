import { memo } from 'react';
import type { LucideIcon } from 'lucide-react';

export interface KpiItem {
  label: string;
  value: string;
  sublabel?: string;
  icon: LucideIcon;
  tone?: 'default' | 'success' | 'warning' | 'danger';
}

interface KpiGridProps {
  items: KpiItem[];
}

const TONE_MAP: Record<NonNullable<KpiItem['tone']>, { bg: string; icon: string }> = {
  default: { bg: 'bg-slate-50', icon: 'text-slate-600' },
  success: { bg: 'bg-emerald-50', icon: 'text-emerald-600' },
  warning: { bg: 'bg-amber-50', icon: 'text-amber-600' },
  danger: { bg: 'bg-red-50', icon: 'text-red-600' },
};

/**
 * Grade responsiva de cards KPI. Memoizada porque o pai (página) re-renderiza
 * a cada 10s de polling, mas os valores raramente mudam — sem memo, cada
 * re-render iria recriar todos os KPIs.
 */
function KpiGridInner({ items }: KpiGridProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((item) => {
        const tone = TONE_MAP[item.tone ?? 'default'];
        const Icon = item.icon;
        return (
          <div
            key={item.label}
            className="flex items-start justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                {item.label}
              </p>
              <p className="mt-1 text-xl font-semibold text-slate-900 tabular-nums">
                {item.value}
              </p>
              {item.sublabel ? (
                <p className="mt-0.5 text-[11px] text-slate-500">{item.sublabel}</p>
              ) : null}
            </div>
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${tone.bg}`}>
              <Icon size={18} className={tone.icon} aria-hidden />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default memo(KpiGridInner);
