import { memo, useMemo } from 'react';
import type { HeatmapCell } from '../../../types/productivity';

interface HeatmapProps {
  cells: HeatmapCell[];
}

const DAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

/**
 * Heatmap 7×24 de atividade do médico. Cada célula representa (dia, hora) e
 * a intensidade da cor reflete a contagem de ações relativas ao máximo do
 * período. Evita bibliotecas — renderização é SVG/CSS puro.
 */
function HeatmapInner({ cells }: HeatmapProps) {
  const { grid, max } = useMemo(() => {
    const g: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
    let m = 0;
    for (const c of cells) {
      if (c.dayOfWeek >= 0 && c.dayOfWeek < 7 && c.hour >= 0 && c.hour < 24) {
        g[c.dayOfWeek][c.hour] = c.count;
        if (c.count > m) m = c.count;
      }
    }
    return { grid: g, max: m };
  }, [cells]);

  if (max === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-slate-200 text-sm text-slate-500">
        Sem atividade registrada no período.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="border-collapse text-[10px] text-slate-600">
        <thead>
          <tr>
            <th className="w-10" />
            {HOURS.map((h) => (
              <th
                key={h}
                scope="col"
                className="px-0.5 pb-1 text-center font-normal tabular-nums"
              >
                {h % 3 === 0 ? h : ''}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {grid.map((row, dow) => (
            <tr key={dow}>
              <th scope="row" className="pr-2 text-right font-medium">
                {DAY_LABELS[dow]}
              </th>
              {row.map((value, hour) => {
                const ratio = max > 0 ? value / max : 0;
                const opacity = value === 0 ? 0 : 0.15 + ratio * 0.85;
                return (
                  <td
                    key={hour}
                    title={`${DAY_LABELS[dow]} ${hour}:00 — ${value} ações`}
                    className="h-6 w-6 border border-slate-100 p-0"
                    style={{
                      backgroundColor: value === 0 ? '#f8fafc' : `rgba(16, 185, 129, ${opacity})`,
                    }}
                  />
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default memo(HeatmapInner);
