/**
 * Tipos do Monitor de Produtividade Médica (portal RH).
 *
 * Espelham 1:1 os DTOs em
 * backend-dotnet/src/RenoveJa.Application/DTOs/Productivity/*.cs.
 *
 * Valores monetários chegam em CENTAVOS (inteiros) e são convertidos para
 * `R$ xx,yy` no ponto de exibição (util: `lib/money.ts`).
 *
 * Spec: docs/superpowers/specs/2026-04-09-monitor-produtividade-medica-design.md
 */

export interface OverviewDto {
  fromUtc: string;
  toUtc: string;
  totalRequests: number;
  completedRequests: number;
  completionRate: number;
  rejectedByDoctor: number;
  rejectedByAi: number;
  reopenedFromAi: number;
  p50MinutesToSign: number;
  p95MinutesToSign: number;
  revenueCents: number;
  idleCostCents: number;
  activeDoctors: number;
  doctorsOnline: number;
}

export interface DoctorProductivityRow {
  doctorProfileId: string;
  userId: string;
  name: string;
  specialty: string;
  requestsHandled: number;
  reviewed: number;
  signed: number;
  batchSigned: number;
  p50MinutesToSign: number;
  p95MinutesToSign: number;
  revenueCents: number;
  idleCostCents: number;
  utilizationRate: number | null;
  batchSignRate: number;
  lastActivityAt: string | null;
}

export interface HeatmapCell {
  dayOfWeek: number; // 0=dom, 6=sáb
  hour: number; // 0..23
  count: number;
}

export interface TimelineItem {
  requestId: string;
  shortCode: string;
  requestType: string;
  status: string;
  createdAt: string;
  reviewedAt: string | null;
  approvedForSigningAt: string | null;
  signedAt: string | null;
  deliveredAt: string | null;
  minutesCreatedToSigned: number | null;
  productRevenueCents: number;
}

export interface RevenueBreakdown {
  productKey: string;
  label: string;
  quantity: number;
  unitPriceCents: number;
  totalCents: number;
}

export interface DoctorDetailDto {
  summary: DoctorProductivityRow;
  funnel: FunnelDto;
  heatmap: HeatmapCell[];
  recentTimeline: TimelineItem[];
  revenueByProduct: RevenueBreakdown[];
}

export interface FunnelDto {
  created: number;
  assigned: number;
  reviewed: number;
  approved: number;
  signed: number;
  delivered: number;
  rejected: number;
  cancelled: number;
}

export interface SlaByPriority {
  targetMinutes: number;
  p50Minutes: number;
  p95Minutes: number;
  withinTargetRate: number;
  breached: number;
}

export interface SlaDto {
  urgent: SlaByPriority;
  high: SlaByPriority;
  normal: SlaByPriority;
}

export interface QueueItem {
  id: string;
  shortCode: string;
  requestType: string;
  priority: string;
  status: string;
  requiredSpecialty: string | null;
  createdAt: string;
  minutesWaiting: number;
  slaBreached: boolean;
  doctorId: string | null;
  doctorName: string | null;
}

export interface DoctorActivitySignal {
  doctorProfileId: string;
  name: string;
  specialty: string;
  lastActivityAt: string;
  lastAction: string;
  actionsLast5Min: number;
}

export interface LiveQueueDto {
  serverTimeUtc: string;
  totalPending: number;
  unassignedCount: number;
  urgentCount: number;
  breachingSlaCount: number;
  urgent: QueueItem[];
  oldestUnassigned: QueueItem[];
  online: DoctorActivitySignal[];
}

/** Produto precificado — uma linha da tela /admin/precificacao */
export interface ProductPriceDto {
  id: string;
  productKey: string;
  label: string;
  unit: 'unit' | 'minute';
  priceCents: number;
  currency: string;
  active: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertProductPriceDto {
  label: string;
  unit: 'unit' | 'minute';
  priceCents: number;
  currency?: string;
  notes?: string | null;
}

export interface CreateCustomProductDto {
  productKey: string;
  label: string;
  unit: 'unit' | 'minute';
  priceCents: number;
  currency?: string;
  notes?: string | null;
}

/** Contrato opcional de horas por médico */
export interface DoctorContractDto {
  id: string;
  doctorProfileId: string;
  doctorName: string | null;
  hoursPerMonth: number;
  hourlyRateCents: number;
  currency: string;
  availabilityWindowJson: string | null;
  startsAt: string;
  endsAt: string | null;
  active: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertDoctorContractDto {
  hoursPerMonth: number;
  hourlyRateCents: number;
  currency?: string;
  availabilityWindowJson?: string | null;
  startsAt: string;
  endsAt?: string | null;
  notes?: string | null;
}

/** Período selecionável no PeriodPicker */
export type PeriodKey = 'today' | '7d' | '30d' | '90d';

export interface PeriodRange {
  from: Date;
  to: Date;
  key: PeriodKey | 'custom';
  label: string;
}
