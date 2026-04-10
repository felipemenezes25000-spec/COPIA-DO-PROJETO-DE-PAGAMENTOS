/**
 * Validador de CNS (Cartão Nacional de Saúde) — algoritmo oficial do Ministério da Saúde.
 * CNS: 15 dígitos. Início 1/2 = definitivo. Início 7/8/9 = provisório.
 */

export function validateCns(cns: string | null | undefined): boolean {
  if (!cns) return false;

  const cleaned = cns.replace(/[\s.\-]/g, '');
  if (cleaned.length !== 15) return false;
  if (!/^\d{15}$/.test(cleaned)) return false;

  const first = cleaned[0];
  if (!['1', '2', '7', '8', '9'].includes(first)) return false;

  // Soma ponderada: dígito[i] * (15 - i), resultado % 11 === 0
  let sum = 0;
  for (let i = 0; i < 15; i++) {
    sum += parseInt(cleaned[i], 10) * (15 - i);
  }

  return sum % 11 === 0;
}

/** Formata CNS: 898 0012 3456 7890 */
export function formatCns(cns: string): string {
  const cleaned = cns.replace(/[\s.\-]/g, '');
  if (cleaned.length !== 15) return cns;
  return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 7)} ${cleaned.slice(7, 11)} ${cleaned.slice(11, 15)}`;
}

/** Valida CPF (algoritmo padrão com dígitos verificadores) */
export function validateCpf(cpf: string | null | undefined): boolean {
  if (!cpf) return false;

  const cleaned = cpf.replace(/[\s.\-]/g, '');
  if (cleaned.length !== 11) return false;
  if (!/^\d{11}$/.test(cleaned)) return false;

  // Rejeita CPFs com todos os dígitos iguais
  if (/^(\d)\1{10}$/.test(cleaned)) return false;

  // Primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleaned[i], 10) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10) remainder = 0;
  if (remainder !== parseInt(cleaned[9], 10)) return false;

  // Segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleaned[i], 10) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10) remainder = 0;
  if (remainder !== parseInt(cleaned[10], 10)) return false;

  return true;
}

/** Formata CPF: 123.456.789-00 */
export function formatCpf(cpf: string): string {
  const cleaned = cpf.replace(/[\s.\-]/g, '');
  if (cleaned.length !== 11) return cpf;
  return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-${cleaned.slice(9, 11)}`;
}

/** Valida CNES (7 dígitos) */
export function validateCnes(cnes: string | null | undefined): boolean {
  if (!cnes) return false;
  const cleaned = cnes.replace(/[\s.\-]/g, '');
  return cleaned.length === 7 && /^\d{7}$/.test(cleaned);
}

/** Valida CBO (6 dígitos) */
export function validateCbo(cbo: string | null | undefined): boolean {
  if (!cbo) return false;
  const cleaned = cbo.replace(/[\s.\-]/g, '');
  return cleaned.length === 6 && /^\d{6}$/.test(cleaned);
}
