/**
 * doctor-api-clinical.ts — Patient data, clinical summary, and doctor notes.
 */

import { authFetch } from './doctor-api-auth';
import type {
  PatientProfile,
  PatientClinicalSummaryResponse,
  DoctorNote,
  DoctorNoteDto,
  MedicalRequest,
} from './doctorApi';

// ── Patients ──

export async function getPatientProfile(
  patientId: string
): Promise<PatientProfile> {
  const res = await authFetch(`/api/requests/by-patient/${patientId}/profile`);
  if (!res.ok) throw new Error('Erro ao buscar paciente');
  return res.json();
}

export async function getPatientRequests(
  patientId: string
): Promise<MedicalRequest[]> {
  const res = await authFetch(`/api/requests/by-patient/${patientId}`);
  if (!res.ok) throw new Error('Erro ao buscar histórico');
  const data = await res.json();
  const list = Array.isArray(data) ? data : (data?.items ?? data?.data ?? []);
  // Normalizar: backend usa requestType, frontend usa type
  return list.map((r: Record<string, unknown>) => ({
    ...r,
    type: (r.type as string) || (r.requestType as string) || '',
    patientName: (r.patientName as string) ?? '',
  })) as MedicalRequest[];
}

export async function getPatientClinicalSummary(
  patientId: string
): Promise<PatientClinicalSummaryResponse> {
  const res = await authFetch(`/api/requests/by-patient/${patientId}/summary`);
  if (!res.ok) throw new Error('Erro ao buscar resumo clínico');
  return res.json();
}

// ── Doctor Notes ──

export async function addDoctorNote(
  patientId: string,
  note: DoctorNote
): Promise<DoctorNoteDto> {
  const res = await authFetch(
    `/api/requests/by-patient/${patientId}/doctor-notes`,
    {
      method: 'POST',
      body: JSON.stringify(note),
    }
  );
  if (!res.ok) throw new Error('Erro ao adicionar nota');
  return res.json();
}
