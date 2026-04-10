import { Link } from 'react-router-dom';
import { ArrowLeft, Loader2, Briefcase, MapPin } from 'lucide-react';
import StatusBadge from '../StatusBadge';
import CandidateNavigation from './CandidateNavigation';
import type { AdminCandidate, CandidateStatus } from '../../../types/admin';
import { formatDate, CATEGORY_LABELS } from './shared';
import { getCandidateNeighbors } from '../../../lib/candidate-navigation';

export interface StatusOption {
  value: CandidateStatus;
  label: string;
  color: string;
}

interface CandidateHeaderProps {
  candidate: AdminCandidate;
  statusOptions: StatusOption[];
  statusLoading: boolean;
  pendingStatus: CandidateStatus | null;
  onStatusChange: (status: CandidateStatus) => void;
}

/**
 * Sticky header for the candidate detail page. Renders breadcrumb,
 * candidate identity summary, prev/next navigation, status badge and
 * the full status pill bar for quick transitions.
 *
 * Compared to the previous version, this header:
 *   - Shows candidate category + location inline so the recruiter has
 *     context without scrolling to the sidebar.
 *   - Renders `CandidateNavigation` (prev/next) next to the name, so
 *     the user can jump between candidates without returning to the
 *     list page.
 *   - Uses the same "--candidate-header-height" CSS variable so the
 *     sidebar can stick right below the header without overlap.
 */
export default function CandidateHeader({
  candidate,
  statusOptions,
  statusLoading,
  pendingStatus,
  onStatusChange,
}: CandidateHeaderProps) {
  const categoryLabel = CATEGORY_LABELS[candidate.categoria] ?? candidate.categoria ?? '—';
  const location =
    candidate.cidade && candidate.estado
      ? `${candidate.cidade}/${candidate.estado}`
      : candidate.estado || '';
  const neighbors = getCandidateNeighbors(candidate.id);

  return (
    <div
      className="sticky top-0 z-20 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 bg-white/85 backdrop-blur border-b border-slate-200"
      style={{ '--candidate-header-height': '148px' } as React.CSSProperties}
    >
      <div className="max-w-[1440px] mx-auto py-4 flex flex-col gap-3">
        {/* Row 1: breadcrumb + prev/next */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <Link
            to="/admin/candidatos"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-primary-600 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 rounded px-1"
            aria-label="Voltar para lista de candidatos"
          >
            <ArrowLeft size={13} aria-hidden="true" />
            Candidatos
          </Link>
          <CandidateNavigation
            prevId={neighbors.prevId}
            nextId={neighbors.nextId}
            position={neighbors.position}
            total={neighbors.total}
          />
        </div>

        {/* Row 2: name + identity summary + status */}
        <div className="flex items-start gap-3 flex-wrap">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl font-display font-bold text-slate-900 truncate leading-tight">
              {candidate.nome}
            </h1>
            <div className="mt-1 flex items-center gap-3 flex-wrap text-xs text-slate-500">
              <span className="inline-flex items-center gap-1">
                <Briefcase size={11} className="text-slate-400" aria-hidden="true" />
                <span className="font-semibold text-slate-700">{categoryLabel}</span>
                {candidate.especialidade && (
                  <>
                    <span className="text-slate-300 mx-0.5">·</span>
                    <span className="text-slate-500">{candidate.especialidade}</span>
                  </>
                )}
              </span>
              {location && (
                <span className="inline-flex items-center gap-1">
                  <MapPin size={11} className="text-slate-400" aria-hidden="true" />
                  {location}
                </span>
              )}
              <span className="text-slate-400">
                · Inscrito em{' '}
                <span className="font-semibold text-slate-600">
                  {formatDate(candidate.createdAt)}
                </span>
              </span>
            </div>
          </div>
          <StatusBadge status={candidate.status} />
        </div>

        {/* Row 3: status pill bar */}
        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-label="Alterar status do candidato"
        >
          {statusOptions
            // "Pendente" é o estado inicial do funil e não pode ser restaurado
            // depois que a triagem começa. Ocultamos o botão em vez de desabilitar
            // para não poluir a barra com um controle inerte.
            .filter(
              ({ value }) =>
                value !== 'pendente' || candidate.status === 'pendente',
            )
            .map(({ value, label, color }) => {
            const isActive = candidate.status === value;
            const isPending = pendingStatus === value && statusLoading;
            return (
              <button
                key={value}
                type="button"
                disabled={isActive || statusLoading}
                onClick={() => onStatusChange(value)}
                aria-label={`Alterar status para ${label} — candidato ${candidate.nome}`}
                aria-pressed={isActive}
                className={[
                  'inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all',
                  isActive
                    ? `${color} text-white cursor-default shadow-sm`
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed',
                ].join(' ')}
              >
                {isPending && <Loader2 size={12} className="animate-spin" aria-hidden="true" />}
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
