import { User, Mail, Phone, MapPin } from 'lucide-react';
import type { AdminCandidate } from '../../../types/admin';
import { EmptyState, InfoRow } from './shared-ui';
import { formatDate, hasAnyValue } from './shared';

interface TabPessoalProps {
  candidate: AdminCandidate;
}

export default function TabPessoal({ candidate }: TabPessoalProps) {
  const empty = !hasAnyValue(
    candidate.nome,
    candidate.cpf,
    candidate.nascimento,
    candidate.email,
    candidate.telefone,
    candidate.cidade,
    candidate.estado,
  );

  if (empty) {
    return (
      <section className="bg-white rounded-xl border border-slate-200">
        <EmptyState
          icon={<User size={36} aria-hidden="true" />}
          title="Sem dados pessoais cadastrados"
          description="O candidato ainda não preencheu informações pessoais."
        />
      </section>
    );
  }

  return (
    <section
      className="bg-white rounded-xl border border-slate-200 p-5"
      aria-labelledby="tab-pessoal-heading"
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary-50">
          <User size={16} className="text-primary-600" aria-hidden="true" />
        </div>
        <h3 id="tab-pessoal-heading" className="font-semibold text-slate-800">
          Dados pessoais
        </h3>
      </div>
      <div className="divide-y divide-slate-100">
        <InfoRow label="Nome" value={candidate.nome} />
        <InfoRow label="CPF" value={candidate.cpf} />
        <InfoRow label="Nascimento" value={formatDate(candidate.nascimento)} />
        {candidate.email && (
          <div className="flex items-center gap-2 py-2">
            <Mail size={14} className="text-slate-400" aria-hidden="true" />
            <a
              href={`mailto:${candidate.email}`}
              className="text-sm text-primary-600 hover:underline"
            >
              {candidate.email}
            </a>
          </div>
        )}
        {candidate.telefone && (
          <div className="flex items-center gap-2 py-2">
            <Phone size={14} className="text-slate-400" aria-hidden="true" />
            <span className="text-sm text-slate-700">{candidate.telefone}</span>
          </div>
        )}
        {(candidate.cidade || candidate.estado) && (
          <div className="flex items-center gap-2 py-2">
            <MapPin size={14} className="text-slate-400" aria-hidden="true" />
            <span className="text-sm text-slate-700">
              {candidate.cidade}
              {candidate.cidade && candidate.estado ? '/' : ''}
              {candidate.estado}
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
