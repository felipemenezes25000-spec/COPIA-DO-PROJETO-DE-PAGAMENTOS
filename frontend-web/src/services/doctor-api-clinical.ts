/**
 * doctor-api-clinical.ts — Patient data, clinical summary, and doctor notes.
 */

import { authFetch } from './doctor-api-auth';
import type { PatientProfile, PatientClinicalSummaryResponse, DoctorNote, DoctorNoteDto } from './doctorApi';

// ── Patients ──

export async function getPatientProfile(patientId: string): Promise<PatientProfile> {
  const res = await authFetch(`/api/requests/by-patient/${patientId}/profile`);
  if (!res.ok) throw new Error('Erro ao buscar paciente');
  return res.json();
}

export async function getPatientRequests(patientId: string) {
  const res = await authFetch(`/api/requests/by-patient/${patientId}`);
  if (!res.ok) throw new Error('Erro ao buscar histórico');
  return res.json();
}

export async function getPatientClinicalSummary(patientId: string): Promise<PatientClinicalSummaryResponse> {
  const res = await authFetch(`/api/requests/by-patient/${patientId}/summary`);
  if (!res.ok) throw new Error('Erro ao buscar resumo clínico');
  return res.json();
}

// ── Doctor Notes ──

export async function addDoctorNote(patientId: string, note: DoctorNote): Promise<DoctorNoteDto> {
  const res = await authFetch(`/api/requests/by-patient/${patientId}/doctor-notes`, {
    method: 'POST',
    body: JSON.stringify(note),
  });
  if (!res.ok) throw new Error('Erro ao adicionar nota');
  return res.json();
}
