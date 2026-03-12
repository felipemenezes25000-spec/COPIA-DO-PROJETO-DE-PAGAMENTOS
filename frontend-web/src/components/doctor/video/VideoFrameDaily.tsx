/**
 * VideoFrameDaily — Daily.co via SDK (em vez de iframe puro).
 * Permite acessar transcription-message e enviar ao backend.
 */

import { useCallback, useRef } from 'react';
import { DailyProvider, useCallFrame, useDailyEvent } from '@daily-co/daily-react';
import { Maximize2, Minimize2 } from 'lucide-react';
import { useWebTranscription } from '@/hooks/useWebTranscription';

interface VideoFrameDailyProps {
  roomUrl: string;
  requestId: string | null;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onCallJoined: () => void;
  consultationActive: boolean;
}

function TranscriptionForwarder({
  requestId,
  consultationActive,
}: {
  requestId: string | null;
  consultationActive: boolean;
}) {
  useWebTranscription({ requestId, consultationActive });
  return null;
}

function CallJoinedReporter({ onCallJoined }: { onCallJoined: () => void }) {
  const reportedRef = useRef(false);
  const cb = useCallback(() => {
    if (!reportedRef.current) {
      reportedRef.current = true;
      onCallJoined();
    }
  }, [onCallJoined]);
  useDailyEvent('joined-meeting', cb);
  return null;
}

function VideoFrameInner({
  roomUrl,
  requestId,
  isExpanded,
  onToggleExpand,
  onCallJoined,
  consultationActive,
}: VideoFrameDailyProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const call = useCallFrame({
    parentElRef: containerRef as React.MutableRefObject<HTMLElement>,
    options: { url: roomUrl },
    shouldCreateInstance: () => !!roomUrl,
  });

  return (
    <div className="relative w-full h-full min-h-[200px]">
      <div ref={containerRef} className="w-full h-full min-h-[200px] bg-gray-900" />
      {call && (
        <DailyProvider callObject={call}>
          <CallJoinedReporter onCallJoined={onCallJoined} />
          <TranscriptionForwarder requestId={requestId} consultationActive={consultationActive} />
        </DailyProvider>
      )}
      <button
        onClick={onToggleExpand}
        className="absolute bottom-4 right-4 p-2 rounded-lg bg-gray-900/80 text-gray-400 hover:text-white transition-colors z-10"
        aria-label={isExpanded ? 'Expandir vídeo' : 'Expandir painel'}
      >
        {isExpanded ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
      </button>
    </div>
  );
}

export function VideoFrameDaily(props: VideoFrameDailyProps) {
  return (
    <div className={`relative transition-all duration-300 ${props.isExpanded ? 'w-[40%]' : 'w-[60%]'}`}>
      <VideoFrameInner {...props} />
    </div>
  );
}
