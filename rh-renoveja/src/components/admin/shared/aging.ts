import type { AdminCandidate, CandidateStatus } from '../../../types/admin';

/**
 * Aging helpers — compute how long a candidate has been waiting and
 * produce a visual tone so the UI can highlight stale cases.
 *
 * Business rules (agreed with RH on 2026-04-09):
 *   - Only PENDENTE and EM_ANALISE candidates "age". Once somebody is in
 *     entrevista/aprovado/rejeitado the clock stops making sense.
 *   - 0-1 days  → fresh (no tint)
 *   - 1-3 days  → warm (amber)
 *   - 3+ days   → stale (red)
 *
 * Computation is deliberately client-side to avoid a new API endpoint.
 * It uses `createdAt` for pendentes (so we measure time since inscription)
 * and `updatedAt` for em_analise (so we measure time since status change).
 */

export type AgingTone = 'fresh' | 'warm' | 'stale' | 'none';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Returns the number of whole days between `iso` and now. */
export function daysSince(iso: string | undefined | null): number {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return 0;
  return Math.floor((Date.now() - t) / MS_PER_DAY);
}

/**
 * Given a candidate, returns the "age" tone for UI purposes.
 * Only pendente and em_analise produce a non-`none` tone — everything
 * else is considered a terminal/near-terminal state where aging is moot.
 */
export function getAgingTone(candidate: {
  status: CandidateStatus;
  createdAt: string;
  updatedAt: string;
}): { tone: AgingTone; days: number } {
  // Terminal states never age.
  if (
    candidate.status === 'aprovado' ||
    candidate.status === 'rejeitado' ||
    candidate.status === 'entrevista'
  ) {
    return { tone: 'none', days: 0 };
  }

  // Pendente: time since inscription. Em análise: time since the status
  // change. Fall back to createdAt if updatedAt is missing/before it.
  const baseIso = candidate.status === 'em_analise' ? candidate.updatedAt || candidate.createdAt : candidate.createdAt;
  const days = daysSince(baseIso);

  if (days >= 3) return { tone: 'stale', days };
  if (days >= 1) return { tone: 'warm', days };
  return { tone: 'fresh', days };
}

/** Tailwind class for the aging dot color. */
export function agingDotClass(tone: AgingTone): string {
  return (
    {
      fresh: 'bg-emerald-400',
      warm: 'bg-amber-400',
      stale: 'bg-rose-500',
      none: 'bg-slate-300',
    } as const
  )[tone];
}

/** Human label for the aging tone — used in tooltips / aria-labels. */
export function agingLabel(tone: AgingTone, days: number): string {
  if (tone === 'none') return 'Em andamento';
  if (days === 0) return 'Chegou hoje';
  if (days === 1) return 'Há 1 dia aguardando';
  return `Há ${days} dias aguardando`;
}

/**
 * Convenience filter: candidates that need immediate attention.
 * Used by the dashboard AttentionStrip and the candidates list
 * QuickFilterChips. Criteria: pendente for more than 3 days.
 */
export function needsAttention(candidate: AdminCandidate): boolean {
  const { tone } = getAgingTone(candidate);
  return tone === 'stale';
}
