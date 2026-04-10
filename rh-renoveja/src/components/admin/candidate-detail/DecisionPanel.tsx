import { useState, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle,
  XCircle,
  UserCheck,
  CalendarCheck,
  Loader2,
  ChevronDown,
} from 'lucide-react';
import type { CandidateStatus, AdminCandidate } from '../../../types/admin';

interface DecisionPanelProps {
  candidate: AdminCandidate;
  statusLoading: boolean;
  pendingStatus: CandidateStatus | null;
  onStatusChange: (status: CandidateStatus, reason?: string) => Promise<void> | void;
}

interface DecisionAction {
  status: Exclude<CandidateStatus, 'pendente'>;
  label: string;
  icon: typeof CheckCircle;
  activeGradient: string;
  activeShadow: string;
  inactiveText: string;
  inactiveBorder: string;
  requireReason?: boolean;
}

/**
 * "Fast path" decision panel shown in the candidate detail sidebar.
 *
 * Each action is a one-click button that transitions the candidate to
 * the target status. Rejection expands an inline `reason` textarea
 * because the backend endpoint accepts (and internally persists) a
 * rejection reason — we want to make sure recruiters don't reject
 * with an empty motive.
 *
 * The panel is deliberately separate from the sticky header's pill bar
 * because:
 *   - The header bar is for *any* status transition (including
 *     re-triaging em_analise ↔ entrevista).
 *   - This panel is about the terminal decision moment — it promotes
 *     "aprovar" and "rejeitar" visually, both with larger CTAs and
 *     warmer language.
 */
export default function DecisionPanel({
  candidate,
  statusLoading,
  pendingStatus,
  onStatusChange,
}: DecisionPanelProps) {
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const actions: DecisionAction[] = [
    {
      status: 'em_analise',
      label: 'Em análise',
      icon: CalendarCheck,
      activeGradient: 'from-sky-500 to-blue-600',
      activeShadow: 'shadow-[0_10px_28px_-10px_rgba(14,165,233,0.5)]',
      inactiveText: 'text-sky-700',
      inactiveBorder: 'border-sky-200 hover:border-sky-300 hover:bg-sky-50',
    },
    {
      status: 'entrevista',
      label: 'Entrevista',
      icon: UserCheck,
      activeGradient: 'from-violet-500 to-purple-600',
      activeShadow: 'shadow-[0_10px_28px_-10px_rgba(139,92,246,0.5)]',
      inactiveText: 'text-violet-700',
      inactiveBorder: 'border-violet-200 hover:border-violet-300 hover:bg-violet-50',
    },
    {
      status: 'aprovado',
      label: 'Aprovar',
      icon: CheckCircle,
      activeGradient: 'from-emerald-500 to-teal-600',
      activeShadow: 'shadow-[0_10px_28px_-10px_rgba(16,185,129,0.5)]',
      inactiveText: 'text-emerald-700',
      inactiveBorder: 'border-emerald-200 hover:border-emerald-300 hover:bg-emerald-50',
    },
    {
      status: 'rejeitado',
      label: 'Rejeitar',
      icon: XCircle,
      activeGradient: 'from-rose-500 to-red-600',
      activeShadow: 'shadow-[0_10px_28px_-10px_rgba(244,63,94,0.5)]',
      inactiveText: 'text-rose-700',
      inactiveBorder: 'border-rose-200 hover:border-rose-300 hover:bg-rose-50',
      requireReason: true,
    },
  ];

  async function handleClick(action: DecisionAction) {
    if (action.requireReason) {
      if (!rejectOpen) {
        setRejectOpen(true);
        return;
      }
      // The reason form handles its own submit via the onSubmit below.
      return;
    }
    await onStatusChange(action.status);
  }

  async function handleRejectSubmit(e: FormEvent) {
    e.preventDefault();
    await onStatusChange('rejeitado', rejectReason.trim() || undefined);
    setRejectReason('');
    setRejectOpen(false);
  }

  return (
    <section
      className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card"
      aria-labelledby="decision-panel-heading"
    >
      <h4
        id="decision-panel-heading"
        className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500 mb-1 flex items-center gap-2"
      >
        <span
          aria-hidden="true"
          className="inline-block w-1 h-3.5 rounded-full bg-gradient-to-b from-amber-400 to-orange-600"
        />
        Tomar decisão
      </h4>
      <p className="text-[11px] text-slate-400 mb-3">
        Status atual:{' '}
        <span className="font-semibold text-slate-600 capitalize">
          {candidate.status.replace('_', ' ')}
        </span>
      </p>

      <div className="grid grid-cols-2 gap-2">
        {actions.map((action) => {
          const Icon = action.icon;
          const isCurrent = candidate.status === action.status;
          const isPending = pendingStatus === action.status && statusLoading;
          return (
            <button
              key={action.status}
              type="button"
              disabled={isCurrent || statusLoading}
              onClick={() => handleClick(action)}
              aria-label={`Mover candidato para ${action.label}`}
              aria-pressed={isCurrent}
              className={[
                'relative flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400',
                isCurrent
                  ? `bg-gradient-to-br ${action.activeGradient} text-white ${action.activeShadow} cursor-default`
                  : `bg-white border ${action.inactiveBorder} ${action.inactiveText} hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0`,
              ].join(' ')}
            >
              {isPending ? (
                <Loader2 size={12} className="animate-spin" aria-hidden="true" />
              ) : (
                <Icon size={12} aria-hidden="true" />
              )}
              {action.label}
              {isCurrent && (
                <span
                  className="absolute -top-1 -right-1 flex h-2.5 w-2.5"
                  aria-label="Status atual"
                >
                  <span className="absolute inline-flex h-full w-full rounded-full bg-white/80 opacity-75 animate-ping" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Rejection reason form — slides in when the user arms "Rejeitar" */}
      <AnimatePresence>
        {rejectOpen && candidate.status !== 'rejeitado' && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            onSubmit={handleRejectSubmit}
            className="overflow-hidden"
            aria-label="Confirmar rejeição"
          >
            <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-rose-600 flex items-center gap-1.5">
                <ChevronDown size={11} aria-hidden="true" />
                Motivo da rejeição (opcional)
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Ex: Não atende ao perfil de experiência mínima exigido."
                rows={3}
                maxLength={500}
                className="input-field text-xs resize-none"
                disabled={statusLoading}
              />
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={statusLoading}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-gradient-to-br from-rose-500 to-red-600 text-white text-xs font-bold hover:shadow-[0_8px_20px_-6px_rgba(244,63,94,0.5)] transition-all disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
                >
                  {statusLoading && pendingStatus === 'rejeitado' ? (
                    <Loader2 size={12} className="animate-spin" aria-hidden="true" />
                  ) : (
                    <XCircle size={12} aria-hidden="true" />
                  )}
                  Confirmar rejeição
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRejectOpen(false);
                    setRejectReason('');
                  }}
                  disabled={statusLoading}
                  className="px-3 py-2 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </section>
  );
}
