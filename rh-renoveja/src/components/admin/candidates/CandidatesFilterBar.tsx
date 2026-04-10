import { AnimatePresence, motion } from 'framer-motion';
import {
  Search, Filter, X, ArrowUpDown, ArrowDown, ArrowUp,
} from 'lucide-react';
import type { AIRecommendation, CandidateStatus } from '../../../types/admin';
import type { ProfessionalCategory } from '../../../types';

export type SortMode = 'recent' | 'score_desc' | 'score_asc';

const STATUS_OPTIONS: { value: CandidateStatus; label: string }[] = [
  { value: 'pendente', label: 'Pendente' },
  { value: 'em_analise', label: 'Em análise' },
  { value: 'entrevista', label: 'Entrevista' },
  { value: 'aprovado', label: 'Aprovado' },
  { value: 'rejeitado', label: 'Rejeitado' },
];

const CATEGORY_OPTIONS: { value: ProfessionalCategory; label: string }[] = [
  { value: 'medico', label: 'Médico(a)' },
  { value: 'enfermeiro', label: 'Enfermeiro(a)' },
  { value: 'dentista', label: 'Dentista' },
  { value: 'psicologo', label: 'Psicólogo(a)' },
  { value: 'nutricionista', label: 'Nutricionista' },
  { value: 'fisioterapeuta', label: 'Fisioterapeuta' },
  { value: 'fonoaudiologo', label: 'Fonoaudiólogo(a)' },
  { value: 'terapeuta_ocupacional', label: 'Terapeuta Ocupacional' },
  { value: 'farmaceutico', label: 'Farmacêutico(a)' },
  { value: 'biomedico', label: 'Biomédico(a)' },
  { value: 'educador_fisico', label: 'Educador Físico' },
  { value: 'assistente_social', label: 'Assistente Social' },
];

const RECOMMENDATION_OPTIONS: { value: AIRecommendation | 'nao_analisado'; label: string }[] = [
  { value: 'aprovar', label: '✓ Aprovar' },
  { value: 'entrevistar', label: '✦ Entrevistar' },
  { value: 'analisar_mais', label: '◐ Analisar mais' },
  { value: 'rejeitar', label: '✗ Rejeitar' },
  { value: 'nao_analisado', label: '○ Sem análise' },
];

interface CandidatesFilterBarProps {
  search: string;
  onSearchChange: (v: string) => void;

  statusFilter: CandidateStatus | '';
  onStatusChange: (v: CandidateStatus | '') => void;

  categoryFilter: ProfessionalCategory | '';
  onCategoryChange: (v: ProfessionalCategory | '') => void;

  recFilter: AIRecommendation | 'nao_analisado' | '';
  onRecChange: (v: AIRecommendation | 'nao_analisado' | '') => void;

  sortMode: SortMode;
  onToggleSort: () => void;

  showFilters: boolean;
  onToggleFilters: () => void;

  aiAvailable: boolean;
  hasFilters: boolean;
  onClearFilters: () => void;
}

export default function CandidatesFilterBar({
  search,
  onSearchChange,
  statusFilter,
  onStatusChange,
  categoryFilter,
  onCategoryChange,
  recFilter,
  onRecChange,
  sortMode,
  onToggleSort,
  showFilters,
  onToggleFilters,
  aiAvailable,
  hasFilters,
  onClearFilters,
}: CandidatesFilterBarProps) {
  const activeFilterCount = [statusFilter, categoryFilter, recFilter].filter(Boolean).length;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-card">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <label htmlFor="candidates-search" className="sr-only">
            Buscar candidatos
          </label>
          <Search
            size={18}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <input
            id="candidates-search"
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar por nome, e-mail, CPF ou protocolo..."
            className="input-field pl-11"
          />
        </div>

        <button
          type="button"
          onClick={onToggleSort}
          title="Ordenar por score de IA"
          aria-label={
            sortMode === 'score_desc' ? 'Ordenação atual: maior score primeiro. Clicar alterna para menor score primeiro.'
              : sortMode === 'score_asc' ? 'Ordenação atual: menor score primeiro. Clicar alterna para mais recentes primeiro.'
              : 'Ordenação atual: mais recentes primeiro. Clicar alterna para maior score primeiro.'
          }
          className={[
            'btn-secondary text-sm px-4 py-2.5 shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400',
            sortMode !== 'recent' ? 'bg-violet-50 border-violet-200 text-violet-700' : '',
          ].join(' ')}
        >
          {sortMode === 'score_desc' ? <ArrowDown size={14} aria-hidden="true" />
            : sortMode === 'score_asc' ? <ArrowUp size={14} aria-hidden="true" />
            : <ArrowUpDown size={14} aria-hidden="true" />}
          <span className="hidden md:inline">
            {sortMode === 'score_desc' ? 'Score ↓'
              : sortMode === 'score_asc' ? 'Score ↑'
              : 'Ordenar'}
          </span>
        </button>

        <button
          type="button"
          onClick={onToggleFilters}
          aria-expanded={showFilters}
          aria-controls="candidates-filters-panel"
          aria-label={`${showFilters ? 'Fechar' : 'Abrir'} painel de filtros${activeFilterCount > 0 ? ` (${activeFilterCount} ativo${activeFilterCount !== 1 ? 's' : ''})` : ''}`}
          className={[
            'btn-secondary text-sm px-4 py-2.5 shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400',
            showFilters ? 'bg-slate-100' : '',
          ].join(' ')}
        >
          <Filter size={16} aria-hidden="true" />
          Filtros
          {hasFilters && (
            <span className="ml-1 inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary-100 text-primary-700 text-xs font-bold">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      <AnimatePresence>
        {showFilters && (
          <motion.div
            id="candidates-filters-panel"
            role="region"
            aria-label="Filtros avançados de candidatos"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="flex flex-col sm:flex-row flex-wrap gap-3 mt-3 pt-3 border-t border-slate-100">
              <label className="sr-only" htmlFor="filter-status">Status</label>
              <select
                id="filter-status"
                value={statusFilter}
                onChange={(e) => onStatusChange(e.target.value as CandidateStatus | '')}
                className="input-field text-sm"
              >
                <option value="">Todos os status</option>
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>

              <label className="sr-only" htmlFor="filter-category">Categoria profissional</label>
              <select
                id="filter-category"
                value={categoryFilter}
                onChange={(e) => onCategoryChange(e.target.value as ProfessionalCategory | '')}
                className="input-field text-sm"
              >
                <option value="">Todas as categorias</option>
                {CATEGORY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>

              {aiAvailable && (
                <>
                  <label className="sr-only" htmlFor="filter-rec">Recomendação da IA</label>
                  <select
                    id="filter-rec"
                    value={recFilter}
                    onChange={(e) => onRecChange(e.target.value as AIRecommendation | 'nao_analisado' | '')}
                    className="input-field text-sm"
                  >
                    <option value="">Qualquer recomendação IA</option>
                    {RECOMMENDATION_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </>
              )}

              {hasFilters && (
                <button
                  type="button"
                  onClick={onClearFilters}
                  className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 px-3 py-2 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                >
                  <X size={14} aria-hidden="true" /> Limpar filtros
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
