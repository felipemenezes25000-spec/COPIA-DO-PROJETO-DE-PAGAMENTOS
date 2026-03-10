/**
 * useDailyCall — Orchestrator for Daily.co video calls.
 *
 * Composes:
 * - useDailyJoin: call lifecycle (create, join, events, leave, cleanup)
 * - useQualityMonitor: network quality polling
 *
 * Adds: media control functions (toggleMute, toggleCamera, flipCamera).
 *
 * Re-exports all types from sub-hooks for backward compatibility.
 */

import { useState, useCallback } from 'react';
import { useDailyJoin } from './useDailyJoin';
import { useQualityMonitor } from './useQualityMonitor';

// Re-export types so existing imports from useDailyCall still work
export type { CallState, ParticipantTrack } from './useDailyJoin';
export type { ConnectionQuality } from './useQualityMonitor';

interface UseDailyCallOptions {
  /** URL da sala Daily.co (ex: https://renove.daily.co/consult-xxx) */
  roomUrl: string;
  /** Meeting token gerado pelo backend */
  token: string;
  /** Se o usuário local é o médico. Médico permanece na sala quando paciente sai; só médico encerra. */
  isDoctor?: boolean;
  /** Callback quando o participante remoto entra */
  onRemoteJoined?: () => void;
  /** Callback quando a chamada é encerrada */
  onCallEnded?: (reason?: string) => void;
  /** Callback para erros */
  onError?: (message: string) => void;
}

export function useDailyCall({
  roomUrl,
  token,
  isDoctor = false,
  onRemoteJoined,
  onCallEnded,
  onError,
}: UseDailyCallOptions) {
  // --- Call lifecycle (join, events, leave) ---
  const {
    callRef,
    callState,
    localParticipant,
    remoteParticipant,
    errorMessage,
    join,
    leave,
  } = useDailyJoin({
    roomUrl,
    token,
    isDoctor,
    onRemoteJoined,
    onCallEnded,
    onError,
  });

  // --- Network quality polling (auto-starts when joined) ---
  const { quality } = useQualityMonitor(callRef, callState === 'joined');

  // --- Media controls ---

  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isFrontCamera, setIsFrontCamera] = useState(true);

  const toggleMute = useCallback(async () => {
    const call = callRef.current;
    if (!call) return;
    const newMuted = !isMuted;
    await call.setLocalAudio(!newMuted);
    setIsMuted(newMuted);
  }, [isMuted, callRef]);

  const toggleCamera = useCallback(async () => {
    const call = callRef.current;
    if (!call) return;
    const newOff = !isCameraOff;
    await call.setLocalVideo(!newOff);
    setIsCameraOff(newOff);
  }, [isCameraOff, callRef]);

  const flipCamera = useCallback(async () => {
    const call = callRef.current;
    if (!call) return;

    const newFront = !isFrontCamera;
    setIsFrontCamera(newFront);

    try {
      await call.cycleCamera();
    } catch {
      // Some devices don't support this
    }
  }, [isFrontCamera, callRef]);

  return {
    callState,
    localParticipant,
    remoteParticipant,
    isMuted,
    isCameraOff,
    isFrontCamera,
    quality,
    errorMessage,
    join,
    leave,
    toggleMute,
    toggleCamera,
    flipCamera,
    /** Ref para o DailyCall (para startTranscription, etc). */
    callRef,
  };
}
