import { GraduationCap } from 'lucide-react';
import type { AdminCandidate } from '../../../types/admin';
import { EmptyState, InfoRow } from './shared-ui';
import { hasAnyValue } from './shared';

interface TabAcademicoProps {
  candidate: AdminCandidate;
}

export default function TabAcademico({ candidate }: TabAcademicoProps) {
  const empty = !hasAnyValue(
    candidate.graduacao,
    candidate.universidade,
    candidate.anoConclusao,
    candidate.posGraduacao,
    candidate.residencia,
  );

  if (empty) {
    return (
      <section className="bg-white rounded-xl border border-slate-200">
        <EmptyState
          icon={<GraduationCap size={36} aria-hidden="true" />}
          title="Sem dados acadêmicos cadastrados"
          description="O candidato ainda não preencheu sua formação acadêmica."
        />
      </section>
    );
  }

  return (
    <section
      className="bg-white rounded-xl border border-slate-200 p-5"
      aria-labelledby="tab-academico-heading"
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-purple-50">
          <GraduationCap size={16} className="text-purple-600" aria-hidden="true" />
        </div>
        <h3 id="tab-academico-heading" className="font-semibold text-slate-800">
          Formação acadêmica
        </h3>
      </div>
      <div className="divide-y divide-slate-100">
        <InfoRow label="Graduação" value={candidate.graduacao} />
        <InfoRow label="Universidade" value={candidate.universidade} />
        <InfoRow label="Conclusão" value={candidate.anoConclusao} />
        <InfoRow label="Pós-graduação" value={candidate.posGraduacao} />
        <InfoRow label="Residência" value={candidate.residencia} />
      </div>
    </section>
  );
}
