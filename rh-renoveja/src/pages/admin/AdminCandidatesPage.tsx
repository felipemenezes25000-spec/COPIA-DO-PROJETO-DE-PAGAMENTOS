import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import {
  fetchCandidates, fetchAllAIAnalyses, saveCandidateAIAnalysis,
  updateCandidateStatus, RateLimitError,
} from '../../lib/admin-api';
import { analyzeCandidate, isAIAvailable } from '../../lib/openai';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import { useToast } from '../../components/ui/Toast';
import BatchAIPanel from '../../components/admin/candidates/BatchAIPanel';
import CandidatesFilterBar, {
  type SortMode,
} from '../../components/admin/candidates/CandidatesFilterBar';
import CandidatesTable from '../../components/admin/candidates/CandidatesTable';
import CandidatesSkeleton from '../../components/admin/candidates/CandidatesSkeleton';
import CandidatesEmptyState from '../../components/admin/candidates/CandidatesEmptyState';
import CandidatePipelineBar from '../../components/admin/candidates/CandidatePipelineBar';
import QuickFilterChips, {
  type QuickFilterKey,
} from '../../components/admin/candidates/QuickFilterChips';
import BulkActionsBar from '../../components/admin/candidates/BulkActionsBar';
import type { AdminCandidate, CandidateStatus, AIRecommendation } from '../../types/admin';
import type { ProfessionalCategory } from '../../types';
import { needsAttention, daysSince } from '../../components/admin/shared/aging';
import { setCandidateOrder } from '../../lib/candidate-navigation';

const PAGE_SIZE = 10;

export default function AdminCandidatesPage() {
  const { token } = useAdminAuth();
  const { toast } = useToast();
  const [candidates, setCandidates] = useState<AdminCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<CandidateStatus | ''>('');
  const [categoryFilter, setCategoryFilter] = useState<ProfessionalCategory | ''>('');
  const [recFilter, setRecFilter] = useState<AIRecommendation | 'nao_analisado' | ''>('');
  const [sortMode, setSortMode] = useState<SortMode>('recent');
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [quickFilter, setQuickFilter] = useState<QuickFilterKey>(null);

  // Bulk selection state — set of candidate IDs currently checked.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkPendingStatus, setBulkPendingStatus] = useState<CandidateStatus | null>(null);

  // Batch analysis state. `cancelledRef` is intentionally a ref (not state)
  // so the running loop can read the latest value synchronously — a state
  // update would not be visible inside the in-flight for-loop.
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ done: 0, total: 0, current: '' });
  const cancelledRef = useRef(false);

  // Fire the "scores only appear after individual analysis" hint once per
  // session when the bulk AI endpoint silently returns nothing — it is a
  // known backend gap (the bulk endpoint is best-effort and may not exist
  // in every environment). A ref guard keeps us from spamming on refetch.
  const aiHintShownRef = useRef(false);

  const loadCandidates = useCallback(
    async (signal: { cancelled: boolean }) => {
      if (!token) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const result = await fetchCandidates(
          {
            status: statusFilter || undefined,
            categoria: categoryFilter || undefined,
            search: search || undefined,
          },
          token,
        );
        if (signal.cancelled) return;

        // Hydrate AI analyses in a single bulk request so every row in the
        // list has up-to-date scores without needing to open each candidate.
        // Best-effort: on failure (or missing endpoint) we still show the
        // list, just without scores.
        const aiMap = await fetchAllAIAnalyses(token);
        if (signal.cancelled) return;
        const hydrated = aiMap.size > 0
          ? result.map((c) => {
              const a = aiMap.get(c.id);
              return a ? { ...c, aiAnalysis: a } : c;
            })
          : result;

        setCandidates(hydrated);
        setPage(1);

        // One-shot informational toast when the bulk endpoint returned
        // nothing yet every candidate is clearly un-analyzed. We only
        // surface it when there IS data to analyze (otherwise it would
        // shout at an empty list) and when AI is actually configured.
        if (
          !aiHintShownRef.current
          && aiMap.size === 0
          && hydrated.length > 0
          && isAIAvailable()
        ) {
          aiHintShownRef.current = true;
          toast('info', 'Os scores de IA aparecem após a análise individual de cada candidato.');
        }
      } catch (err) {
        if (signal.cancelled) return;
        if (err instanceof RateLimitError) {
          setError('Muitas requisições. Aguarde alguns segundos e tente novamente.');
          toast('error', 'Muitas requisições. Aguarde alguns segundos.');
        } else {
          setError('Falha ao carregar candidatos. Tente novamente.');
        }
        console.error('AdminCandidatesPage load failed', err);
      } finally {
        if (!signal.cancelled) setLoading(false);
      }
    },
    [search, statusFilter, categoryFilter, token, toast],
  );

  useEffect(() => {
    const signal = { cancelled: false };
    const timer = setTimeout(() => loadCandidates(signal), 300);
    return () => {
      signal.cancelled = true;
      clearTimeout(timer);
    };
  }, [loadCandidates]);

  // Any filter change invalidates the selection — checkboxes no longer
  // point to visible rows in an intuitive way, and the user almost
  // certainly re-framed their scope.
  useEffect(() => {
    setSelectedIds(new Set());
  }, [search, statusFilter, categoryFilter, recFilter, quickFilter, sortMode]);

  // Derived list — apply client-side AI filter + quick filter + sort
  const visible = useMemo(() => {
    let list = candidates;

    // AI recommendation filter (from the advanced filter bar)
    if (recFilter === 'nao_analisado') {
      list = list.filter((c) => !c.aiAnalysis);
    } else if (recFilter) {
      list = list.filter((c) => c.aiAnalysis?.recomendacao === recFilter);
    }

    // Quick filter chips — mutually exclusive with each other, but stack
    // on top of the other filters above. Each branch is a narrowing filter.
    if (quickFilter === 'stale') {
      list = list.filter(needsAttention);
    } else if (quickFilter === 'high_score') {
      list = list.filter(
        (c) =>
          (c.status === 'pendente' || c.status === 'em_analise') &&
          c.aiAnalysis != null &&
          c.aiAnalysis.score >= 80,
      );
    } else if (quickFilter === 'unanalyzed') {
      list = list.filter((c) => !c.aiAnalysis);
    } else if (quickFilter === 'recent') {
      list = list.filter((c) => daysSince(c.createdAt) <= 7);
    }

    // Sorting — only score-based sorts are offered; default is "recent"
    // which preserves the backend-provided order.
    if (sortMode === 'score_desc') {
      list = [...list].sort((a, b) => (b.aiAnalysis?.score ?? -1) - (a.aiAnalysis?.score ?? -1));
    } else if (sortMode === 'score_asc') {
      list = [...list].sort((a, b) => {
        const sa = a.aiAnalysis?.score ?? Number.POSITIVE_INFINITY;
        const sb = b.aiAnalysis?.score ?? Number.POSITIVE_INFINITY;
        return sa - sb;
      });
    }
    return list;
  }, [candidates, recFilter, quickFilter, sortMode]);

  // Populate the module-level cache used by the detail page for
  // prev/next navigation. This runs on every `visible` change, so the
  // detail page always sees the latest order the admin was looking at.
  useEffect(() => {
    setCandidateOrder(visible.map((c) => c.id));
  }, [visible]);

  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const paginated = visible.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const hasFilters = Boolean(statusFilter || categoryFilter || search || recFilter || quickFilter);
  const unanalyzedCount = candidates.filter((c) => !c.aiAnalysis).length;
  const analyzedCount = candidates.length - unanalyzedCount;
  // Hide the Score IA column entirely when nobody has a score — the "—"
  // placeholder on every row is noise that makes the table look broken.
  const showAIScoreColumn = analyzedCount > 0;

  // Pre-computed counts for the QuickFilterChips (so each chip always
  // shows a number even when the chip itself is not currently active).
  const quickFilterCounts = useMemo(() => {
    const stale = candidates.filter(needsAttention).length;
    const highScore = candidates.filter(
      (c) =>
        (c.status === 'pendente' || c.status === 'em_analise') &&
        c.aiAnalysis != null &&
        c.aiAnalysis.score >= 80,
    ).length;
    const unanalyzed = candidates.filter((c) => !c.aiAnalysis).length;
    const recent = candidates.filter((c) => daysSince(c.createdAt) <= 7).length;
    return { stale, highScore, unanalyzed, recent };
  }, [candidates]);

  const clearFilters = useCallback(() => {
    setSearch('');
    setStatusFilter('');
    setCategoryFilter('');
    setRecFilter('');
    setQuickFilter(null);
  }, []);

  const toggleScoreSort = useCallback(() => {
    setSortMode((prev) =>
      prev === 'score_desc' ? 'score_asc' :
      prev === 'score_asc' ? 'recent' :
      'score_desc',
    );
  }, []);

  /* -------------------------------------------------------------- */
  /* Bulk selection                                                   */
  /* -------------------------------------------------------------- */

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectPage = useCallback(
    (select: boolean) => {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const c of paginated) {
          if (select) next.add(c.id);
          else next.delete(c.id);
        }
        return next;
      });
    },
    [paginated],
  );

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  /* -------------------------------------------------------------- */
  /* Bulk status update                                               */
  /*                                                                   */
  /* Loops `updateCandidateStatus` sequentially (backend has no bulk  */
  /* endpoint). Success and failure counts are toasted at the end so  */
  /* the admin gets a clean summary instead of a spam of per-row      */
  /* toasts. RateLimitError short-circuits the whole loop.            */
  /* -------------------------------------------------------------- */
  async function runBulkStatusUpdate(status: CandidateStatus) {
    if (selectedIds.size === 0 || bulkPendingStatus !== null) return;
    const targetIds = Array.from(selectedIds);
    setBulkPendingStatus(status);

    let ok = 0;
    let fail = 0;
    let rateLimited = false;

    for (const id of targetIds) {
      try {
        const updated = await updateCandidateStatus(id, status, token);
        // Patch the row in place so the table reflects the new status
        // without a full refetch.
        setCandidates((prev) => prev.map((x) => (x.id === id ? { ...x, ...updated } : x)));
        ok++;
      } catch (err) {
        if (err instanceof RateLimitError) {
          rateLimited = true;
          break;
        }
        console.error('Bulk status update failed for', id, err);
        fail++;
      }
    }

    setBulkPendingStatus(null);
    setSelectedIds(new Set());

    const label =
      status === 'em_analise' ? 'Em análise' :
      status === 'entrevista' ? 'Entrevista' :
      status === 'aprovado' ? 'Aprovado' :
      status === 'rejeitado' ? 'Rejeitado' :
      'Pendente';

    if (rateLimited) {
      toast(
        'error',
        `Rate limit atingido. ${ok} atualizado${ok !== 1 ? 's' : ''} antes da interrupção.`,
      );
    } else if (fail === 0) {
      toast(
        'success',
        `${ok} candidato${ok !== 1 ? 's' : ''} movido${ok !== 1 ? 's' : ''} para "${label}".`,
      );
    } else {
      toast(
        'error',
        `${ok} atualizado${ok !== 1 ? 's' : ''}, ${fail} falha${fail !== 1 ? 's' : ''}.`,
      );
    }
  }

  /* -------------------------------------------------------------- */
  /* Batch AI analysis                                                */
  /*                                                                   */
  /* Hardened against three failure modes:                             */
  /*   1. Stale cancellation — uses a ref so `cancel` takes effect on  */
  /*      the very next iteration (state updates are not visible to    */
  /*      the in-flight loop).                                         */
  /*   2. Rate limits — on the first RateLimitError we stop the whole  */
  /*      run, toast a clear message, and leave already-analyzed rows  */
  /*      in place. No silent hammering of the backend.                */
  /*   3. Backend/provider throttling — inserts a 250ms pacing delay   */
  /*      between calls, so even a healthy run is friendly to OpenAI   */
  /*      per-minute limits.                                           */
  /* -------------------------------------------------------------- */
  async function runBatchAnalysis() {
    const targets = candidates.filter((c) => !c.aiAnalysis);
    if (targets.length === 0) {
      toast('success', 'Todos os candidatos já estão analisados.');
      return;
    }
    cancelledRef.current = false;
    setBatchRunning(true);
    setBatchProgress({ done: 0, total: targets.length, current: targets[0].nome });

    const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
    const BATCH_DELAY_MS = 250;

    let ok = 0;
    let fail = 0;
    let rateLimited = false;

    for (let i = 0; i < targets.length; i++) {
      if (cancelledRef.current) break;
      const c = targets[i];
      setBatchProgress({ done: i, total: targets.length, current: c.nome });
      try {
        const result = await analyzeCandidate({
          nome: c.nome,
          categoria: c.categoria,
          especialidade: c.especialidade,
          anosExperiencia: c.anosExperiencia ?? 'mais_10',
          expTelemedicina: c.expTelemedicina,
          sobre: c.sobre,
          graduacao: c.graduacao,
          universidade: c.universidade,
          anoConclusao: c.anoConclusao,
          posGraduacao: c.posGraduacao,
          residencia: c.residencia,
        }, token);
        const saved = await saveCandidateAIAnalysis(c.id, result, token);
        // Patch in place so the table reflects new scores without a full reload
        setCandidates((prev) =>
          prev.map((x) => (x.id === c.id ? { ...x, aiAnalysis: saved } : x)),
        );
        ok++;
      } catch (err) {
        if (err instanceof RateLimitError) {
          // Backend is rate-limiting us — stop the whole run immediately.
          rateLimited = true;
          break;
        }
        console.error('Batch analyze failed for', c.nome, err);
        fail++;
      }

      // Pacing delay between calls (skip after the last one).
      if (i < targets.length - 1 && !cancelledRef.current) {
        await sleep(BATCH_DELAY_MS);
      }
    }

    setBatchProgress({ done: targets.length, total: targets.length, current: '' });
    setBatchRunning(false);

    if (rateLimited) {
      toast(
        'error',
        `Rate limit atingido. ${ok} analisado${ok !== 1 ? 's' : ''} antes da interrupção — tente novamente em instantes.`,
      );
    } else if (cancelledRef.current) {
      toast('success', `Análise cancelada. ${ok} processado${ok !== 1 ? 's' : ''}.`);
    } else if (fail === 0) {
      toast('success', `${ok} candidato${ok !== 1 ? 's' : ''} analisado${ok !== 1 ? 's' : ''} com sucesso.`);
    } else {
      toast('error', `${ok} analisado${ok !== 1 ? 's' : ''}, ${fail} falha${fail !== 1 ? 's' : ''}.`);
    }
  }

  const aiAvailable = isAIAvailable();

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      {/* ---------- Header ---------- */}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-600/80">
            Portal RH · Recrutamento
          </p>
          <h2 className="mt-1 text-2xl md:text-3xl font-display font-bold text-slate-900 tracking-tight">
            Candidatos
          </h2>
          <p className="text-sm text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
            <span>
              {candidates.length} candidato{candidates.length !== 1 ? 's' : ''} cadastrado
              {candidates.length !== 1 ? 's' : ''}
            </span>
            {aiAvailable && analyzedCount > 0 && (
              <>
                <span className="w-1 h-1 rounded-full bg-slate-300" aria-hidden="true" />
                <span className="inline-flex items-center gap-1 text-violet-600 font-medium">
                  <Sparkles size={12} aria-hidden="true" />
                  {analyzedCount} analisado{analyzedCount !== 1 ? 's' : ''} por IA
                </span>
              </>
            )}
          </p>
        </div>

        {aiAvailable && candidates.length > 0 && (
          <BatchAIPanel
            unanalyzed={unanalyzedCount}
            running={batchRunning}
            progress={batchProgress}
            onRun={runBatchAnalysis}
            onCancel={() => { cancelledRef.current = true; }}
          />
        )}
      </div>

      {/* ---------- Pipeline bar ---------- */}
      {!loading && !error && candidates.length > 0 && (
        <CandidatePipelineBar
          candidates={candidates}
          activeStatus={statusFilter}
          onStatusChange={setStatusFilter}
        />
      )}

      {/* ---------- Quick filter chips ---------- */}
      {!loading && !error && candidates.length > 0 && (
        <QuickFilterChips
          active={quickFilter}
          onChange={setQuickFilter}
          staleCount={quickFilterCounts.stale}
          highScoreCount={quickFilterCounts.highScore}
          unanalyzedCount={quickFilterCounts.unanalyzed}
          recentCount={quickFilterCounts.recent}
          aiAvailable={aiAvailable}
        />
      )}

      {/* ---------- Search + Filter bar ---------- */}
      <CandidatesFilterBar
        search={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        categoryFilter={categoryFilter}
        onCategoryChange={setCategoryFilter}
        recFilter={recFilter}
        onRecChange={setRecFilter}
        sortMode={sortMode}
        onToggleSort={toggleScoreSort}
        showFilters={showFilters}
        onToggleFilters={() => setShowFilters((v) => !v)}
        aiAvailable={aiAvailable}
        hasFilters={hasFilters}
        onClearFilters={clearFilters}
      />

      {/* ---------- Bulk actions bar ---------- */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <BulkActionsBar
            selectedCount={selectedIds.size}
            onBulkStatus={runBulkStatusUpdate}
            onClear={clearSelection}
            pendingStatus={bulkPendingStatus}
          />
        )}
      </AnimatePresence>

      {/* ---------- Table ---------- */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-card">
        {error ? (
          <div className="p-12 text-center" role="alert">
            <p className="text-slate-700 font-medium mb-3">{error}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2"
            >
              Recarregar
            </button>
          </div>
        ) : loading ? (
          <CandidatesSkeleton />
        ) : visible.length === 0 ? (
          <CandidatesEmptyState
            hasFilters={hasFilters}
            onClearFilters={clearFilters}
            onReload={() => window.location.reload()}
          />
        ) : (
          <CandidatesTable
            rows={paginated}
            totalVisible={visible.length}
            page={page}
            pageSize={PAGE_SIZE}
            totalPages={totalPages}
            onPageChange={setPage}
            showAIScoreColumn={showAIScoreColumn}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            onToggleSelectPage={toggleSelectPage}
          />
        )}
      </div>
    </motion.div>
  );
}
