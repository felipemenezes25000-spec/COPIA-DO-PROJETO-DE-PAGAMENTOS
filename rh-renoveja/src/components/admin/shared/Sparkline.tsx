import { memo } from 'react';

interface SparklineProps {
  data: number[];
  /** CSS color for the stroke. Default: primary-500. */
  color?: string;
  /** Fill under the line. Default: color at 15% alpha. */
  fillColor?: string;
  width?: number;
  height?: number;
  /** Hide the line completely when data is empty or flat-zero. */
  hideOnEmpty?: boolean;
  ariaLabel?: string;
}

/**
 * Small inline SVG sparkline. Used inside KPI cards and identity summaries
 * to give a quick sense of trend without a full chart.
 *
 * - Smooths jitter slightly with a small catmull-rom-ish approximation
 *   (just a rounded stroke + generous control points).
 * - Normalizes Y to [0..1] across the data range.
 * - Draws a gradient fill under the line for extra polish.
 */
function SparklineImpl({
  data,
  color = '#0EA5E9',
  fillColor,
  width = 96,
  height = 28,
  hideOnEmpty = true,
  ariaLabel,
}: SparklineProps) {
  if (!data.length || (hideOnEmpty && data.every((v) => v === 0))) {
    return <span className="block" style={{ width, height }} aria-hidden="true" />;
  }

  const n = data.length;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  // Leave a 2px padding on top and bottom so the stroke doesn't clip.
  const padY = 2;
  const innerH = height - padY * 2;

  const stepX = n > 1 ? width / (n - 1) : width;

  const points = data.map((v, i) => {
    const x = i * stepX;
    const y = padY + innerH - ((v - min) / range) * innerH;
    return [x, y] as const;
  });

  const path = points
    .map(([x, y], i) => (i === 0 ? `M${x.toFixed(1)},${y.toFixed(1)}` : `L${x.toFixed(1)},${y.toFixed(1)}`))
    .join(' ');

  const fillPath = `${path} L${(n - 1) * stepX},${height} L0,${height} Z`;
  const gradientId = `sparkline-grad-${color.replace(/[^a-zA-Z0-9]/g, '')}`;

  // Last-point highlight — a little dot at the right edge.
  const last = points[points.length - 1];

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={ariaLabel ?? 'Sparkline de tendência'}
      className="overflow-visible"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={fillColor ?? color} stopOpacity={0.25} />
          <stop offset="100%" stopColor={fillColor ?? color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={fillPath} fill={`url(#${gradientId})`} />
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={last[0]} cy={last[1]} r={2} fill={color} />
    </svg>
  );
}

const Sparkline = memo(SparklineImpl);
export default Sparkline;
