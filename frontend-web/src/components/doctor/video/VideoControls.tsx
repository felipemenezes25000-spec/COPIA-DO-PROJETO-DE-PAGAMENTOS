/**
 * VideoTopBar + VideoFrame — Split-screen video call controls.
 *
 * VideoTopBar: "AO VIVO" indicator, timer, patient name, action buttons.
 * VideoFrame: Daily.co iframe with expand/minimize toggle.
 *
 * Design spec:
 * - Full-screen dark background (#0B1120)
 * - Top bar: green dot + "AO VIVO", timer "12:34", menu
 * - Bottom controls: 5 circular buttons (48px), end call 56px red
 * - Responsive: phone landscape, tablet, desktop
 *
 * Bug fix #6: Debounced action buttons to prevent double-click issues.
 */

import { useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  User,
  ExternalLink,
  PhoneOff,
  Timer,
  Sparkles,
  Maximize2,
  Minimize2,
} from 'lucide-react';

/** #6: Generic debounce hook for click handlers (300ms default) */
function useDebouncedAction(fn: () => void, delayMs = 300): () => void {
  const lastCallRef = useRef(0);
  return useCallback(() => {
    const now = Date.now();
    if (now - lastCallRef.current < delayMs) return;
    lastCallRef.current = now;
    fn();
  }, [fn, delayMs]);
}

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

/* ── VideoTopBar ── */

interface VideoTopBarProps {
  consultationStarted: boolean;
  timerSeconds: number;
  contractedMinutes: number | null;
  patientName?: string;
  roomUrl: string;
  signalConnected: boolean;
  timeExceeded: boolean;
  timeWarning: boolean;
  onFinish: () => void;
  onBack: () => void;
}

export function VideoTopBar({
  consultationStarted,
  timerSeconds,
  contractedMinutes,
  patientName,
  roomUrl,
  signalConnected,
  timeExceeded,
  timeWarning,
  onFinish,
  onBack,
}: VideoTopBarProps) {
  // #6: Debounce finish/back buttons to prevent double-click
  const debouncedFinish = useDebouncedAction(onFinish);
  const debouncedBack = useDebouncedAction(onBack);

  return (
    <div className="z-30 flex min-h-[48px] shrink-0 items-center justify-between gap-2 border-b border-white/5 bg-[#0B1120]/95 px-3 py-2 backdrop-blur-md">
      {/* Left: Back + Live indicator */}
      <div className="flex min-w-0 items-center gap-2 sm:gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            if (consultationStarted) {
              debouncedFinish();
            } else {
              debouncedBack();
            }
          }}
          className="h-8 w-8 shrink-0 text-gray-400 hover:bg-white/10 hover:text-white sm:h-9 sm:w-9"
          aria-label="Voltar"
        >
          <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
        </Button>

        {/* AO VIVO indicator */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-emerald-500 sm:h-2.5 sm:w-2.5" />
            <span className="whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-emerald-400 sm:text-sm">
              AO VIVO
            </span>
          </div>
          {signalConnected && (
            <Badge
              variant="outline"
              className="hidden gap-1 border-purple-800/60 bg-purple-900/20 py-0.5 text-[10px] text-purple-400 sm:flex"
            >
              <Sparkles className="h-3 w-3" /> IA Ativa
            </Badge>
          )}
        </div>
      </div>

      {/* Center: Timer */}
      <div
        className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 font-mono text-xs sm:gap-2 sm:px-4 sm:py-1.5 sm:text-sm ${
          timeExceeded
            ? 'bg-red-500/20 text-red-400 ring-1 ring-red-500/30'
            : timeWarning
              ? 'bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/30'
              : 'bg-white/5 text-gray-300'
        }`}
      >
        <Timer className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
        <span>{formatTimer(timerSeconds)}</span>
        {contractedMinutes && (
          <span className="hidden text-gray-500 sm:inline">
            / {contractedMinutes}min
          </span>
        )}
      </div>

      {/* Right: Patient + actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        {patientName && (
          <div className="hidden items-center gap-2 text-gray-400 md:flex">
            <User className="h-4 w-4 shrink-0" />
            <span className="max-w-[120px] truncate text-sm lg:max-w-[200px]">
              {patientName}
            </span>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="hidden gap-1.5 text-xs text-gray-400 hover:bg-white/10 hover:text-white lg:flex"
          onClick={() => window.open(roomUrl, '_blank', 'noopener,noreferrer')}
        >
          <ExternalLink className="h-3.5 w-3.5" /> Nova aba
        </Button>
        <Button
          size="sm"
          className="h-8 gap-1.5 bg-red-600 px-3 text-xs text-white hover:bg-red-700 sm:h-9 sm:px-4"
          onClick={debouncedFinish}
        >
          <PhoneOff className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Encerrar</span>
        </Button>
      </div>
    </div>
  );
}

/* ── VideoFrame ── */

interface VideoFrameProps {
  roomUrl: string;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onIframeLoad: () => void;
}

export function VideoFrame({
  roomUrl,
  isExpanded,
  onToggleExpand,
  onIframeLoad,
}: VideoFrameProps) {
  return (
    <div
      className={`relative transition-all duration-300 ${isExpanded ? 'w-[40%]' : 'w-[60%]'}`}
    >
      <iframe
        src={roomUrl}
        allow="camera; microphone; display-capture; autoplay; clipboard-write"
        className="h-full w-full border-0"
        title="Videochamada"
        onLoad={onIframeLoad}
      />
      <button
        onClick={onToggleExpand}
        className="absolute bottom-4 right-4 rounded-lg bg-gray-900/80 p-2 text-gray-400 transition-colors hover:text-white"
        aria-label={isExpanded ? 'Expandir vídeo' : 'Expandir painel'}
      >
        {isExpanded ? (
          <Maximize2 className="h-4 w-4" />
        ) : (
          <Minimize2 className="h-4 w-4" />
        )}
      </button>
    </div>
  );
}
