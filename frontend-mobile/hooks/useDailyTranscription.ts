/**
 * useDailyTranscription — Usa transcrição nativa do Daily.co (ambos os participantes).
 * O médico inicia a transcrição; eventos transcription-message chegam com texto e speaker.
 * Apenas o médico envia ao backend (evita duplicatas).
 *
 * Mitigação ponto 3: inicia transcrição assim que médico entra na chamada (callJoined),
 * sem esperar consultationActive. Envia ao backend só quando consultationActive (status InConsultation/Paid).
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { MutableRefObject } from 'react';
import type { DailyCall } from '@daily-co/react-native-daily-js';
import { transcribeTextChunk } from '../lib/api';

interface UseDailyTranscriptionOptions {
  /** Ref do DailyCall (de useDailyCall) */
  callRef: MutableRefObject<DailyCall | null>;
  /** ID do request da consulta */
  requestId: string | null;
  /** Se o usuário local é o médico */
  isDoctor: boolean;
  /** session_id do participante local (para mapear speaker) */
  localSessionId: string | null;
  /** Se o médico já está na chamada (callState === 'joined') — inicia transcrição cedo para não perder áudio */
  callJoined: boolean;
  /** Se a consulta já iniciou (status InConsultation/Paid) — backend só aceita envio quando true */
  consultationActive: boolean;
  /** Callback quando envio ao backend falha (Ponto 5: feedback de erro) */
  onSendError?: (message: string) => void;
  /** Callback quando envio ao backend tem sucesso (limpa erro anterior) */
  onSendSuccess?: () => void;
}

export function useDailyTranscription({
  callRef,
  requestId,
  isDoctor,
  localSessionId,
  callJoined,
  consultationActive,
  onSendError,
  onSendSuccess,
}: UseDailyTranscriptionOptions): { isTranscribing: boolean } {
  const startedRef = useRef(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const consultationActiveRef = useRef(consultationActive);
  const localSessionIdRef = useRef(localSessionId);
  const onSendErrorRef = useRef(onSendError);
  const onSendSuccessRef = useRef(onSendSuccess);
  consultationActiveRef.current = consultationActive;
  localSessionIdRef.current = localSessionId;
  onSendErrorRef.current = onSendError;
  onSendSuccessRef.current = onSendSuccess;

  const sendToBackend = useCallback(
    async (text: string, speaker: 'medico' | 'paciente', startTimeSeconds?: number) => {
      if (!requestId || !text?.trim()) return;
      if (!consultationActiveRef.current) return; // Backend rejeita se status não for InConsultation/Paid
      try {
        await transcribeTextChunk(requestId, text.trim(), speaker, startTimeSeconds);
        onSendSuccessRef.current?.();
      } catch (e: unknown) {
        const err = e as { message?: string };
        const msg = typeof err?.message === 'string' ? err.message : 'Erro ao enviar transcrição';
        if (__DEV__) console.warn('[DailyTranscription] Erro ao enviar:', e);
        onSendErrorRef.current?.(msg);
      }
    },
    [requestId]
  );

  useEffect(() => {
    const call = callRef.current;
    if (!call || !requestId) return;
    // Médico: precisa estar na chamada. Paciente: só escuta eventos.
    if (isDoctor && !callJoined) return;

    const handleMessage = (event: any) => {
      const text = event?.text ?? event?.message?.text ?? '';
      if (!text?.trim()) return;

      // Deepgram/Daily: start (segundos desde início da transcrição), start_time, ou message.start
      const startTimeSeconds =
        event?.start ??
        event?.start_time ??
        event?.message?.start ??
        event?.message?.start_time;

      // Daily.co pode usar participantId, participant_id, session_id ou participant.session_id
      const eventParticipantId =
        event?.participantId ??
        event?.participant_id ??
        event?.session_id ??
        event?.participant?.session_id ??
        '';

      // Resolve local session_id: prioridade call.participants() (sempre atual) > prop
      const participants = call.participants?.();
      const resolvedLocalId =
        participants?.local?.session_id ?? localSessionIdRef.current ?? null;

      if (!resolvedLocalId) {
        if (__DEV__) console.warn('[DailyTranscription] localSessionId ainda não disponível — ignorando chunk');
        return;
      }

      // Sem participantId no evento, não dá para saber quem falou — não enviar (evita misturar)
      if (!eventParticipantId) {
        if (__DEV__) console.warn('[DailyTranscription] Evento sem participantId — ignorando chunk');
        return;
      }

      const isLocal = eventParticipantId === resolvedLocalId;

      const speaker: 'medico' | 'paciente' = isDoctor
        ? (isLocal ? 'medico' : 'paciente')
        : (isLocal ? 'paciente' : 'medico');

      if (isDoctor) sendToBackend(text, speaker, typeof startTimeSeconds === 'number' ? startTimeSeconds : undefined);
    };

    const startTranscription = async () => {
      if (startedRef.current) return;
      try {
        await call.startTranscription?.({ language: 'pt-BR' });
        startedRef.current = true;
        setIsTranscribing(true);
        if (__DEV__) console.warn('[DailyTranscription] Transcrição iniciada');
      } catch (e) {
        if (__DEV__) console.warn('[DailyTranscription] Falha ao iniciar:', e);
      }
    };

    const handleStarted = () => setIsTranscribing(true);
    const handleStopped = () => {
      setIsTranscribing(false);
      startedRef.current = false;
    };

    if (isDoctor && callJoined) {
      startTranscription();
    }

    call.on?.('transcription-message' as any, handleMessage);
    call.on?.('transcription-started' as any, handleStarted);
    call.on?.('transcription-stopped' as any, handleStopped);

    return () => {
      call.off?.('transcription-message' as any, handleMessage);
      call.off?.('transcription-started' as any, handleStarted);
      call.off?.('transcription-stopped' as any, handleStopped);
    };
  }, [
    callRef,
    requestId,
    isDoctor,
    localSessionId,
    callJoined,
    sendToBackend,
  ]);

  return { isTranscribing };
}
