/**
 * Utilitários do Monitor de Produtividade — formatação e cálculos de período.
 */

import type { PeriodKey, PeriodRange } from '../types/productivity';

const BRL = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
});

const BR_DATE = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

const BR_TIME = new Intl.DateTimeFormat('pt-BR', {
  hour: '2-digit',
  minute: '2-digit',
});

const BR_DATETIME = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

/** Converte centavos para "R$ 123,45" */
export function formatCents(cents: number | null | undefined): string {
  if (cents == null) return '—';
  return BRL.format(cents / 100);
}

/** Número inteiro compacto: 1.234 */
export function formatInt(n: number | null | undefined): string {
  if (n == null) return '—';
  return new Intl.NumberFormat('pt-BR').format(n);
}

/** Percentual: 0.876 → "87,6%" */
export function formatPercent(ratio: number | null | undefined, digits = 1): string {
  if (ratio == null) return '—';
  return (ratio * 100).toFixed(digits).replace('.', ',') + '%';
}

/** Minutos → "1h 23min" ou "12min" */
export function formatMinutes(mins: number | null | undefined): string {
  if (mins == null || Number.isNaN(mins)) return '—';
  if (mins < 1) return '< 1min';
  if (mins < 60) return `${Math.round(mins)}min`;
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

export function formatDate(iso: string | Date | null | undefined): string {
  if (!iso) return '—';
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return '—';
  return BR_DATE.format(d);
}

export function formatTime(iso: string | Date | null | undefined): string {
  if (!iso) return '—';
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return '—';
  return BR_TIME.format(d);
}

export function formatDateTime(iso: string | Date | null | undefined): string {
  if (!iso) return '—';
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return '—';
  return BR_DATETIME.format(d);
}

/** "há 3min", "há 2h", etc. — atualiza com o relógio da página */
export function formatRelative(iso: string | Date | null | undefined, nowMs?: number): string {
  if (!iso) return '—';
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return '—';
  const diffMs = (nowMs ?? Date.now()) - d.getTime();
  if (diffMs < 0) return 'agora';
  const s = Math.floor(diffMs / 1000);
  if (s < 60) return 'agora';
  const m = Math.floor(s / 60);
  if (m < 60) return `há ${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `há ${h}h`;
  const d2 = Math.floor(h / 24);
  return `há ${d2}d`;
}

/* ─────────────────────────────────────────────────────────────── */
/* Períodos pré-definidos                                           */
/* ─────────────────────────────────────────────────────────────── */

export function resolvePeriod(key: PeriodKey): PeriodRange {
  const to = new Date();
  const from = new Date(to);

  switch (key) {
    case 'today':
      from.setHours(0, 0, 0, 0);
      return { from, to, key, label: 'Hoje' };
    case '7d':
      from.setDate(from.getDate() - 7);
      return { from, to, key, label: 'Últimos 7 dias' };
    case '30d':
      from.setDate(from.getDate() - 30);
      return { from, to, key, label: 'Últimos 30 dias' };
    case '90d':
      from.setDate(from.getDate() - 90);
      return { from, to, key, label: 'Últimos 90 dias' };
  }
}

/* ─────────────────────────────────────────────────────────────── */
/* Status / prioridade — labels humanas                              */
/* ─────────────────────────────────────────────────────────────── */

export function statusLabel(status: string): string {
  const map: Record<string, string> = {
    submitted: 'Enviado',
    in_review: 'Em revisão',
    searching_doctor: 'Buscando médico',
    approved_pending_payment: 'Aprovado',
    paid: 'Aprovado, aguardando assinatura',
    signed: 'Assinado',
    delivered: 'Entregue',
    rejected: 'Rejeitado',
    cancelled: 'Cancelado',
    consultation_ready: 'Consulta pronta',
    in_consultation: 'Em consulta',
    pending_post_consultation: 'Aguardando pós-consulta',
    consultation_finished: 'Consulta finalizada',
  };
  return map[status] ?? status;
}

export function priorityLabel(priority: string): { label: string; color: string } {
  const p = priority.toLowerCase();
  if (p === 'urgent') return { label: 'Urgente', color: 'text-red-600 bg-red-50 border-red-200' };
  if (p === 'high') return { label: 'Alta', color: 'text-amber-600 bg-amber-50 border-amber-200' };
  return { label: 'Normal', color: 'text-slate-600 bg-slate-50 border-slate-200' };
}

export function requestTypeLabel(type: string): string {
  switch (type) {
    case 'prescription':
      return 'Receita';
    case 'exam':
      return 'Exame';
    case 'consultation':
      return 'Consulta';
    default:
      return type;
  }
}
