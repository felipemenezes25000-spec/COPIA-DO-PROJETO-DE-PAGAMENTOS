import { Briefcase } from 'lucide-react';
import type { AdminCandidate } from '../../../types/admin';
import { EmptyState, InfoRow } from './shared-ui';
import { CATEGORY_LABELS, EXPERIENCE_LABELS, hasAnyValue } from './shared';

interface TabProfissionalProps {
  candidate: AdminCandidate;
}

export default function TabProfissional({ candidate }: TabProfissionalProps) {
  const empty = !hasAnyValue(
    candidate.categoria,
    candidate.conselho,
    candidate.especialidade,
    candidate.anosExperiencia,
    candidate.expTelemedicina,
    candidate.sobre,
  );

  if (empty) {
    return (
      <section className="bg-white rounded-xl border border-slate-200">
        <EmptyState
          icon={<Briefcase size={36} aria-hidden="true" />}
          title="Sem dados profissionais cadastrados"
          description="O candidato ainda não preencheu informações profissionais."
        />
      </section>
    );
  }

  return (
    <section
      className="bg-white rounded-xl border border-slate-200 p-5"
      aria-labelledby="tab-profissional-heading"
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-sky-50">
          <Briefcase size={16} className="text-sky-600" aria-hidden="true" />
        </div>
        <h3 id="tab-profissional-heading" className="font-semibold text-slate-800">
          Dados profissionais
        </h3>
      </div>
      <div className="divide-y divide-slate-100">
        <InfoRow label="Categoria" value={CATEGORY_LABELS[candidate.categoria]} />
        <InfoRow label="Conselho" value={candidate.conselho} />
        <InfoRow label="UF registro" value={candidate.ufRegistro} />
        <InfoRow label="Especialidade" value={candidate.especialidade} />
        <InfoRow
          label="Experiência"
          value={candidate.anosExperiencia ? EXPERIENCE_LABELS[candidate.anosExperiencia] : undefined}
        />
        {candidate.expTelemedicina && (
          <InfoRow
            label="Telemedicina"
            value={candidate.expTelemedicina === 'sim' ? 'Sim' : 'Não'}
          />
        )}
        <InfoRow label="Sobre" value={candidate.sobre} />
      </div>
    </section>
  );
}
