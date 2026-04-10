import { apiClient } from './api-client';
import type {
  RequestResponseDto,
  PatientSummaryDto,
  EncounterSummaryDto,
  MedicalDocumentSummaryDto,
  PatientProfileForDoctorDto,
} from '../types/database';

// ============================================
// CLINICAL / FHIR-LITE (prontuário)
// ============================================

export async function fetchMyPatientSummary(): Promise<PatientSummaryDto> {
  return apiClient.get('/api/fhir-lite/patient-summary');
}

export async function fetchMyEncounters(
  limit = 50,
  offset = 0
): Promise<EncounterSummaryDto[]> {
  return apiClient.get('/api/fhir-lite/encounters', { limit, offset });
}

export async function fetchMyDocuments(
  limit = 50,
  offset = 0
): Promise<MedicalDocumentSummaryDto[]> {
  return apiClient.get('/api/fhir-lite/documents', { limit, offset });
}

/** Doctor Read: médico obtém resumo do paciente (requer vínculo). */
export async function getDoctorPatientSummary(patientId: string): Promise<PatientSummaryDto> {
  return apiClient.get(`/api/fhir-lite/doctor/patient/${patientId}/summary`);
}

/** Doctor Read: médico obtém encounters do paciente. */
export async function getDoctorPatientEncounters(
  patientId: string,
  limit = 50,
  offset = 0
): Promise<EncounterSummaryDto[]> {
  return apiClient.get(`/api/fhir-lite/doctor/patient/${patientId}/encounters`, { limit, offset });
}

/** Doctor Read: médico obtém documentos do paciente. */
export async function getDoctorPatientDocuments(
  patientId: string,
  limit = 50,
  offset = 0
): Promise<MedicalDocumentSummaryDto[]> {
  return apiClient.get(`/api/fhir-lite/doctor/patient/${patientId}/documents`, { limit, offset });
}

// ============================================
// Patient data via Requests endpoints
// ============================================

export async function getPatientRequests(patientId: string): Promise<RequestResponseDto[]> {
  const data = await apiClient.get<RequestResponseDto[]>(`/api/requests/by-patient/${patientId}`);
  return Array.isArray(data) ? data : [];
}

/** Médico obtém perfil do paciente (dados cadastrais) para identificação. */
export async function getPatientProfileForDoctor(
  patientId: string
): Promise<PatientProfileForDoctorDto | null> {
  try {
    return await apiClient.get<PatientProfileForDoctorDto>(
      `/api/requests/by-patient/${patientId}/profile`
    );
  } catch (error: unknown) {
    // 404 = paciente sem perfil → ok. Outros erros → propagar para UI mostrar erro.
    if ((error as { status?: number })?.status === 404) return null;
    throw error;
  }
}

/** Resumo estruturado estilo Epic/Cerner. */
export interface PatientClinicalSummaryStructured {
  problemList: string[];
  activeMedications: string[];
  narrativeSummary: string;
  alerts: string[];
}

/**
 * Níveis de confidencialidade de nota clínica (alinhado a CFP 001/2009 e LGPD Art. 11).
 * - `general`: visível a qualquer médico com vínculo ao paciente (padrão).
 * - `specialty_only`: visível apenas a médicos da mesma especialidade do autor.
 * - `author_only`: visível apenas ao autor; equipe vê apenas `summaryForTeam`.
 */
export type NoteSensitivity = 'general' | 'specialty_only' | 'author_only';

/** Nota clínica do médico (FHIR/Epic-inspired). */
export interface DoctorNoteDto {
  id: string;
  noteType: string;
  content: string;
  /** Nível de confidencialidade configurado na criação. */
  sensitivity: NoteSensitivity;
  /** Especialidade do autor no momento da criação. */
  authorSpecialty?: string | null;
  /** Resumo seguro compartilhável com a equipe quando a nota é `author_only`. */
  summaryForTeam?: string | null;
  /**
   * Quando `true`, `content` já é o `summaryForTeam` — o backend mascarou a
   * nota porque o visualizador não tem permissão para ver o texto original.
   */
  isMaskedForViewer: boolean;
  requestId?: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Resposta do resumo clínico (IA ou fallback). */
export interface PatientClinicalSummaryResponse {
  summary: string | null;
  fallback: string | null;
  structured?: PatientClinicalSummaryStructured | null;
  /** Notas clínicas do médico (progress_note, clinical_impression, addendum, observation). */
  doctorNotes?: DoctorNoteDto[];
}

/** Médico obtém resumo narrativo completo do prontuário (IA). Consolida tudo em um texto único. */
export async function getPatientClinicalSummary(
  patientId: string
): Promise<PatientClinicalSummaryResponse> {
  try {
    const data = await apiClient.get<PatientClinicalSummaryResponse>(
      `/api/requests/by-patient/${patientId}/summary`
    );
    return data ?? { summary: null, fallback: null };
  } catch (error: unknown) {
    // 404 = sem dados → retorno vazio. Outros erros → propagar.
    if ((error as { status?: number })?.status === 404) return { summary: null, fallback: null };
    throw error;
  }
}

/** Tipos de nota clínica (FHIR/Epic-inspired). */
export const DOCTOR_NOTE_TYPES = [
  { key: 'progress_note', label: 'Evolução', icon: 'document-text' },
  { key: 'clinical_impression', label: 'Impressão diagnóstica', icon: 'medical' },
  { key: 'addendum', label: 'Complemento', icon: 'add-circle' },
  { key: 'observation', label: 'Observação', icon: 'eye' },
] as const;

/** Médico adiciona nota clínica ao prontuário. */
export async function addDoctorPatientNote(
  patientId: string,
  data: {
    noteType: string;
    content: string;
    requestId?: string | null;
    sensitivity?: NoteSensitivity;
    /** Obrigatório quando `sensitivity === 'author_only'` para manter equipe informada. */
    summaryForTeam?: string | null;
  }
): Promise<DoctorNoteDto> {
  return apiClient.post(`/api/requests/by-patient/${patientId}/doctor-notes`, {
    noteType: data.noteType,
    content: data.content.trim(),
    requestId: data.requestId ?? null,
    sensitivity: data.sensitivity ?? 'general',
    summaryForTeam: data.summaryForTeam?.trim() || null,
  });
}

/** Opções de UI para o seletor de confidencialidade de nota. */
export const NOTE_SENSITIVITY_OPTIONS: readonly {
  key: NoteSensitivity;
  label: string;
  description: string;
  icon: string;
}[] = [
  {
    key: 'general',
    label: 'Geral',
    description: 'Visível a qualquer médico com vínculo ao paciente.',
    icon: 'people',
  },
  {
    key: 'specialty_only',
    label: 'Especialidade',
    description: 'Visível apenas a médicos da sua especialidade.',
    icon: 'medkit',
  },
  {
    key: 'author_only',
    label: 'Só o autor',
    description: 'Só você vê o texto. Informe um resumo curto para a equipe.',
    icon: 'lock-closed',
  },
];
