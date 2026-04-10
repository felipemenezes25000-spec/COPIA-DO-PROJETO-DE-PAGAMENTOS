/**
 * doctorApi.ts — Facade / barrel file for the doctor portal API.
 *
 * All API functions are defined in domain-specific modules:
 *   doctor-api-auth.ts         — Auth, profile, base HTTP client (authFetch)
 *   doctor-api-requests.ts     — Request CRUD, actions, stats, AI re-analysis
 *   doctor-api-consultation.ts — Consultation flow, conduct, content, recordings, AI
 *   doctor-api-doctors.ts      — Notifications, certificates, video rooms
 *   doctor-api-clinical.ts     — Patient data, clinical summary, doctor notes
 *   doctor-api-misc.ts         — Specialties, CID, address, prescription images
 *
 * This file keeps type definitions (imported everywhere) and re-exports
 * all functions so existing imports continue to work:
 *   import { getRequests, loginDoctor } from '../services/doctorApi';
 *
 * New code should prefer importing from the specific module:
 *   import { getRequests } from '../services/doctor-api-requests';
 */

// ── Types (kept here — imported by all modules and consumers) ──

export interface DoctorUser {
  id: string;
  email: string;
  name: string;
  role: string;
  profileComplete?: boolean;
  avatarUrl?: string;
}

export interface DoctorProfile {
  id: string;
  userId: string;
  crm: string;
  crmState: string;
  specialty: string;
  professionalPhone?: string;
  professionalAddress?: string;
  approvalStatus: string;
  hasCertificate?: boolean;
}

export interface MedicalRequest {
  id: string;
  patientName: string;
  patientId?: string;
  doctorId?: string | null;
  type: 'prescription' | 'exam' | 'consultation';
  status: string;
  createdAt: string;
  updatedAt?: string;
  symptoms?: string | null;
  medications?: string[] | null;
  exams?: string[] | null;
  prescriptionImages?: string[];
  examImages?: string[];
  notes?: string;
  doctorConductNotes?: string;
  includeConductInPdf?: boolean;
  prescriptionKind?: string;
  autoObservation?: string;
  anamnesisData?: Record<string, unknown>;
  transcriptionText?: string;
  signedDocumentUrl?: string;
  rejectionReason?: string;
  // AI fields
  aiSummaryForDoctor?: string;
  aiExtractedJson?: string;
  aiRiskLevel?: string;
  aiUrgency?: string;
  aiReadabilityOk?: boolean;
  aiMessageToUser?: string;
  aiConductSuggestion?: string;
  aiSuggestedExams?: string;
  // Consultation time
  consultationType?: string;
  contractedMinutes?: number;
  consultationStartedAt?: string;
  // Access
  accessCode?: string;
  signedAt?: string;
  // Consultation summary (pós-vídeo)
  consultationTranscript?: string | null;
  consultationAnamnesis?: string | null;
  consultationAiSuggestions?: string | null;
  /** Artigos científicos que apoiam o CID sugerido. */
  consultationEvidence?: string | null;
  /** Notas SOAP geradas pela IA após a consulta (JSON com subjective/objective/assessment/plan/medical_terms). */
  consultationSoapNotes?: string | null;
  /** Indica se existe gravação de vídeo da consulta. */
  consultationHasRecording?: boolean;
  patientBirthDate?: string | null;
  patientGender?: string | null;
  examQuickPackages?: ExamQuickPackageDto[] | null;
  /** Prioridade clínica (Phase B). Ordem: urgent > high > normal > low. */
  priority?: 'low' | 'normal' | 'high' | 'urgent' | null;
  /** Especialidade exigida para atender o pedido (routing). */
  requiredSpecialty?: string | null;
  // AI rejection fields
  /** Fonte da rejeição: 'Ai' = automática pela IA, 'Doctor' = manual pelo médico. PascalCase conforme serialização .NET. */
  rejectionSource?: 'Ai' | 'Doctor' | null;
  aiRejectionReason?: string | null;
  aiRejectedAt?: string | null;
  reopenedBy?: string | null;
  reopenedAt?: string | null;
}

/** Alinhado ao DTO .NET `ExamQuickPackageDto`. */
export interface ExamQuickPackageDto {
  key: string;
  name: string;
  exams: string[];
  justification: string;
}

export interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  notes?: string;
}

export interface ExamItem {
  name: string;
  notes?: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  notificationType: string;
  read: boolean;
  createdAt: string;
  data?: Record<string, unknown>;
}

export interface PatientProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  birthDate?: string;
  gender?: string;
  allergies?: string[];
  chronicConditions?: string[];
  avatarUrl?: string;
}

export interface Specialty {
  id: string;
  name: string;
}

export interface DoctorStats {
  pendingCount: number;
  inReviewCount: number;
  completedCount: number;
  totalEarnings: number;
}

export interface ConsultationSummary {
  anamnesis?: string;
  plan?: string;
}

/**
 * Níveis de confidencialidade alinhados a CFP 001/2009 e LGPD Art. 11.
 * - `general`: qualquer médico com vínculo.
 * - `specialty_only`: apenas médicos da mesma especialidade.
 * - `author_only`: apenas o autor — equipe vê `summaryForTeam`.
 */
export type NoteSensitivity = 'general' | 'specialty_only' | 'author_only';

export interface DoctorNote {
  noteType: string;
  content: string;
  requestId?: string;
  sensitivity?: NoteSensitivity;
  summaryForTeam?: string | null;
}

export interface DoctorNoteDto {
  id: string;
  noteType: string;
  content: string;
  sensitivity: NoteSensitivity;
  authorSpecialty?: string | null;
  summaryForTeam?: string | null;
  /**
   * Quando `true`, `content` já é o resumo seguro para a equipe — o backend
   * mascarou o texto original porque o visualizador não tem permissão.
   */
  isMaskedForViewer: boolean;
  requestId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export const NOTE_SENSITIVITY_OPTIONS: readonly {
  key: NoteSensitivity;
  label: string;
  description: string;
}[] = [
  {
    key: 'general',
    label: 'Geral',
    description: 'Visível a qualquer médico com vínculo ao paciente.',
  },
  {
    key: 'specialty_only',
    label: 'Especialidade',
    description: 'Visível apenas a médicos da sua especialidade.',
  },
  {
    key: 'author_only',
    label: 'Só o autor',
    description: 'Só você vê. Informe um resumo curto para a equipe.',
  },
];

export interface PatientClinicalSummaryResponse {
  summary?: string | null;
  fallback?: string | null;
  structured?: {
    problemList?: string[];
    activeMedications?: string[];
    narrativeSummary?: string;
    alerts?: string[];
  } | null;
  doctorNotes?: DoctorNoteDto[];
}

export const DOCTOR_NOTE_TYPES = [
  { key: 'progress_note', label: 'Evolução', icon: 'FileText' },
  {
    key: 'clinical_impression',
    label: 'Impressão diagnóstica',
    icon: 'Stethoscope',
  },
  { key: 'addendum', label: 'Complemento', icon: 'PlusCircle' },
  { key: 'observation', label: 'Observação', icon: 'Eye' },
] as const;

export interface Recording {
  id: string;
  duration?: number;
  startedAt?: string;
  status?: string;
}

// ── Re-export all domain modules ──

export * from './doctor-api-auth';
export * from './doctor-api-requests';
export * from './doctor-api-consultation';
export * from './doctor-api-doctors';
export * from './doctor-api-clinical';
export * from './doctor-api-misc';
