interface ProgressRingProps {
  value: number;
  label: string;
  color: string;
  hint?: string;
}

/**
 * Circular progress gauge (0-100). Use `hint` to add a `title` tooltip
 * explaining how the value is computed (e.g. "sobre candidatos decididos").
 */
export default function ProgressRing({ value, label, color, hint }: ProgressRingProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const r = 36;
  const circumference = 2 * Math.PI * r;
  const filled = (clamped / 100) * circumference;

  return (
    <div
      className="flex flex-col items-center gap-2"
      title={hint}
      role="img"
      aria-label={`${label}: ${clamped}%`}
    >
      <svg width={88} height={88} className="-rotate-90" aria-hidden="true">
        <circle cx={44} cy={44} r={r} fill="none" stroke="#F1F5F9" strokeWidth={8} />
        <circle
          cx={44}
          cy={44}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={8}
          strokeDasharray={`${filled} ${circumference - filled}`}
          strokeLinecap="round"
          className="transition-all duration-700"
        />
        <text
          x={44}
          y={44}
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-slate-800 text-lg font-bold rotate-90"
          style={{ transformOrigin: '44px 44px' }}
        >
          {clamped}%
        </text>
      </svg>
      <span className="text-xs font-medium text-slate-500 text-center">{label}</span>
    </div>
  );
}
