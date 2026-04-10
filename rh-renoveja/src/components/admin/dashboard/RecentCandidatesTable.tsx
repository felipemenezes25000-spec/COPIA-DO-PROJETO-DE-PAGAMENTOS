import { Link } from 'react-router-dom';
import { ArrowRight, Users, Clock } from 'lucide-react';
import StatusBadge from '../StatusBadge';
import Avatar from '../shared/Avatar';
import { agingDotClass, agingLabel, getAgingTone } from '../shared/aging';
import type { AdminCandidate } from '../../../types/admin';

// Labels compactos usados na tabela de "candidatos recentes" do dashboard.
// O linha tem espaço reduzido, então os rótulos longos vão abreviados
// ("Ter. Ocupacional", "Ed. Físico", "Assist. Social") — consistentes com
// os labels do CandidatesTable para não confundir o usuário admin.
const CATEGORY_LABELS: Record<AdminCandidate['categoria'], string> = {
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

function formatDateShort(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const now = Date.now();
  const diffDays = Math.floor((now - d.getTime()) / (24 * 60 * 60 * 1000));
  if (diffDays === 0) return 'Hoje';
  if (diffDays === 1) return 'Ontem';
  if (diffDays < 7) return `${diffDays}d atrás`;
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  });
}

interface RecentCandidatesTableProps {
  candidates: AdminCandidate[];
}

export default function RecentCandidatesTable({ candidates }: RecentCandidatesTableProps) {
  return (
    <section
      role="region"
      aria-label="Últimos candidatos"
      className="bg-white rounded-2xl border border-slate-200 shadow-card overflow-hidden"
    >
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-white to-slate-50/40">
        <div>
          <h3 className="font-display font-bold text-slate-900 flex items-center gap-2">
            <span
              aria-hidden="true"
              className="inline-block w-1 h-5 rounded-full bg-gradient-to-b from-primary-400 to-primary-700"
            />
            Últimos candidatos
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">Atividade recente do funil</p>
        </div>
        <Link
          to="/admin/candidatos"
          className="inline-flex items-center gap-1 text-xs font-semibold text-primary-600 hover:text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 rounded-md px-2 py-1 transition-colors group"
        >
          Ver todos
          <ArrowRight
            size={13}
            aria-hidden="true"
            className="group-hover:translate-x-0.5 transition-transform"
          />
        </Link>
      </div>

      {candidates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
            <Users size={22} className="text-slate-300" aria-hidden="true" />
          </div>
          <p className="text-sm text-slate-500">Nenhum candidato cadastrado ainda.</p>
        </div>
      ) : (
        <ul className="divide-y divide-slate-100">
          {candidates.map((c) => {
            const aging = getAgingTone(c);
            const agingDescription = agingLabel(aging.tone, aging.days);
            return (
              <li key={c.id}>
                <Link
                  to={`/admin/candidatos/${c.id}`}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50/60 transition-colors focus:outline-none focus-visible:bg-slate-50 group"
                >
                  <div className="relative shrink-0">
                    <Avatar name={c.nome} size={40} />
                    {aging.tone !== 'none' && aging.tone !== 'fresh' && (
                      <span
                        title={agingDescription}
                        aria-label={agingDescription}
                        className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ring-2 ring-white ${agingDotClass(aging.tone)}`}
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-800 truncate">{c.nome}</p>
                    <p className="text-[11px] text-slate-400 truncate">
                      {CATEGORY_LABELS[c.categoria]}
                      {c.especialidade && <> · {c.especialidade}</>}
                    </p>
                  </div>
                  <StatusBadge status={c.status} />
                  <div className="hidden sm:flex items-center gap-1 text-[11px] text-slate-400 shrink-0 tabular-nums w-20 justify-end">
                    <Clock size={11} aria-hidden="true" />
                    {formatDateShort(c.createdAt)}
                  </div>
                  <ArrowRight
                    size={14}
                    aria-hidden="true"
                    className="text-slate-300 group-hover:text-primary-500 group-hover:translate-x-0.5 transition-all shrink-0"
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
