interface BarChartItem {
  label: string;
  value: number;
}

interface BarChartProps {
  data: BarChartItem[];
  color?: string;
  maxBarHeight?: number;
  emptyLabel?: string;
}

/**
 * Simple vertical bar chart built with divs. Expects normalized items
 * ({ label, value }) so caller doesn't need to pass keys around.
 */
export default function BarChart({
  data,
  color = 'bg-primary-500',
  maxBarHeight = 120,
  emptyLabel = 'Sem dados suficientes',
}: BarChartProps) {
  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-xs text-slate-400"
        style={{ height: maxBarHeight + 32 }}
      >
        {emptyLabel}
      </div>
    );
  }

  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div
      className="flex items-end gap-2 justify-between"
      style={{ height: maxBarHeight + 32 }}
      role="img"
      aria-label={data.map((d) => `${d.label}: ${d.value}`).join(', ')}
    >
      {data.map((item, i) => {
        const h = max > 0 ? (item.value / max) * maxBarHeight : 0;
        return (
          <div key={`${item.label}-${i}`} className="flex flex-col items-center gap-1 flex-1 min-w-0">
            <span className="text-xs font-semibold text-slate-700 tabular-nums">{item.value}</span>
            <div
              className={`w-full max-w-[40px] rounded-t-lg ${color} transition-all duration-500`}
              style={{ height: Math.max(h, 4) }}
            />
            <span className="text-[10px] text-slate-500 truncate w-full text-center">
              {item.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
