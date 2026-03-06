/**
 * useTriageEval — Hook that auto-evaluates triage on focus/change.
 *
 * Usage:
 *   useTriageEval({ context: 'prescription', step, role: 'patient', prescriptionType });
 *
 * Auto-clears on unfocus. Re-evaluates when deps change.
 */

import { useEffect, useRef } from 'react';
import { useTriageAssistant } from '../contexts/TriageAssistantProvider';
import type { TriageInput } from '../lib/triage/triage.types';

export function useTriageEval(input: TriageInput): void {
  const { evaluate } = useTriageAssistant();
  const prevKeyRef = useRef('');

  // Chave estável para re-avaliar quando contexto relevante mudar (step, tipo, status, conduta, fotos, etc.)
  const depKey = [
    input.context,
    input.step,
    input.requestType,
    input.prescriptionType,
    input.examType,
    input.status,
    input.aiRiskLevel,
    input.aiReadabilityOk == null ? '' : String(input.aiReadabilityOk),
    input.aiMessageToUser ? '1' : '0',
    input.imagesCount ?? 0,
    (input.exams?.length ?? 0),
    (input.recentMedications?.length ?? 0),
    input.doctorConductNotes ? '1' : '0',
    (input.symptoms?.length ?? 0),
    input.recentPrescriptionCount ?? '',
    input.recentExamCount ?? '',
    input.lastConsultationDays ?? '',
    input.lastPrescriptionDaysAgo ?? '',
    input.lastExamDaysAgo ?? '',
    input.patientAge ?? '',
  ].join(':');

  useEffect(() => {
    if (depKey === prevKeyRef.current) return;
    prevKeyRef.current = depKey;
    // Debounce: evita avaliações em cascata quando deps mudam rapidamente
    const t = setTimeout(() => {
      evaluate(input);
    }, 150);
    return () => clearTimeout(t);
  }, [depKey, evaluate, input]);

  // Re-avalia periodicamente (25s) — Dra. Renoveja sempre presente, como pessoa acompanhando
  useEffect(() => {
    const interval = setInterval(() => {
      evaluate(input);
    }, 25_000);
    return () => clearInterval(interval);
  }, [evaluate, input]);

}
