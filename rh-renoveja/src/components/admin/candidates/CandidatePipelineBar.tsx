import type { AdminCandidate, CandidateStatus } from '../../../types/admin';

interface CandidatePipelineBarProps {
  /** Full (pre-filter) candidate list — used for totals. */
  candidates: AdminCandidate[];
  /** Current active filter, used to highlight the matching segment. */
  activeStatus: CandidateStatus | '';
  /** Called when a segment is clicked. Pass '' to clear. */
  onStatusChange: (status: CandidateStatus | '') => void;
}

interface Segment {
  status: CandidateStatus;
  label: string;
  count: number;
  fromClass: string;
  toClass: string;
  ringActive: string;
  text: string;
}

/**
 * Compact, horizontal pipeline bar shown at the top of the candidates list.
 * Each segment shows the status label, the count, and a proportional share
 * of the total — click to filter. Click again to clear.
 *
 * Design intent: make "Onde estão meus candidatos?" visible at a glance
 * without needing to scroll to the charts on the dashboard.
 */
export default function CandidatePipelineBar({
  candidates,
  activeStatus,
  onStatusChange,
}: CandidatePipelineBarProps) {
  const total = candidates.length;
  const counts = {
    pendente: 0,
    em_analise: 0,
    entrevista: 0,
    aprovado: 0,
    rejeitado: 0,
  };
  for (const c of candidates) {
    counts[c.status]++;
  }

  const segments: Segment[] = [
    {
      status: 'pendente',
      label: 'Pendente',
      count: counts.pendente,
      fromClass: 'from-amber-400',
      toClass: 'to-orange-500',
      ringActive: 'ring-amber-300',
      text: 'text-amber-700',
    },
    {
      status: 'em_analise',
      label: 'Em análise',
      count: counts.em_analise,
      fromClass: 'from-sky-400',
      toClass: 'to-blue-500',
      ringActive: 'ring-sky-300',
      text: 'text-sky-700',
    },
    {
      status: 'entrevista',
      label: 'Entrevista',
      count: counts.entrevista,
      fromClass: 'from-violet-400',
      toClass: 'to-purple-500',
      ringActive: 'ring-violet-300',
      text: 'text-violet-700',
    },
    {
      status: 'aprovado',
      label: 'Aprovado',
      count: counts.aprovado,
      fromClass: 'from-emerald-400',
      toClass: 'to-teal-500',
      ringActive: 'ring-emerald-300',
      text: 'text-emerald-700',
    },
    {
      status: 'rejeitado',
      label: 'Rejeitado',
      count: counts.rejeitado,
      fromClass: 'from-rose-400',
      toClass: 'to-red-500',
      ringActive: 'ring-rose-300',
      text: 'text-rose-700',
    },
  ];

  return (
    <section
      role="region"
      aria-label="Pipeline de candidatos"
      className="bg-white rounded-2xl border border-slate-200 p-4 shadow-card"
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500 flex items-center gap-2">
          <span
            aria-hidden="true"
            className="inline-block w-1 h-3.5 rounded-full bg-gradient-to-b from-primary-400 to-primary-700"
          />
          Pipeline · {total} candidato{total === 1 ? '' : 's'}
        </h3>
        {activeStatus && (
          <button
            type="button"
            onClick={() => onStatusChange('')}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 px-2 py-1 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 transition-colors"
          >
            Ver todos
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {segments.map((seg) => {
          const isActive = activeStatus === seg.status;
          const pct = total > 0 ? (seg.count / total) * 100 : 0;
          return (
            <button
              key={seg.status}
              type="button"
              onClick={() => onStatusChange(isActive ? '' : seg.status)}
              aria-pressed={isActive}
              aria-label={`Filtrar por ${seg.label}: ${seg.count} candidato${seg.count === 1 ? '' : 's'}`}
              className={[
                'group relative text-left rounded-xl border bg-gradient-to-br from-white to-slate-50/40 p-3 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400',
                isActive
                  ? `border-transparent ring-2 ${seg.ringActive} shadow-md -translate-y-0.5`
                  : 'border-slate-200 hover:border-slate-300 hover:-translate-y-0.5 hover:shadow-sm',
              ].join(' ')}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span
                  className={`text-[10px] font-bold uppercase tracking-[0.12em] ${seg.text}`}
                >
                  {seg.label}
                </span>
                <span className="text-[10px] font-semibold text-slate-400 tabular-nums">
                  {total > 0 ? Math.round(pct) : 0}%
                </span>
              </div>
              <p className="text-2xl font-display font-bold text-slate-900 leading-none tabular-nums">
                {seg.count}
              </p>
              <div className="mt-2 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${seg.fromClass} ${seg.toClass} transition-all duration-500`}
                  style={{ width: `${Math.max(pct, 3)}%` }}
                />
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
