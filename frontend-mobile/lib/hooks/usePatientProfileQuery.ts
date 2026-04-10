/**
 * usePatientProfileQuery — busca lazy do perfil cadastral do paciente
 * (idade, CPF mascarado, telefone) para enriquecer o card do Modo Foco
 * e outras telas do médico.
 *
 * O endpoint devolve `null` se o paciente não tem perfil (404 tratado
 * dentro de `getPatientProfileForDoctor`), então nunca lança nesse caso.
 *
 * Cache: 5 min stale / 10 min GC — perfil muda pouco, e os dados são
 * leves (nome, data de nascimento, CPF mascarado, telefone).
 */

import { useQuery } from '@tanstack/react-query';
import { getPatientProfileForDoctor } from '../api-clinical';
import type { PatientProfileForDoctorDto } from '../../types/database';

export function usePatientProfileQuery(patientId: string | null | undefined) {
  return useQuery<PatientProfileForDoctorDto | null>({
    queryKey: ['patient-profile', patientId],
    queryFn: () => getPatientProfileForDoctor(patientId as string),
    enabled: !!patientId,
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    retry: (failureCount, error) => {
      const status = (error as { status?: number })?.status;
      if (status === 401 || status === 403 || status === 404) return false;
      return failureCount < 2;
    },
  });
}
