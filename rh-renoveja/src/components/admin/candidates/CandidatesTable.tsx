import { Link } from 'react-router-dom';
import { Sparkles, MapPin, ChevronLeft, ChevronRight } from 'lucide-react';
import StatusBadge from '../StatusBadge';
import AIScoreCell from './AIScoreCell';
import Avatar from '../shared/Avatar';
import { agingDotClass, agingLabel, getAgingTone } from '../shared/aging';
import type { AdminCandidate, CandidateStatus } from '../../../types/admin';
import type { ProfessionalCategory } from '../../../types';

// Labels curtos para a coluna "Categoria" da tabela de candidatos.
// Usam parênteses "(a)" para indicar flexão de gênero sem comprometer o
// alinhamento da coluna. Mantido como Record<ProfessionalCategory, _>
// para o TS quebrar o build se faltar alguma categoria (exhaustiveness).
const CATEGORY_LABELS: Record<ProfessionalCategory, string> = {
  medico: 'Médico(a)',
  enfermeiro: 'Enfermeiro(a)',
  dentista: 'Dentista',
  psicologo: 'Psicólogo(a)',
  nutricionista: 'Nutricionista',
  fisioterapeuta: 'Fisioterapeuta',
  fonoaudiologo: 'Fonoaudiólogo(a)',
  terapeuta_ocupacional: 'Ter. Ocupacional',
  farmaceutico: 'Farmacêutico(a)',
  biomedico: 'Biomédico(a)',
  educador_fisico: 'Ed. Físico',
  assistente_social: 'Assist. Social',
};

/**
 * Left-border color accent per status. Rendered as a 3px strip on the left
 * edge of every row so the user can scan the list vertically and spot
 * "how many of each" without reading the status pill. Uses the same
 * semantic palette as StatusBadge for consistency.
 */
const STATUS_BORDER: Record<CandidateStatus, string> = {
  pendente: 'before:bg-amber-400',
  em_analise: 'before:bg-sky-400',
  entrevista: 'before:bg-violet-400',
  aprovado: 'before:bg-emerald-400',
  rejeitado: 'before:bg-rose-400',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

interface CandidatesTableProps {
  rows: AdminCandidate[];
  /** Total of the pre-paginated list — drives the pagination footer text */
  totalVisible: number;
  page: number;
  pageSize: number;
  totalPages: number;
  onPageChange: (p: number) => void;
  /** When nobody has an AI analysis, we hide the score column completely
   *  instead of rendering "sem análise" dashes on every row. */
  showAIScoreColumn: boolean;

  /** Selection state — drives the checkbox column and the select-all header. */
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  /** Toggle select-all for the CURRENT page only. */
  onToggleSelectPage: (select: boolean) => void;
}

export default function CandidatesTable({
  rows,
  totalVisible,
  page,
  pageSize,
  totalPages,
  onPageChange,
  showAIScoreColumn,
  selectedIds,
  onToggleSelect,
  onToggleSelectPage,
}: CandidatesTableProps) {
  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1);

  const pageIds = rows.map((r) => r.id);
  const allOnPageSelected =
    pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));
  const someOnPageSelected =
    !allOnPageSelected && pageIds.some((id) => selectedIds.has(id));

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <caption className="sr-only">
            Lista de candidatos com seleção, avatar, nome, categoria, especialidade, local, score de IA, status e data de inscrição.
          </caption>
          <thead>
            <tr className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-slate-50/40">
              <th scope="col" className="w-10 pl-6 pr-1 py-3">
                <label className="inline-flex items-center cursor-pointer">
                  <span className="sr-only">Selecionar todos desta página</span>
                  <input
                    type="checkbox"
                    checked={allOnPageSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someOnPageSelected;
                    }}
                    onChange={(e) => onToggleSelectPage(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-2 focus:ring-primary-400 focus:ring-offset-0 cursor-pointer"
                  />
                </label>
              </th>
              <th
                scope="col"
                className="text-left pl-2 pr-6 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-[0.12em]"
              >
                Candidato
              </th>
              <th
                scope="col"
                className="text-left px-6 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-[0.12em] hidden md:table-cell"
              >
                Categoria · Especialidade
              </th>
              <th
                scope="col"
                className="text-left px-6 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-[0.12em] hidden xl:table-cell"
              >
                Local
              </th>
              {showAIScoreColumn && (
                <th
                  scope="col"
                  className="text-left px-6 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-[0.12em] hidden md:table-cell"
                >
                  <span className="inline-flex items-center gap-1 text-violet-600">
                    <Sparkles size={10} aria-hidden="true" /> Score IA
                  </span>
                </th>
              )}
              <th
                scope="col"
                className="text-left px-6 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-[0.12em]"
              >
                Status
              </th>
              <th
                scope="col"
                className="text-left px-6 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-[0.12em] hidden sm:table-cell"
              >
                Inscrição
              </th>
              <th scope="col" className="px-6 py-3">
                <span className="sr-only">Ações</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {rows.map((c) => {
              const isSelected = selectedIds.has(c.id);
              const aging = getAgingTone(c);
              const agingDescription = agingLabel(aging.tone, aging.days);
              return (
                <tr
                  key={c.id}
                  data-selected={isSelected}
                  className={[
                    'relative transition-colors group',
                    'before:absolute before:left-0 before:top-0 before:h-full before:w-[3px]',
                    STATUS_BORDER[c.status],
                    isSelected
                      ? 'bg-primary-50/60 hover:bg-primary-50/80'
                      : 'hover:bg-slate-50/60',
                  ].join(' ')}
                >
                  <td className="w-10 pl-6 pr-1 py-3.5">
                    <label className="inline-flex items-center cursor-pointer">
                      <span className="sr-only">Selecionar {c.nome}</span>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggleSelect(c.id)}
                        className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-2 focus:ring-primary-400 focus:ring-offset-0 cursor-pointer"
                      />
                    </label>
                  </td>
                  <td className="pl-2 pr-6 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="relative shrink-0">
                        <Avatar name={c.nome} size={40} />
                        {aging.tone === 'stale' || aging.tone === 'warm' ? (
                          <span
                            title={agingDescription}
                            aria-label={agingDescription}
                            className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ring-2 ring-white ${agingDotClass(aging.tone)} ${aging.tone === 'stale' ? 'animate-pulse' : ''}`}
                          />
                        ) : null}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800 truncate">{c.nome}</p>
                        <p className="text-[11px] text-slate-400 truncate">{c.email}</p>
                        {aging.tone === 'stale' && (
                          <p className="text-[10px] font-semibold text-rose-600 mt-0.5 md:hidden">
                            {agingDescription}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-3.5 hidden md:table-cell text-slate-600">
                    <p className="font-medium text-slate-700 truncate max-w-[220px]">
                      {CATEGORY_LABELS[c.categoria]}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate max-w-[220px]">
                      {c.especialidade || '—'}
                    </p>
                  </td>
                  <td className="px-6 py-3.5 hidden xl:table-cell text-slate-500">
                    <span className="inline-flex items-center gap-1 text-xs">
                      <MapPin size={11} className="text-slate-300" aria-hidden="true" />
                      {c.cidade}/{c.estado}
                    </span>
                  </td>
                  {showAIScoreColumn && (
                    <td className="px-6 py-3.5 hidden md:table-cell">
                      {c.aiAnalysis ? (
                        <AIScoreCell score={c.aiAnalysis.score} rec={c.aiAnalysis.recomendacao} />
                      ) : (
                        <span className="text-xs text-slate-300" aria-label="Sem análise de IA">—</span>
                      )}
                    </td>
                  )}
                  <td className="px-6 py-3.5">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="px-6 py-3.5 hidden sm:table-cell text-slate-500 text-xs">
                    {formatDate(c.createdAt)}
                  </td>
                  <td className="px-6 py-3.5 text-right">
                    <Link
                      to={`/admin/candidatos/${c.id}`}
                      aria-label={`Ver detalhes de ${c.nome}`}
                      className="inline-flex items-center gap-0.5 text-primary-600 group-hover:text-primary-700 text-xs font-bold hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 rounded px-1.5 py-0.5 transition-colors"
                    >
                      Detalhes
                      <ChevronRight
                        size={12}
                        aria-hidden="true"
                        className="group-hover:translate-x-0.5 transition-transform"
                      />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <nav
          className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/30"
          aria-label="Paginação dos candidatos"
        >
          <p className="text-xs text-slate-500">
            Mostrando{' '}
            <span className="font-bold text-slate-700 tabular-nums">
              {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalVisible)}
            </span>{' '}
            de <span className="font-bold text-slate-700 tabular-nums">{totalVisible}</span>
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={page === 1}
              onClick={() => onPageChange(page - 1)}
              aria-label="Página anterior"
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 text-slate-600 hover:bg-white hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 transition-colors"
            >
              <ChevronLeft size={12} aria-hidden="true" />
              <span className="hidden sm:inline">Anterior</span>
            </button>
            {pageNumbers.map((p, idx, arr) => (
              <span key={p} className="inline-flex items-center">
                {idx > 0 && arr[idx - 1] !== p - 1 && (
                  <span className="px-1 text-slate-400" aria-hidden="true">...</span>
                )}
                <button
                  type="button"
                  onClick={() => onPageChange(p)}
                  aria-label={`Página ${p}`}
                  aria-current={p === page ? 'page' : undefined}
                  className={[
                    'w-8 h-8 text-xs font-bold rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 transition-colors',
                    p === page
                      ? 'bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-white',
                  ].join(' ')}
                >
                  {p}
                </button>
              </span>
            ))}
            <button
              type="button"
              disabled={page === totalPages}
              onClick={() => onPageChange(page + 1)}
              aria-label="Próxima página"
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 text-slate-600 hover:bg-white hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 transition-colors"
            >
              <span className="hidden sm:inline">Próximo</span>
              <ChevronRight size={12} aria-hidden="true" />
            </button>
          </div>
        </nav>
      )}
    </>
  );
}
