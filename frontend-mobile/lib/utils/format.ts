/**
 * Formata valor numérico em Real (pt-BR): vírgula decimal, símbolo R$.
 * Ex: formatBRL(1) => "R$ 1,00"
 */
export function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Formata data em pt-BR.
 * @param dateStr - string ISO ou Date
 * @param options.short - se true, formato curto (dd/MM/yy); senão dia e mês por extenso quando aplicável
 */
export function formatDateBR(
  dateStr: string | Date,
  options?: { short?: boolean }
): string {
  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  if (Number.isNaN(date.getTime())) return '—';
  if (options?.short) {
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    });
  }
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Formata hora em pt-BR (HH:mm).
 */
export function formatTimeBR(dateStr: string | Date): string {
  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Formata data e hora em pt-BR (dd/MM/yyyy HH:mm).
 */
export function formatDateTimeBR(dateStr: string | Date): string {
  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  if (Number.isNaN(date.getTime())) return '—';
  return `${date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })} ${formatTimeBR(date)}`;
}
