interface HorizontalBarItem {
  label: string;
  value: number;
}

interface HorizontalBarProps {
  data: HorizontalBarItem[];
  color?: string;
  emptyLabel?: string;
}

/**
 * Horizontal bar list with label + count + filled track.
 * Normalized API: caller supplies `{ label, value }[]`.
 */
export default function HorizontalBar({
  data,
  color = 'bg-primary-500',
  emptyLabel = 'Sem dados suficientes',
}: HorizontalBarProps) {
  if (data.length === 0) {
    return (
      <p className="text-xs text-slate-400 py-6 text-center">{emptyLabel}</p>
    );
  }

  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <ul className="space-y-3">
      {data.map((item, i) => {
        const width = max > 0 ? (item.value / max) * 100 : 0;
        return (
          <li key={`${item.label}-${i}`}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-slate-700 truncate">{item.label}</span>
              <span className="text-sm font-semibold text-slate-800 ml-2 tabular-nums">
                {item.value}
              </span>
            </div>
            <div
              className="h-2.5 bg-slate-100 rounded-full overflow-hidden"
              role="progressbar"
              aria-valuenow={item.value}
              aria-valuemin={0}
              aria-valuemax={max}
              aria-label={item.label}
            >
              <div
                className={`h-full rounded-full ${color} transition-all duration-700`}
                style={{ width: `${Math.max(width, 2)}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
