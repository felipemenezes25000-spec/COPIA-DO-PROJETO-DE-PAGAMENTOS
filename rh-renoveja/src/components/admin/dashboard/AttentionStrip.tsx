import { motion } from 'framer-motion';
import { AlertTriangle, Sparkles, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { AdminCandidate } from '../../../types/admin';
import { needsAttention } from '../shared/aging';

interface AttentionStripProps {
  candidates: AdminCandidate[];
}

/**
 * "Precisa da sua atenção" strip shown right below the dashboard header.
 *
 * Renders at most two cards, and only when there is actually something to
 * surface. A silent state is the correct state when the pipeline is healthy.
 *
 * Card 1: candidates pendentes há mais de 3 dias
 * Card 2: candidatos com score IA ≥ 80 ainda em pendente/em_analise
 */
export default function AttentionStrip({ candidates }: AttentionStripProps) {
  const stale = candidates.filter(needsAttention);

  // High-score candidates awaiting a decision are a priority too.
  const hotLeads = candidates.filter(
    (c) =>
      (c.status === 'pendente' || c.status === 'em_analise') &&
      c.aiAnalysis &&
      c.aiAnalysis.score >= 80,
  );

  // Nothing to surface → render nothing (silent healthy state).
  if (stale.length === 0 && hotLeads.length === 0) {
    return null;
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.05 }}
      role="region"
      aria-label="Itens que precisam da sua atenção"
      className="grid grid-cols-1 md:grid-cols-2 gap-4"
    >
      {stale.length > 0 && (
        <Link
          to="/admin/candidatos?status=pendente"
          className="group relative overflow-hidden rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-orange-50 p-5 shadow-card hover:shadow-elevated transition-all hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-amber-200/30 blur-2xl"
          />
          <div className="relative flex items-start gap-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-[0_8px_18px_-6px_rgba(251,146,60,0.5)] shrink-0">
              <AlertTriangle size={20} strokeWidth={2.5} aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-amber-700">
                Aguardando triagem
              </p>
              <p className="mt-0.5 text-lg font-display font-bold text-slate-900">
                {stale.length}{' '}
                {stale.length === 1 ? 'candidato parado' : 'candidatos parados'}
              </p>
              <p className="mt-1 text-sm text-slate-600 leading-snug">
                {stale.length === 1 ? 'Está' : 'Estão'} há mais de 3 dias sem avanço no funil.
              </p>
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-amber-700 group-hover:text-amber-800 transition-colors">
                Revisar agora
                <ArrowRight
                  size={12}
                  className="group-hover:translate-x-0.5 transition-transform"
                  aria-hidden="true"
                />
              </span>
            </div>
          </div>
        </Link>
      )}

      {hotLeads.length > 0 && (
        <Link
          to="/admin/candidatos"
          className="group relative overflow-hidden rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 p-5 shadow-card hover:shadow-elevated transition-all hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-violet-200/30 blur-2xl"
          />
          <div className="relative flex items-start gap-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-[0_8px_18px_-6px_rgba(139,92,246,0.5)] shrink-0">
              <Sparkles size={20} strokeWidth={2.5} aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-violet-700">
                Alta recomendação da IA
              </p>
              <p className="mt-0.5 text-lg font-display font-bold text-slate-900">
                {hotLeads.length}{' '}
                {hotLeads.length === 1 ? 'candidato com score ≥ 80' : 'candidatos com score ≥ 80'}
              </p>
              <p className="mt-1 text-sm text-slate-600 leading-snug">
                {hotLeads.length === 1 ? 'Aguarda' : 'Aguardam'} sua decisão — bons candidatos
                para entrevista.
              </p>
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-violet-700 group-hover:text-violet-800 transition-colors">
                Ver lista
                <ArrowRight
                  size={12}
                  className="group-hover:translate-x-0.5 transition-transform"
                  aria-hidden="true"
                />
              </span>
            </div>
          </div>
        </Link>
      )}
    </motion.section>
  );
}
