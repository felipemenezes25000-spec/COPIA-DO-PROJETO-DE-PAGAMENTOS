interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  segments: DonutSegment[];
  size?: number;
  ariaLabel?: string;
}

/**
 * Accessible donut chart built with a single SVG. Segments with zero value
 * render as gaps so the user immediately spots categories with no data.
 */
export default function DonutChart({ segments, size = 140, ariaLabel }: DonutChartProps) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  const r = (size - 20) / 2;
  const circumference = 2 * Math.PI * r;
  let offset = 0;

  const describedBy = segments
    .filter((s) => s.value > 0)
    .map((s) => `${s.label}: ${s.value}`)
    .join(', ');

  return (
    <div className="flex items-center gap-6">
      <svg
        width={size}
        height={size}
        className="shrink-0 -rotate-90"
        role="img"
        aria-label={ariaLabel ?? `Distribuição: ${describedBy || 'sem dados'}`}
      >
        {total === 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="#E2E8F0"
            strokeWidth={16}
          />
        )}
        {segments.map((seg, i) => {
          if (seg.value === 0) return null;
          const pctVal = total > 0 ? seg.value / total : 0;
          const dashLen = circumference * pctVal;
          const dashOffset = circumference * offset;
          offset += pctVal;
          return (
            <circle
              key={`${seg.label}-${i}`}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={seg.color}
              strokeWidth={16}
              strokeDasharray={`${dashLen} ${circumference - dashLen}`}
              strokeDashoffset={-dashOffset}
              strokeLinecap="round"
              className="transition-all duration-700"
            />
          );
        })}
        <text
          x={size / 2}
          y={size / 2}
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-slate-800 text-2xl font-bold rotate-90"
          style={{ transformOrigin: `${size / 2}px ${size / 2}px` }}
        >
          {total}
        </text>
      </svg>
      <ul className="space-y-2 min-w-0">
        {segments.map((seg) => (
          <li key={seg.label} className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: seg.color }}
              aria-hidden="true"
            />
            <span className="text-xs text-slate-600 truncate">{seg.label}</span>
            <span className="text-xs font-bold text-slate-800 ml-auto tabular-nums">
              {seg.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
