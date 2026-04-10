import { UserCircle2, Sparkles, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { AdminCandidate } from '../../../types/admin';
import ActivityTimeline from './ActivityTimeline';
import { recLabel, recTextColor, scoreColor } from '../candidates/ai-style';

interface TabVisaoGeralProps {
  candidate: AdminCandidate;
}

/**
 * "Visão geral" tab. In the new 2-column layout, the big identity KPIs
 * live in `CandidateIdentitySidebar` (left column), so this tab focuses
 * on narrative content: sobre, AI summary and the activity timeline.
 *
 * On mobile / below `lg:` breakpoint the sidebar is rendered ABOVE this
 * tab, so the content still sits directly under the identity info.
 */
export default function TabVisaoGeral({ candidate }: TabVisaoGeralProps) {
  const hasAbout = Boolean(candidate.sobre && candidate.sobre.trim());
  const ai = candidate.aiAnalysis;

  let scoreGradient = '';
  if (ai) {
    scoreGradient = scoreColor(ai.score).split(' ').slice(0, 2).join(' ');
  }

  return (
    <div className="space-y-5">
      {/* AI quick summary — if available */}
      {ai && (
        <section
          className="bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 rounded-2xl border border-violet-200/80 p-5 shadow-card overflow-hidden relative"
          aria-labelledby="overview-ai-heading"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-violet-200/30 blur-2xl"
          />
          <div className="relative flex items-start gap-4">
            <div
              className={`flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br ${scoreGradient} text-white shadow-[0_10px_24px_-8px_rgba(139,92,246,0.5)] shrink-0`}
            >
              <span className="text-lg font-display font-bold tabular-nums">{ai.score}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3
                  id="overview-ai-heading"
                  className="text-sm font-bold text-slate-900 flex items-center gap-1.5"
                >
                  <Sparkles size={14} className="text-violet-500" aria-hidden="true" />
                  Resumo da IA
                </h3>
                <span className={`text-xs font-bold ${recTextColor(ai.recomendacao)}`}>
                  · {recLabel(ai.recomendacao)}
                </span>
              </div>
              <p className="text-sm text-slate-700 mt-1.5 leading-relaxed">{ai.resumo}</p>
              <Link
                to="#"
                onClick={(e) => {
                  e.preventDefault();
                  const tabBtn = document.getElementById('tab-ia');
                  if (tabBtn) (tabBtn as HTMLButtonElement).click();
                }}
                className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-violet-700 hover:text-violet-900 transition-colors"
              >
                Ver análise completa
                <ExternalLink size={11} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* About the candidate */}
      {hasAbout && (
        <section
          className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card"
          aria-labelledby="overview-about-heading"
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary-50">
              <UserCircle2 size={15} className="text-primary-600" aria-hidden="true" />
            </div>
            <h3
              id="overview-about-heading"
              className="font-display font-bold text-slate-900 text-base"
            >
              Sobre o candidato
            </h3>
          </div>
          <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">
            {candidate.sobre}
          </p>
        </section>
      )}

      {/* Activity timeline — always rendered, even if only inscription exists */}
      <ActivityTimeline candidate={candidate} />
    </div>
  );
}
