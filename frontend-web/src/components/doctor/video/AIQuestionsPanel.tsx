/**
 * AIQuestionsPanel — Perguntas sugeridas como checklist, red flags com destaque.
 * Paridade com mobile AIMetadataPanel (perguntas tab).
 */
import { useState } from 'react';
import { motion } from 'framer-motion';
import { HelpCircle, AlertTriangle, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import type { ParsedAnamnesisAi } from './ai-panel/types';

function copyToClipboard(text: string, label: string) {
  navigator.clipboard.writeText(text).then(
    () => toast.success(`${label} copiado`),
    () => toast.error('Erro ao copiar')
  );
}

export interface AIQuestionsPanelProps {
  data: ParsedAnamnesisAi | null;
}

export function AIQuestionsPanel({ data }: AIQuestionsPanelProps) {
  const [checked, setChecked] = useState<Set<number>>(new Set());

  if (!data) return null;

  const perguntas: { text: string; detail?: string }[] = Array.isArray(
    data.perguntas_sugeridas
  )
    ? data.perguntas_sugeridas
        .map((p: unknown) => {
          if (typeof p === 'string' && p.trim()) return { text: p.trim() };
          if (p && typeof p === 'object' && 'pergunta' in p) {
            const obj = p as Record<string, unknown>;
            const text = String(obj.pergunta ?? '').trim();
            if (!text) return null;
            const extras = Object.entries(obj)
              .filter(([k]) => k !== 'pergunta')
              .map(([k, v]) => `${k}: ${v}`)
              .join(' | ');
            return { text, detail: extras || undefined };
          }
          return null;
        })
        .filter((p): p is { text: string; detail?: string } => p !== null)
    : [];
  const redFlags: string[] = Array.isArray(data.red_flags)
    ? data.red_flags.filter((r) => typeof r === 'string' && r.trim())
    : [];

  const hasContent = perguntas.length > 0 || redFlags.length > 0;

  if (!hasContent) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-800">
          <HelpCircle className="h-7 w-7 text-gray-600" />
        </div>
        <p className="text-sm font-medium text-gray-400">
          Perguntas sendo geradas...
        </p>
        <p className="mt-1 max-w-xs text-xs text-gray-600">
          Perguntas priorizadas por impacto clínico serão geradas assim que
          houver dados do transcript.
        </p>
      </div>
    );
  }

  const toggleChecked = (i: number) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      {/* Red flags */}
      {redFlags.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-red-400">
              Sinais de alerta
            </span>
          </div>
          <div className="space-y-2">
            {redFlags.map((flag, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-start gap-2 rounded-xl border border-red-800/50 bg-red-950/40 p-3"
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                <p className="flex-1 text-sm text-red-200">{flag}</p>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Perguntas sugeridas */}
      {perguntas.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-3.5 w-3.5 text-primary" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
              Pergunte ao paciente
            </span>
          </div>
          <p className="mb-2 text-[10px] italic text-gray-500">
            Priorizadas por impacto clínico — a resposta refina o diagnóstico
          </p>
          <div className="space-y-2">
            {perguntas.map((p, i) => {
              const isChecked = checked.has(i);
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="rounded-xl border border-gray-800 bg-gray-800/50 p-3"
                >
                  <div className="flex items-start gap-2">
                    <button
                      type="button"
                      onClick={() => toggleChecked(i)}
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                        isChecked
                          ? 'border-primary bg-primary'
                          : 'border-gray-600 hover:border-gray-500'
                      }`}
                      aria-label={
                        isChecked ? 'Desmarcar pergunta' : 'Marcar como feita'
                      }
                      aria-pressed={isChecked}
                    >
                      {isChecked && (
                        <Check className="h-3 w-3 text-primary-foreground" />
                      )}
                    </button>
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-sm font-medium italic ${isChecked ? 'text-gray-500 line-through' : 'text-gray-200'}`}
                      >
                        &quot;{p.text}&quot;
                      </p>
                      {p.detail && (
                        <p className="mt-0.5 text-xs text-gray-500">
                          {p.detail}
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(p.text, 'Pergunta')}
                    className="mt-2 flex items-center gap-1.5 text-[10px] font-semibold text-primary hover:underline"
                  >
                    <Copy className="h-3 w-3" /> Copiar
                  </button>
                </motion.div>
              );
            })}
          </div>
          <p className="text-[10px] italic text-gray-600">
            Sugestões baseadas nos dados disponíveis. O médico decide o que
            perguntar e quando.
          </p>
        </div>
      )}
    </div>
  );
}
