/**
 * TranscriptionPanel — Real-time transcription display for video consultations.
 *
 * Shows live transcript with [Médico]/[Paciente] labels, chat-like bubbles,
 * and empty state with Daily.co transcription info + CFM compliance notice.
 *
 * Design spec:
 * - Dark bg matching AI panel (#15202E)
 * - Purple accent (#8B5CF6) for doctor messages
 * - Responsive text sizes and padding
 */

import { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Mic, Shield } from 'lucide-react';

interface TranscriptionPanelProps {
  transcript: string;
}

export function TranscriptionPanel({ transcript }: TranscriptionPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new transcript lines arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript]);

  if (transcript.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-4 text-center">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1E293B] sm:mb-4 sm:h-16 sm:w-16">
          <Mic className="h-6 w-6 text-gray-600 sm:h-8 sm:w-8" />
        </div>
        <p className="text-sm font-medium text-gray-400">
          Aguardando transcrição
        </p>
        <p className="mt-1 max-w-xs text-xs text-gray-600">
          A transcrição em tempo real aparecerá aqui conforme a conversa
          acontece. Powered by Daily.co (transcrição nativa).
        </p>
        <div className="mt-4 flex items-center gap-2 rounded-full bg-[#1E293B] px-3 py-1.5 text-[10px] text-gray-500">
          <Shield className="h-3 w-3" />
          Resolução CFM 2.454/2026 — IA como auxílio
        </div>
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="space-y-2 overflow-auto sm:space-y-3">
      {transcript
        .split('\n')
        .filter(Boolean)
        .map((line, i) => {
          const isMedico = line.startsWith('[Médico]');
          const isPaciente = line.startsWith('[Paciente]');
          const text = line.replace(/^\[(Médico|Paciente)\]\s*/, '');
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={`flex gap-2 sm:gap-3 ${isMedico ? 'justify-end' : ''}`}
            >
              <div
                className={`max-w-[90%] rounded-xl p-2.5 text-xs sm:max-w-[85%] sm:p-3 sm:text-sm ${
                  isMedico
                    ? 'ml-auto rounded-br-sm bg-[#8B5CF6]/20 text-purple-100'
                    : 'rounded-bl-sm bg-[#1E293B] text-gray-300'
                }`}
              >
                <p
                  className={`mb-0.5 text-[9px] font-bold uppercase tracking-wider sm:mb-1 sm:text-[10px] ${
                    isMedico
                      ? 'text-[#8B5CF6]'
                      : isPaciente
                        ? 'text-emerald-400'
                        : 'text-gray-500'
                  }`}
                >
                  {isMedico ? 'Médico' : isPaciente ? 'Paciente' : 'Sistema'}
                </p>
                <p className="leading-relaxed">{text}</p>
              </div>
            </motion.div>
          );
        })}
    </div>
  );
}
