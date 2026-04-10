import type { AIRecommendation } from '../../../types/admin';

/* ------------------------------------------------------------------ */
/* AI visual helpers — kept in a `.ts` (not `.tsx`) file so the        */
/* component files stay "components only" and fast-refresh works.     */
/* ------------------------------------------------------------------ */

export function scoreColor(score: number): string {
  if (score >= 80) return 'from-emerald-500 to-teal-500 text-emerald-700 bg-emerald-50 ring-emerald-200';
  if (score >= 60) return 'from-violet-500 to-purple-500 text-violet-700 bg-violet-50 ring-violet-200';
  if (score >= 40) return 'from-amber-500 to-orange-500 text-amber-700 bg-amber-50 ring-amber-200';
  return 'from-rose-500 to-red-500 text-rose-700 bg-rose-50 ring-rose-200';
}

export function recLabel(r: AIRecommendation): string {
  return r === 'aprovar' ? 'Aprovar'
    : r === 'entrevistar' ? 'Entrevistar'
    : r === 'analisar_mais' ? 'Analisar'
    : 'Rejeitar';
}

export function recTextColor(r: AIRecommendation): string {
  return r === 'aprovar' ? 'text-emerald-600'
    : r === 'entrevistar' ? 'text-violet-600'
    : r === 'analisar_mais' ? 'text-amber-600'
    : 'text-rose-600';
}
