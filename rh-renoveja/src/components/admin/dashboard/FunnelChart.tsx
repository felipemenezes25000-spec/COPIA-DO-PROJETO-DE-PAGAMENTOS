import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import type { AdminStats } from '../../../types/admin';

interface FunnelChartProps {
  stats: AdminStats;
}

interface FunnelStep {
  status: 'pendente' | 'em_analise' | 'entrevista' | 'aprovado';
  label: string;
  value: number;
  from: string;
  to: string;
  ring: string;
  border: string;
  text: string;
}

/**
 * Recruitment funnel visualization.
 *
 * Shows four pipeline stages (Pendente → Em análise → Entrevista → Aprovado)
 * with a proportional bar under each. Rejeitados is deliberately excluded —
 * the funnel is about throughput, not attrition. The rejection rate lives
 * on the ProgressRing on the right.
 *
 * Each step is a <Link> to the filtered candidates list, so clicking
 * "Em análise" jumps straight to that slice. Hover lifts the card and
 * brightens the bar, reinforcing the affordance.
 */
export default function FunnelChart({ stats }: FunnelChartProps) {
  const steps: FunnelStep[] = [
    {
      status: 'pendente',
      label: 'Pendente',
      value: stats.pendentes,
      from: 'from-amber-400',
      to: 'to-orange-500',
      ring: 'ring-amber-200',
      border: 'hover:border-amber-300',
      text: 'text-amber-700',
    },
    {
      status: 'em_analise',
      label: 'Em análise',
      value: stats.emAnalise,
      from: 'from-sky-400',
      to: 'to-blue-500',
      ring: 'ring-sky-200',
      border: 'hover:border-sky-300',
      text: 'text-sky-700',
    },
    {
      status: 'entrevista',
      label: 'Entrevista',
      value: stats.entrevista,
      from: 'from-violet-400',
      to: 'to-purple-500',
      ring: 'ring-violet-200',
      border: 'hover:border-violet-300',
      text: 'text-violet-700',
    },
    {
      status: 'aprovado',
      label: 'Aprovado',
      value: stats.aprovados,
      from: 'from-emerald-400',
      to: 'to-teal-500',
      ring: 'ring-emerald-200',
      border: 'hover:border-emerald-300',
      text: 'text-emerald-700',
    },
  ];

  // Use the largest step as the 100% reference so bars are comparable.
  const max = Math.max(...steps.map((s) => s.value), 1);

  return (
    <section
      role="region"
      aria-label="Funil de recrutamento"
      className="bg-white rounded-2xl border border-slate-200 p-6 shadow-card"
    >
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="font-display font-bold text-slate-900 text-base flex items-center gap-2">
            <span
              aria-hidden="true"
              className="inline-block w-1 h-5 rounded-full bg-gradient-to-b from-primary-400 to-primary-700"
            />
            Funil de recrutamento
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Pipeline de candidatos por etapa — clique para filtrar
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {steps.map((step, index) => {
          const pct = Math.round((step.value / max) * 100);
          // The funnel metaphor: each step's bar is narrower than the
          // previous to reinforce the "squeeze" feeling visually.
          const widthScale = 100 - index * 6;
          return (
            <Link
              key={step.status}
              to={`/admin/candidatos?status=${step.status}`}
              aria-label={`${step.value} candidatos em ${step.label} — clique para filtrar`}
              className={[
                'group relative block rounded-xl border border-slate-200 bg-gradient-to-br from-white to-slate-50/40 p-4 transition-all hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400',
                step.border,
              ].join(' ')}
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  className={`text-[10px] font-bold uppercase tracking-[0.12em] ${step.text}`}
                >
                  {step.label}
                </span>
                <span
                  aria-hidden="true"
                  className={`inline-flex items-center justify-center w-5 h-5 rounded-full bg-white ring-1 ${step.ring} text-[9px] font-bold ${step.text}`}
                >
                  {index + 1}
                </span>
              </div>
              <p className="text-3xl font-display font-bold text-slate-900 tabular-nums leading-none">
                {step.value}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                {pct}% do pico
              </p>
              {/* Funnel bar */}
              <div className="mt-3 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max(pct * (widthScale / 100), 3)}%` }}
                  transition={{ duration: 0.6, delay: 0.1 + index * 0.08 }}
                  className={`h-full rounded-full bg-gradient-to-r ${step.from} ${step.to}`}
                />
              </div>
            </Link>
          );
        })}
      </div>

      {/* Footer — contextual "conversão total" hint */}
      <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
        <span className="text-slate-500">
          Conversão:{' '}
          <span className="font-bold text-emerald-600 tabular-nums">
            {stats.total > 0 ? Math.round((stats.aprovados / stats.total) * 100) : 0}%
          </span>{' '}
          <span className="text-slate-400">pendente → aprovado</span>
        </span>
        <span className="text-slate-400">
          Total no funil:{' '}
          <span className="font-bold text-slate-700 tabular-nums">
            {stats.pendentes + stats.emAnalise + stats.entrevista + stats.aprovados}
          </span>
        </span>
      </div>
    </section>
  );
}
