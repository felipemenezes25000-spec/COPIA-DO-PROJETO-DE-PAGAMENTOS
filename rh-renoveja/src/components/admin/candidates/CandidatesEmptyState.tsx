import { Users, SearchX, RefreshCw } from 'lucide-react';

interface CandidatesEmptyStateProps {
  hasFilters: boolean;
  onClearFilters: () => void;
  onReload: () => void;
}

/**
 * Two-in-one empty state:
 *   - hasFilters=true  → "no results" + clear filters CTA
 *   - hasFilters=false → "nothing registered yet" + reload CTA
 * Neither branch invents fake data — both are honest states.
 */
export default function CandidatesEmptyState({
  hasFilters,
  onClearFilters,
  onReload,
}: CandidatesEmptyStateProps) {
  if (hasFilters) {
    return (
      <div className="p-12 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 mb-3">
          <SearchX size={26} aria-hidden="true" />
        </div>
        <p className="text-slate-700 font-semibold">Nenhum candidato encontrado</p>
        <p className="text-sm text-slate-500 mt-1">
          Tente ajustar os filtros ou buscar por outro termo.
        </p>
        <button
          type="button"
          onClick={onClearFilters}
          className="mt-4 inline-flex items-center gap-1.5 text-primary-600 text-sm font-semibold hover:text-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 rounded px-2 py-1"
        >
          Limpar filtros
        </button>
      </div>
    );
  }

  return (
    <div className="p-12 text-center">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary-50 text-primary-500 mb-3">
        <Users size={26} aria-hidden="true" />
      </div>
      <p className="text-slate-700 font-semibold">Nenhum candidato cadastrado ainda</p>
      <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
        Assim que profissionais se inscreverem pelo aplicativo, eles aparecerão aqui.
      </p>
      <button
        type="button"
        onClick={onReload}
        className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
      >
        <RefreshCw size={14} aria-hidden="true" />
        Recarregar
      </button>
    </div>
  );
}
