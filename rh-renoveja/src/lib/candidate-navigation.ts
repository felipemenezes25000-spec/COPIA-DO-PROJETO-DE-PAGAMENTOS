/**
 * In-memory cache of the ordered candidate ID list the admin is currently
 * browsing. Populated by the candidates list page whenever its `visible`
 * array changes; read by the detail page to render prev/next arrows.
 *
 * Why not a hook, a context, or React Router state?
 *
 * - A *context* would force every route that cares about navigation to
 *   mount the provider, and the list+detail pages already share the
 *   outer `AdminLayout` — but passing data through outlet context is
 *   clumsy when the list is also a route, not a layout.
 * - *Router state* (via `navigate('/admin/candidatos/x', { state })`) only
 *   works when the user navigates *from the list*. Deep links (refresh,
 *   open-in-new-tab, bookmark) would lose the context entirely.
 * - A tiny module-level cache is the simplest thing that works for the
 *   current-session common case. If the cache is empty (deep link), the
 *   detail page silently hides the prev/next arrows — no broken state.
 *
 * The cache is intentionally NOT persisted to storage: it's ephemeral
 * metadata about "what the admin is currently looking at", and stale
 * data across sessions would be worse than no data.
 */

let currentOrder: string[] = [];

export function setCandidateOrder(ids: string[]): void {
  currentOrder = [...ids];
}

export function getCandidateOrder(): string[] {
  return currentOrder;
}

export interface Neighbors {
  prevId: string | null;
  nextId: string | null;
  position: number | null; // 1-based index of the current candidate, null if not in the cached order
  total: number; // total length of the cached order
}

/**
 * Returns the immediate neighbors of `id` within the current cached order.
 * If the id isn't in the cache at all (deep link, stale cache), returns
 * nulls everywhere so the caller can hide the prev/next UI gracefully.
 */
export function getCandidateNeighbors(id: string): Neighbors {
  const idx = currentOrder.indexOf(id);
  if (idx === -1) {
    return { prevId: null, nextId: null, position: null, total: currentOrder.length };
  }
  return {
    prevId: idx > 0 ? currentOrder[idx - 1] : null,
    nextId: idx < currentOrder.length - 1 ? currentOrder[idx + 1] : null,
    position: idx + 1,
    total: currentOrder.length,
  };
}

export function clearCandidateOrder(): void {
  currentOrder = [];
}
