import { memo } from 'react';
import type { FunnelDto } from '../../../types/productivity';
import { formatInt } from '../../../lib/productivity-utils';

interface FunnelChartProps {
  funnel: FunnelDto;
}

interface Step {
  label: string;
  value: number;
  tone: string;
}

/**
 * Funil de conversão vertical. Cada barra é proporcional ao primeiro passo
 * (criados) e mostra a taxa de conversão entre passos consecutivos.
 * SVG puro — evita deps.
 */
function FunnelChartInner({ funnel }: FunnelChartProps) {
  const steps: Step[] = [
    { label: 'Criados', value: funnel.created, tone: 'bg-slate-400' },
    { label: 'Atribuídos a médico', value: funnel.assigned, tone: 'bg-sky-500' },
    { label: 'Revisados', value: funnel.reviewed, tone: 'bg-indigo-500' },
    { label: 'Aprovados p/ assinar', value: funnel.approved, tone: 'bg-violet-500' },
    { label: 'Assinados', value: funnel.signed, tone: 'bg-emerald-500' },
    { label: 'Entregues', value: funnel.delivered, tone: 'bg-emerald-600' },
  ];

  const max = Math.max(1, ...steps.map((s) => s.value));

  return (
    <div className="space-y-2">
      {steps.map((step, i) => {
        const widthPct = max > 0 ? (step.value / max) * 100 : 0;
        const prev = i > 0 ? steps[i - 1].value : null;
        const conversion = prev && prev > 0 ? (step.value / prev) * 100 : null;
        return (
          <div key={step.label}>
            <div className="mb-1 flex items-baseline justify-between text-xs text-slate-600">
              <span className="font-medium">{step.label}</span>
              <span className="tabular-nums">
                <strong className="text-slate-900">{formatInt(step.value)}</strong>
                {conversion !== null ? (
                  <span className="ml-2 text-slate-400">
                    ({conversion.toFixed(0)}% do anterior)
                  </span>
                ) : null}
              </span>
            </div>
            <div className="h-6 w-full overflow-hidden rounded-md bg-slate-100">
              <div
                className={`h-full ${step.tone} transition-[width] duration-500`}
                style={{ width: `${widthPct}%` }}
              />
            </div>
          </div>
        );
      })}

      {funnel.rejected > 0 || funnel.cancelled > 0 ? (
        <div className="mt-3 flex gap-3 border-t border-slate-200 pt-3 text-xs text-slate-600">
          {funnel.rejected > 0 ? (
            <span>
              ❌ Rejeitados: <strong>{formatInt(funnel.rejected)}</strong>
            </span>
          ) : null}
          {funnel.cancelled > 0 ? (
            <span>
              🚫 Cancelados: <strong>{formatInt(funnel.cancelled)}</strong>
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default memo(FunnelChartInner);
