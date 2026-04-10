import {
  UserPlus,
  Sparkles,
  StickyNote,
  CheckCircle,
  XCircle,
  CalendarCheck,
  UserCheck,
  Clock,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { AdminCandidate } from '../../../types/admin';
import { formatDateTime } from './shared';

interface ActivityTimelineProps {
  candidate: AdminCandidate;
}

interface TimelineEvent {
  id: string;
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  title: string;
  subtitle?: string;
  timestamp: string;
}

/**
 * Activity timeline reconstructed from the candidate payload.
 *
 * We don't have a proper audit log on the backend, so the timeline is
 * built from the data that IS in the payload:
 *   - `createdAt` → inscrição
 *   - `aiAnalysis.analyzedAt` → análise por IA (when present)
 *   - each `notas[i]` → nota adicionada
 *   - current status, if terminal → last decision (using updatedAt)
 *
 * Events are sorted newest-first. This is "good enough" for a recruiter
 * who wants to see activity at a glance without paging through tabs.
 */
export default function ActivityTimeline({ candidate }: ActivityTimelineProps) {
  const events: TimelineEvent[] = [];

  // 1. Inscrição — always present
  events.push({
    id: 'created',
    icon: UserPlus,
    iconBg: 'bg-sky-100',
    iconColor: 'text-sky-600',
    title: 'Inscrição no portal',
    subtitle: 'Candidato concluiu o cadastro',
    timestamp: candidate.createdAt,
  });

  // 2. AI analysis
  if (candidate.aiAnalysis) {
    events.push({
      id: 'ai-analyzed',
      icon: Sparkles,
      iconBg: 'bg-violet-100',
      iconColor: 'text-violet-600',
      title: `Analisado pela IA — score ${candidate.aiAnalysis.score}`,
      subtitle: candidate.aiAnalysis.recomendacaoTexto,
      timestamp: candidate.aiAnalysis.analyzedAt,
    });
  }

  // 3. Notes
  for (const note of candidate.notas) {
    events.push({
      id: `note-${note.id}`,
      icon: StickyNote,
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      title: `Nota — ${note.autor}`,
      subtitle: note.texto,
      timestamp: note.createdAt,
    });
  }

  // 4. Terminal / near-terminal status — display only if updatedAt is
  //    meaningfully different from createdAt. Otherwise the "decided
  //    moments ago" event would shadow the inscription event.
  const createdMs = new Date(candidate.createdAt).getTime();
  const updatedMs = new Date(candidate.updatedAt || candidate.createdAt).getTime();
  const sameAsCreated = !candidate.updatedAt || Math.abs(updatedMs - createdMs) < 60_000;

  if (!sameAsCreated) {
    const statusVisual: Record<
      AdminCandidate['status'],
      { icon: LucideIcon; title: string; iconBg: string; iconColor: string }
    > = {
      pendente: {
        icon: Clock,
        title: 'Atualização de cadastro',
        iconBg: 'bg-slate-100',
        iconColor: 'text-slate-500',
      },
      em_analise: {
        icon: CalendarCheck,
        title: 'Movido para "Em análise"',
        iconBg: 'bg-sky-100',
        iconColor: 'text-sky-600',
      },
      entrevista: {
        icon: UserCheck,
        title: 'Movido para "Entrevista"',
        iconBg: 'bg-violet-100',
        iconColor: 'text-violet-600',
      },
      aprovado: {
        icon: CheckCircle,
        title: 'Candidato aprovado',
        iconBg: 'bg-emerald-100',
        iconColor: 'text-emerald-600',
      },
      rejeitado: {
        icon: XCircle,
        title: 'Candidato rejeitado',
        iconBg: 'bg-rose-100',
        iconColor: 'text-rose-600',
      },
    };
    const cfg = statusVisual[candidate.status];
    events.push({
      id: 'status-update',
      icon: cfg.icon,
      iconBg: cfg.iconBg,
      iconColor: cfg.iconColor,
      title: cfg.title,
      timestamp: candidate.updatedAt,
    });
  }

  // Sort newest first
  events.sort((a, b) => {
    const ta = new Date(a.timestamp).getTime();
    const tb = new Date(b.timestamp).getTime();
    return tb - ta;
  });

  return (
    <section
      className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card"
      aria-labelledby="activity-timeline-heading"
    >
      <h4
        id="activity-timeline-heading"
        className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500 mb-4 flex items-center gap-2"
      >
        <span
          aria-hidden="true"
          className="inline-block w-1 h-3.5 rounded-full bg-gradient-to-b from-sky-400 to-sky-700"
        />
        Linha do tempo
      </h4>

      <ol className="relative space-y-4">
        {/* Timeline rail */}
        <div
          aria-hidden="true"
          className="absolute left-[15px] top-2 bottom-2 w-px bg-gradient-to-b from-slate-200 via-slate-200 to-transparent"
        />

        {events.map((event) => {
          const Icon = event.icon;
          return (
            <li key={event.id} className="relative pl-10">
              <div
                aria-hidden="true"
                className={`absolute left-0 top-0 flex items-center justify-center w-[31px] h-[31px] rounded-full ring-[3px] ring-white ${event.iconBg}`}
              >
                <Icon size={13} className={event.iconColor} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-800 leading-tight">
                  {event.title}
                </p>
                {event.subtitle && (
                  <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">
                    {event.subtitle}
                  </p>
                )}
                <p className="text-[10px] text-slate-400 mt-1 tabular-nums">
                  {formatDateTime(event.timestamp)}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
