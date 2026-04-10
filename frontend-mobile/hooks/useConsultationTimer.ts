/**
 * useConsultationTimer — Server-synced consultation countdown timer.
 *
 * Computes elapsed seconds from consultationStartedAt (server timestamp).
 * When contractedMinutes is provided, also computes remaining seconds and
 * triggers onAutoFinish when time expires.
 *
 * Warning thresholds:
 * - < 2 minutes remaining → warning state
 * - 0 seconds remaining → auto-finish triggered
 */

import { useState, useEffect, useRef } from 'react';

export interface ConsultationTimerReturn {
  callSeconds: number;
  setCallSeconds: React.Dispatch<React.SetStateAction<number>>;
  /** Remaining seconds based on contractedMinutes. null when no limit. */
  remainingSeconds: number | null;
  /** True when < 2 minutes remaining. */
  isWarning: boolean;
  /** True when time has expired (0 or less remaining). */
  isExpired: boolean;
}

/** Threshold in seconds below which the warning state activates. */
const WARNING_THRESHOLD_SECONDS = 120;

export function useConsultationTimer(
  consultationStartedAt: string | null,
  contractedMinutes: number | null,
  onAutoFinish: () => void,
  /** Pass false when consultation has already been finished to prevent stale updates. */
  isActive: boolean = true,
): ConsultationTimerReturn {
  const [callSeconds, setCallSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoFinishCalledRef = useRef(false);

  // Server-synced timer: compute elapsed seconds from backend timestamp
  useEffect(() => {
    if (!consultationStartedAt || !isActive) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }
    autoFinishCalledRef.current = false;
    const update = () => {
      const elapsed = Math.floor((Date.now() - new Date(consultationStartedAt).getTime()) / 1000);
      setCallSeconds(Math.max(0, elapsed));
    };
    update();
    timerRef.current = setInterval(update, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [consultationStartedAt, isActive]);

  // Compute remaining seconds
  const totalContractedSeconds = contractedMinutes != null ? contractedMinutes * 60 : null;
  const remainingSeconds = totalContractedSeconds != null
    ? Math.max(0, totalContractedSeconds - callSeconds)
    : null;
  const isWarning = remainingSeconds != null && remainingSeconds <= WARNING_THRESHOLD_SECONDS && remainingSeconds > 0;
  const isExpired = remainingSeconds != null && remainingSeconds <= 0 && callSeconds > 0;

  // Auto-finish when time expires
  useEffect(() => {
    if (isExpired && !autoFinishCalledRef.current && isActive) {
      autoFinishCalledRef.current = true;
      onAutoFinish();
    }
  }, [isExpired, isActive, onAutoFinish]);

  return { callSeconds, setCallSeconds, remainingSeconds, isWarning, isExpired };
}
