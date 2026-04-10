/**
 * Rótulos em português para exibição ao usuário (UI only).
 * Backend enums, API e banco NÃO devem ser alterados — apenas o que o usuário vê.
 *
 * Use este mapa em: badges, timeline, cards, contadores, listas de pedidos.
 * Inclui fluxo de pagamento (approved_pending_payment → paid).
 */

export const STATUS_LABELS_PT: Record<string, string> = {
  // Prescription / Exam (canônicos)
  submitted: 'Solicitado',
  analyzing: 'Em análise',
  in_review: 'Em análise',
  approved: 'Aprovado',
  approved_pending_payment: 'Aguardando pagamento',
  paid: 'Pagamento confirmado',
  signed: 'Assinado',
  delivered: 'Concluído',
  // Consultation (canônicos)
  searching_doctor: 'Buscando profissional',
  consultation_ready: 'Sala pronta',
  in_consultation: 'Em atendimento',
  pending_post_consultation: 'Finalizando consulta',
  consultation_finished: 'Consulta concluída',
  // Common
  rejected: 'Reprovado',
  cancelled: 'Cancelado',
  // Legados (retrocompatibilidade — dados históricos do banco)
  pending: 'Pendente',
  pending_payment: 'Aguardando pagamento',
  completed: 'Concluído',
};

/**
 * Cores de badge por status. Mapeia cada status a uma cor semântica para
 * uso em badges, indicadores e highlights.
 *
 * gray = neutro/aguardando, blue = em progresso, amber = ação necessária,
 * green = sucesso/concluído, red = erro/rejeição.
 */
export type StatusColorKey = 'gray' | 'blue' | 'amber' | 'green' | 'red';

export const STATUS_COLOR_MAP: Record<string, StatusColorKey> = {
  submitted: 'gray',
  in_review: 'blue',
  analyzing: 'blue',
  approved: 'green',
  approved_pending_payment: 'amber',
  paid: 'green',
  signed: 'green',
  delivered: 'green',
  searching_doctor: 'blue',
  consultation_ready: 'blue',
  in_consultation: 'blue',
  pending_post_consultation: 'blue',
  consultation_finished: 'green',
  rejected: 'red',
  cancelled: 'gray',
  pending: 'gray',
  pending_payment: 'amber',
  completed: 'green',
};

export function getStatusColor(status: string | null | undefined): StatusColorKey {
  return STATUS_COLOR_MAP[status ?? ''] ?? 'gray';
}

/** Label para cards/listas genéricas (ex.: "Na fila" para submitted). Pode divergir de STATUS_LABELS_PT. */
export const STATUS_DISPLAY_LABELS_PT: Record<string, string> = {
  ...STATUS_LABELS_PT,
  submitted: 'Na fila',
  searching_doctor: 'Na fila',
};

/**
 * Retorna o rótulo em PT para um status do backend (apenas UI).
 */
export function getStatusLabelPt(status: string | null | undefined): string {
  const s = status ?? '';
  return (STATUS_LABELS_PT[s] ?? s) || '—';
}

/**
 * Rótulos de urgência (campo aiUrgency gerado pela IA).
 * A IA pode devolver com capitalização inconsistente ("Routine", "ROUTINE"),
 * por isso sempre normalizamos via toLowerCase antes do lookup.
 */
export const URGENCY_LABELS_PT: Record<string, string> = {
  routine: 'Rotina',
  urgent: 'Urgente',
  emergency: 'Emergência',
};

/**
 * Retorna o rótulo em PT para urgência da IA. Nunca devolve o valor cru
 * em inglês — usa 'Rotina' como fallback seguro quando desconhecido.
 */
export function getUrgencyLabelPt(level: string | null | undefined): string {
  if (!level) return '';
  return URGENCY_LABELS_PT[level.toLowerCase()] ?? 'Rotina';
}

/**
 * Rótulos dos cards de estatísticas no dashboard (Home).
 */
export const DASHBOARD_STATS_LABELS = {
  analyzing: 'Em análise médica',
  ready: 'Prontos',
} as const;

/**
 * Grupos de status para filtro por categoria na tela de pedidos.
 * Cada grupo agrupa os status do backend em categorias visíveis ao paciente.
 */
export const STATUS_GROUPS: Record<string, { label: string; statuses: string[] }> = {
  em_analise_medica: {
    label: 'Em análise médica',
    statuses: [
      'submitted', 'in_review', 'analyzing',
      'searching_doctor', 'pending', 'pending_payment',
    ],
  },
  ativo: {
    label: 'Ativos',
    statuses: [
      'approved', 'consultation_ready', 'in_consultation',
      'pending_post_consultation', 'approved_pending_payment', 'paid',
    ],
  },
  pronto: {
    label: 'Prontos',
    statuses: [
      'signed', 'delivered', 'consultation_finished', 'completed',
    ],
  },
};
