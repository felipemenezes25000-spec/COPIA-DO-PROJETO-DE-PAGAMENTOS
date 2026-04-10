/**
 * KanbanColumn — Coluna do Kanban de Candidatos.
 * Drag & drop HTML5 nativo.
 */
import { useState, type DragEvent, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

import type { Candidato, CandidatoEtapa, Vaga } from '@/types/rh';
import { CandidatoCard } from './CandidatoCard';

export interface EtapaMeta {
  key: CandidatoEtapa;
  label: string;
  color: string; // tailwind classes do header
  accent: string; // cor de drop zone
  dot: string;
}

// eslint-disable-next-line react-refresh/only-export-components
export const ETAPAS: EtapaMeta[] = [
  {
    key: 'triagem',
    label: 'Triagem',
    color:
      'bg-slate-100 dark:bg-slate-900/40 text-slate-700 dark:text-slate-200',
    accent: 'ring-slate-400/70',
    dot: 'bg-slate-400',
  },
  {
    key: 'entrevista_rh',
    label: 'Entrevista RH',
    color: 'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-200',
    accent: 'ring-sky-400/70',
    dot: 'bg-sky-400',
  },
  {
    key: 'entrevista_tecnica',
    label: 'Entrevista Técnica',
    color:
      'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-200',
    accent: 'ring-indigo-400/70',
    dot: 'bg-indigo-400',
  },
  {
    key: 'proposta',
    label: 'Proposta',
    color:
      'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200',
    accent: 'ring-amber-400/70',
    dot: 'bg-amber-400',
  },
  {
    key: 'contratado',
    label: 'Contratado',
    color:
      'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-200',
    accent: 'ring-emerald-400/70',
    dot: 'bg-emerald-500',
  },
  {
    key: 'rejeitado',
    label: 'Rejeitado',
    color: 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-200',
    accent: 'ring-rose-400/70',
    dot: 'bg-rose-400',
  },
];

export interface KanbanColumnProps {
  etapa: EtapaMeta;
  candidatos: Candidato[];
  vagas: Map<string, Vaga>;
  onOpen: (c: Candidato) => void;
  onDrop: (candidatoId: string, etapa: CandidatoEtapa) => void;
  draggingId: string | null;
  setDraggingId: (id: string | null) => void;
  emptyHint?: ReactNode;
}

export const KanbanColumn = ({
  etapa,
  candidatos,
  vagas,
  onOpen,
  onDrop,
  draggingId,
  setDraggingId,
  emptyHint,
}: KanbanColumnProps) => {
  const [isOver, setIsOver] = useState(false);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!isOver) setIsOver(true);
  };
  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    // só desativa quando sai do container real
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsOver(false);
  };
  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    setIsOver(false);
    if (id) onDrop(id, etapa.key);
  };

  const scoreMedio =
    candidatos.length > 0
      ? Math.round(
          candidatos.reduce((acc, c) => acc + c.scoreIa, 0) / candidatos.length
        )
      : 0;

  return (
    <div
      className={cn(
        'flex h-full min-h-[600px] w-72 shrink-0 flex-col rounded-xl border border-border bg-muted/20 transition',
        isOver && `ring-2 ${etapa.accent} bg-muted/40`
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Header sticky */}
      <div
        className={cn(
          'sticky top-0 z-10 flex items-center justify-between gap-2 rounded-t-xl border-b border-border px-3 py-2 backdrop-blur',
          etapa.color
        )}
      >
        <div className="flex items-center gap-2">
          <span className={cn('h-2 w-2 rounded-full', etapa.dot)} />
          <span className="text-xs font-semibold uppercase tracking-wider">
            {etapa.label}
          </span>
          <span className="rounded-full bg-background/70 px-1.5 py-0 text-[10px] font-bold tabular-nums">
            {candidatos.length}
          </span>
        </div>
        {candidatos.length > 0 && (
          <span className="text-[10px] font-medium opacity-80">
            avg {scoreMedio}
          </span>
        )}
      </div>

      {/* Lista scrollável */}
      <div className="flex-1 space-y-2 overflow-y-auto p-2">
        {candidatos.length === 0 ? (
          <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-border text-center text-[11px] text-muted-foreground">
            {emptyHint ?? 'Arraste candidatos aqui'}
          </div>
        ) : (
          candidatos.map((c, i) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03, duration: 0.2 }}
            >
              <CandidatoCard
                candidato={c}
                vaga={vagas.get(c.vagaId)}
                onOpen={onOpen}
                onDragStart={setDraggingId}
                onDragEnd={() => setDraggingId(null)}
                isDragging={draggingId === c.id}
              />
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};
