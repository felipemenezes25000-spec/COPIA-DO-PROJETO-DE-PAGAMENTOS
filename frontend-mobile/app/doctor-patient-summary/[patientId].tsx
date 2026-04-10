/**
 * Redirect — doctor-patient-summary agora é parte do prontuário unificado.
 *
 * Redireciona automaticamente para doctor-patient/[patientId]
 * para manter compatibilidade com links existentes.
 */

import { useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';

export default function DoctorPatientSummaryRedirect() {
  const { patientId } = useLocalSearchParams<{ patientId: string }>();
  const router = useRouter();
  const id = Array.isArray(patientId) ? patientId[0] : patientId ?? '';

  useEffect(() => {
    router.replace(`/doctor-patient/${id}` as never);
  }, [id, router]);

  return null;
}
