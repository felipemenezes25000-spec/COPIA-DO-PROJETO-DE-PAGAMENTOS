import { type FormEvent } from 'react';
import { Clock, Send, Loader2, StickyNote } from 'lucide-react';
import type { AdminCandidate } from '../../../types/admin';
import { EmptyState } from './shared-ui';
import { formatDateTime } from './shared';

interface TabNotasProps {
  candidate: AdminCandidate;
  noteText: string;
  setNoteText: (v: string) => void;
  noteLoading: boolean;
  onSubmit: (e: FormEvent) => void;
}

export default function TabNotas({
  candidate,
  noteText,
  setNoteText,
  noteLoading,
  onSubmit,
}: TabNotasProps) {
  return (
    <section
      className="bg-white rounded-xl border border-slate-200 p-5"
      aria-labelledby="tab-notas-heading"
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100">
          <Clock size={16} className="text-slate-600" aria-hidden="true" />
        </div>
        <h3 id="tab-notas-heading" className="font-semibold text-slate-800">
          Notas internas
        </h3>
      </div>

      <form onSubmit={onSubmit} className="mb-5">
        <label htmlFor="candidate-note-input" className="sr-only">
          Adicionar nota sobre o candidato
        </label>
        <div className="flex gap-2">
          <input
            id="candidate-note-input"
            type="text"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Adicionar nota sobre o candidato..."
            className="input-field flex-1 text-sm"
            maxLength={500}
            disabled={noteLoading}
          />
          <button
            type="submit"
            disabled={!noteText.trim() || noteLoading}
            className="btn-primary text-sm px-4 py-2.5 shrink-0 inline-flex items-center gap-2"
            aria-label="Enviar nota"
          >
            {noteLoading ? (
              <Loader2 size={14} className="animate-spin" aria-hidden="true" />
            ) : (
              <Send size={14} aria-hidden="true" />
            )}
          </button>
        </div>
      </form>

      {candidate.notas.length === 0 ? (
        <EmptyState
          icon={<StickyNote size={32} aria-hidden="true" />}
          title="Nenhuma nota adicionada"
          description="As notas internas ficam visíveis para toda a equipe de RH."
        />
      ) : (
        <ul className="space-y-3">
          {candidate.notas.map((nota) => (
            <li
              key={nota.id}
              className="bg-slate-50 rounded-lg p-3 border border-slate-100"
            >
              <div className="flex items-center justify-between mb-1 gap-2">
                <span className="text-xs font-semibold text-slate-600 truncate">
                  {nota.autor}
                </span>
                <span className="text-xs text-slate-400 shrink-0">
                  {formatDateTime(nota.createdAt)}
                </span>
              </div>
              <p className="text-sm text-slate-700 whitespace-pre-line">{nota.texto}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
