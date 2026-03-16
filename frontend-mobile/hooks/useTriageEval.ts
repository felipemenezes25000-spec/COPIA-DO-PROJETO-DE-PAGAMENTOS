/**
 * useTriageEval - Hook that auto-evaluates triage on focus/change.
 *
 * Usage:
 *   useTriageEval({ context: 'prescription', step, role: 'patient', prescriptionType });
 *
 * PERF fixes:
 * - `input` guardado em ref — o intervalo de 25s não depende mais do objeto inline,
 *   evitando destroy+recreate em todo render do componente pai.
 * - Removido `input` das deps do primeiro useEffect (depKey já captura as mudanças relevantes).
 * - Intervalo de 25s depende só de `evaluate` estável (useCallback no provider).
 */

import { useEffect, useRef } from 'react';
import { useTriageAssistant } from '../contexts/TriageAssistantProvider';
import type { TriageInput } from '../lib/triage/triage.types';

export function useTriageEval(input: TriageInput): void {
  const { evaluate } = useTriageAssistant();
  const prevKeyRef = useRef('');

  // Ref para o input mais recente — permite que o intervalo de 25s acesse
  // o input atual sem precisar dele como dep (evita recreate constante do interval).
  const inputRef = useRef<TriageInput>(input);
  inputRef.current = input;

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

  // Avalia quando o depKey muda (ou evaluate muda por troca de tela)
  // PERF: `input` removido das deps — depKey já cobre todas as mudanças relevantes
  useEffect(() => {
    if (depKey === prevKeyRef.current) return;
    prevKeyRef.current = depKey;
    // Debounce: evita avaliações em cascata quando deps mudam rapidamente
    const t = setTimeout(() => {
      evaluate(inputRef.current);
    }, 150);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depKey, evaluate]);

  // Re-avalia periodicamente (25s) — Dra. Renoveja sempre presente, como pessoa acompanhando.
  // PERF: usa inputRef.current em vez de `input` como dep — evita destroy+recreate do
  // intervalo em todo render (antes o objeto inline mudava referência a cada render).
  useEffect(() => {
    const interval = setInterval(() => {
      evaluate(inputRef.current);
    }, 25_000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [evaluate]);
}
