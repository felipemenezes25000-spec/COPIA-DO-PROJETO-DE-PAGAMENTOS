// Labels humanos para cada categoria profissional — usados no detalhe do
// candidato (TabVisaoGeral) e em qualquer lugar que precise exibir o nome
// user-facing. Mantém fallback `?? candidate.categoria ?? '—'` no call site,
// então uma categoria legada desconhecida ainda é mostrada sem quebrar.
// O Record é typed como `<string, string>` (não `<ProfessionalCategory, string>`)
// para aceitar os candidatos legados com categoria "inferida" como fallback.
export const CATEGORY_LABELS: Record<string, string> = {
  medico: 'Médico(a)',
  enfermeiro: 'Enfermeiro(a)',
  dentista: 'Dentista',
  psicologo: 'Psicólogo(a)',
  nutricionista: 'Nutricionista',
  fisioterapeuta: 'Fisioterapeuta',
  fonoaudiologo: 'Fonoaudiólogo(a)',
  terapeuta_ocupacional: 'Terapeuta Ocupacional',
  farmaceutico: 'Farmacêutico(a)',
  biomedico: 'Biomédico(a)',
  educador_fisico: 'Profissional de Educação Física',
  assistente_social: 'Assistente Social',
};

export const EXPERIENCE_LABELS: Record<string, string> = {
  menos_1: 'Menos de 1 ano',
  '1_3': '1 a 3 anos',
  '3_5': '3 a 5 anos',
  '5_10': '5 a 10 anos',
  mais_10: 'Mais de 10 anos',
};

export function formatDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function formatDateTime(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function computeAge(nascimento?: string): number | null {
  if (!nascimento) return null;
  const d = new Date(nascimento);
  if (Number.isNaN(d.getTime())) return null;
  const diffMs = Date.now() - d.getTime();
  const age = new Date(diffMs).getUTCFullYear() - 1970;
  return age > 0 && age < 130 ? age : null;
}

export function hasAnyValue(
  ...values: Array<string | number | null | undefined>
): boolean {
  return values.some((v) => v !== undefined && v !== null && v !== '');
}
