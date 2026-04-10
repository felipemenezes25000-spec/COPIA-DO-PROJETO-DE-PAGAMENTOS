import { motion } from 'framer-motion';
import { X, CalendarCheck, UserCheck, XCircle, Loader2 } from 'lucide-react';
import type { CandidateStatus } from '../../../types/admin';

interface BulkActionsBarProps {
  /** Number of currently selected candidate IDs. */
  selectedCount: number;
  /** Called when a bulk status change is requested. */
  onBulkStatus: (status: CandidateStatus) => void;
  /** Called when the selection is cleared. */
  onClear: () => void;
  /** Which bulk operation is currently in flight (for button loading state). */
  pendingStatus: CandidateStatus | null;
}

/**
 * Slide-in action bar that appears at the top of the candidates table
 * when ≥1 candidate is selected. Offers fast path bulk status transitions.
 *
 * We deliberately don't expose "Pendente" as a target — once triage
 * starts a candidate should never be "reset" to pendente. That rule
 * matches the filter applied by CandidateHeader in the detail view.
 */
export default function BulkActionsBar({
  selectedCount,
  onBulkStatus,
  onClear,
  pendingStatus,
}: BulkActionsBarProps) {
  if (selectedCount === 0) return null;

  const busy = pendingStatus !== null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      role="region"
      aria-label={`Ações em lote — ${selectedCount} candidato${selectedCount === 1 ? '' : 's'} selecionado${selectedCount === 1 ? '' : 's'}`}
      aria-live="polite"
      className="sticky top-0 z-10 mb-3 overflow-hidden rounded-2xl border border-slate-900/10 bg-slate-900 text-white shadow-[0_18px_40px_-14px_rgba(15,23,42,0.4)]"
    >
      {/* Subtle gradient accent */}
      <div
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-primary-400 to-primary-700"
      />

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 px-5 py-3 pl-6">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary-500/20 text-primary-300 shrink-0">
            <span className="text-xs font-bold tabular-nums">{selectedCount}</span>
          </div>
          <span className="text-sm font-semibold truncate">
            {selectedCount === 1 ? 'candidato selecionado' : 'candidatos selecionados'}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
          <button
            type="button"
            disabled={busy}
            onClick={() => onBulkStatus('em_analise')}
            aria-label="Mover selecionados para Em análise"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500/90 hover:bg-sky-400 text-white text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
          >
            {pendingStatus === 'em_analise' ? (
              <Loader2 size={12} className="animate-spin" aria-hidden="true" />
            ) : (
              <CalendarCheck size={12} aria-hidden="true" />
            )}
            Em análise
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onBulkStatus('entrevista')}
            aria-label="Mover selecionados para Entrevista"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-500/90 hover:bg-violet-400 text-white text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
          >
            {pendingStatus === 'entrevista' ? (
              <Loader2 size={12} className="animate-spin" aria-hidden="true" />
            ) : (
              <UserCheck size={12} aria-hidden="true" />
            )}
            Entrevista
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onBulkStatus('rejeitado')}
            aria-label="Rejeitar selecionados"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/90 hover:bg-rose-400 text-white text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
          >
            {pendingStatus === 'rejeitado' ? (
              <Loader2 size={12} className="animate-spin" aria-hidden="true" />
            ) : (
              <XCircle size={12} aria-hidden="true" />
            )}
            Rejeitar
          </button>

          {/* Clear selection — separated from the bulk buttons */}
          <div className="w-px h-5 bg-white/20 mx-1" aria-hidden="true" />
          <button
            type="button"
            onClick={onClear}
            disabled={busy}
            aria-label="Limpar seleção"
            className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 text-xs font-medium transition-colors disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          >
            <X size={13} aria-hidden="true" />
            Limpar
          </button>
        </div>
      </div>
    </motion.div>
  );
}
