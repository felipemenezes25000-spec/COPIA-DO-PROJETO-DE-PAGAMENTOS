import { motion } from 'framer-motion';
import { CalendarDays, RefreshCw, Sparkles, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

interface DashboardHeaderProps {
  /** Admin display name — used for the welcome line. */
  adminName: string;
  /** Total candidates currently loaded. */
  total: number;
  /** Count of candidates analyzed by AI so we can nudge toward the list. */
  analyzedCount: number;
  /** Called when the refresh button is clicked. */
  onRefresh: () => void;
  /** Whether a refresh is currently in flight. */
  refreshing?: boolean;
}

/**
 * Rich dashboard header. Replaces the plain title+chip pair with a
 * welcome line, a date pill, action buttons and a CTA to the list.
 *
 * Design notes:
 * - The card uses a subtle gradient backdrop (primary-50 → white) to
 *   establish hierarchy without competing with the KPI row below.
 * - Buttons are icon-forward and aligned right on desktop; on mobile the
 *   whole header stacks vertically.
 * - Accessibility: the refresh button announces its loading state via
 *   `aria-busy` so screen readers hear it.
 */
export default function DashboardHeader({
  adminName,
  total,
  analyzedCount,
  onRefresh,
  refreshing = false,
}: DashboardHeaderProps) {
  const today = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  });

  // Capitalize the weekday so "quinta-feira, 09 de abril" reads nicer.
  const formattedDate = today.charAt(0).toUpperCase() + today.slice(1);

  const firstName = (adminName || 'admin').split(' ')[0];

  return (
    <motion.section
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      role="banner"
      aria-label="Cabeçalho do dashboard"
      className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-primary-50 via-white to-teal-50/40 shadow-card"
    >
      {/* Decorative pattern on the right — soft radial gradient. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary-200/20 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-8 top-8 h-16 w-16 rounded-2xl bg-gradient-to-br from-primary-400/30 to-primary-600/20 rotate-12 blur-sm"
      />

      <div className="relative px-6 py-5 md:px-8 md:py-7 flex flex-col md:flex-row md:items-center md:justify-between gap-5">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-600/80 flex items-center gap-1.5">
            <CalendarDays size={12} aria-hidden="true" />
            {formattedDate}
          </p>
          <h2 className="mt-1 text-2xl md:text-3xl font-display font-bold text-slate-900 tracking-tight">
            Olá, {firstName}{' '}
            <span className="inline-block" role="img" aria-label="aceno">
              👋
            </span>
          </h2>
          <p className="mt-1 text-sm text-slate-600 max-w-lg">
            Visão geral do recrutamento — dados ao vivo do portal do candidato.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 md:gap-3 shrink-0">
          {/* Total candidates chip */}
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/80 border border-slate-200 backdrop-blur-sm"
            aria-label={`${total} candidatos no sistema`}
          >
            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary-50 text-primary-600">
              <Users size={14} aria-hidden="true" />
            </div>
            <div className="text-right">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 leading-none">
                Total
              </p>
              <p className="text-sm font-bold text-slate-800 tabular-nums leading-tight">{total}</p>
            </div>
          </div>

          {/* Analyzed by AI chip (only if there's something to show) */}
          {analyzedCount > 0 && (
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/80 border border-violet-200 backdrop-blur-sm"
              aria-label={`${analyzedCount} candidatos analisados por IA`}
            >
              <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-violet-50 text-violet-600">
                <Sparkles size={14} aria-hidden="true" />
              </div>
              <div className="text-right">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-500 leading-none">
                  IA
                </p>
                <p className="text-sm font-bold text-slate-800 tabular-nums leading-tight">
                  {analyzedCount}
                </p>
              </div>
            </div>
          )}

          {/* Refresh action */}
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            aria-busy={refreshing}
            aria-label="Recarregar dados do dashboard"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 hover:text-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
          >
            <RefreshCw
              size={13}
              className={refreshing ? 'animate-spin' : ''}
              aria-hidden="true"
            />
            <span className="hidden sm:inline">Atualizar</span>
          </button>

          {/* Primary CTA: jump to the full list */}
          <Link
            to="/admin/candidatos"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 text-white text-xs font-semibold shadow-[0_6px_18px_-6px_rgba(14,165,233,0.5)] hover:shadow-[0_10px_24px_-8px_rgba(14,165,233,0.6)] hover:scale-[1.02] active:scale-[0.98] transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2"
          >
            Ver candidatos
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </motion.section>
  );
}
