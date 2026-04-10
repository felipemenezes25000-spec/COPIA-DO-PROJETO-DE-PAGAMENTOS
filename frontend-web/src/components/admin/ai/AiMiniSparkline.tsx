import { useId, useMemo } from 'react';
import { cn } from '@/lib/utils';

export interface AiMiniSparklineProps {
  data: number[];
  trend?: 'up' | 'down' | 'stable';
  width?: number;
  height?: number;
  className?: string;
  fill?: boolean;
  strokeWidth?: number;
}

const TREND_COLORS: Record<
  NonNullable<AiMiniSparklineProps['trend']>,
  string
> = {
  up: '#10b981',
  down: '#ef4444',
  stable: '#94a3b8',
};

export const AiMiniSparkline = ({
  data,
  trend = 'stable',
  width = 96,
  height = 28,
  className,
  fill = true,
  strokeWidth = 1.5,
}: AiMiniSparklineProps) => {
  const gradientId = useId();

  const { linePath, areaPath } = useMemo(() => {
    if (data.length === 0) return { linePath: '', areaPath: '' };
    if (data.length === 1) {
      const y = height / 2;
      return {
        linePath: `M 0 ${y} L ${width} ${y}`,
        areaPath: `M 0 ${y} L ${width} ${y} L ${width} ${height} L 0 ${height} Z`,
      };
    }
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const stepX = width / (data.length - 1);
    const pad = strokeWidth;
    const usableH = height - pad * 2;

    const points = data.map((v, i) => {
      const x = i * stepX;
      const y = pad + (1 - (v - min) / range) * usableH;
      return [x, y] as const;
    });

    const line = points
      .map(
        ([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`
      )
      .join(' ');
    const area = `${line} L ${width} ${height} L 0 ${height} Z`;
    return { linePath: line, areaPath: area };
  }, [data, width, height, strokeWidth]);

  const color = TREND_COLORS[trend];

  if (!linePath) return null;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn('overflow-visible', className)}
      role="img"
      aria-label={`Sparkline tendência ${trend}`}
    >
      {fill && (
        <>
          <defs>
            <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <path d={areaPath} fill={`url(#${gradientId})`} />
        </>
      )}
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default AiMiniSparkline;
