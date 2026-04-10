/**
 * AIMetadataPanel — Tabs Perguntas e Evidências.
 */
import {
  HelpCircle,
  AlertCircle,
  Flag,
  GitBranch,
  TrendingUp,
  Copy,
  CheckCircle2,
} from 'lucide-react';
import type { PerguntaSugerida } from './types';
interface AIMetadataPanelProps {
  activeTab: 'perguntas';
  perguntasSugeridas: PerguntaSugerida[];
  lacunasAnamnese: string[];
  copyToClipboard: (text: string, label: string) => void;
}

export function AIMetadataPanel({
  activeTab,
  perguntasSugeridas,
  lacunasAnamnese,
  copyToClipboard,
}: AIMetadataPanelProps) {
  if (activeTab === 'perguntas') {
    return (
      <>
        {perguntasSugeridas.length > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <HelpCircle className="h-3.5 w-3.5 text-primary" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                Pergunte ao Paciente
              </span>
              <span className="rounded-md bg-primary/20 px-2 py-0.5 text-[9px] font-bold text-primary">
                IA
              </span>
            </div>
            <p className="mb-2 text-xs italic text-gray-500">
              Priorizadas por impacto clínico — a resposta de cada uma refina o
              diagnóstico
            </p>
            {perguntasSugeridas.map((p, i) => {
              const prioColor =
                p.prioridade === 'alta'
                  ? 'text-primary'
                  : p.prioridade === 'media'
                    ? 'text-primary/80'
                    : 'text-gray-500';
              const prioLabel =
                p.prioridade === 'alta'
                  ? 'CRÍTICA'
                  : p.prioridade === 'media'
                    ? 'IMPORTANTE'
                    : 'COMPLEMENTAR';
              return (
                <div
                  key={i}
                  className="space-y-2 rounded-xl border border-gray-700/50 bg-gray-800/30 p-3"
                >
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary">
                      {i + 1}
                    </span>
                    <span
                      className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-[9px] font-bold ${prioColor}`}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      {prioLabel}
                    </span>
                  </div>
                  <p className="text-sm font-semibold italic text-gray-200">
                    &quot;{p.pergunta}&quot;
                  </p>
                  {p.objetivo && (
                    <div className="flex items-start gap-2 pl-1">
                      <Flag className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
                      <p className="text-xs text-primary/90">{p.objetivo}</p>
                    </div>
                  )}
                  {p.hipoteses_afetadas && (
                    <div className="rounded-lg bg-primary/10 p-2 pl-1">
                      <div className="flex items-start gap-2">
                        <GitBranch className="mt-0.5 h-3 w-3 shrink-0 text-gray-400" />
                        <p className="text-xs text-gray-400">
                          {p.hipoteses_afetadas}
                        </p>
                      </div>
                    </div>
                  )}
                  {p.impacto_na_conduta && (
                    <div className="rounded-lg bg-primary/10 p-2 pl-1">
                      <div className="flex items-start gap-2">
                        <TrendingUp className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
                        <p className="text-xs text-primary/90">
                          {p.impacto_na_conduta}
                        </p>
                      </div>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => copyToClipboard(p.pergunta, 'Pergunta')}
                    className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                  >
                    <Copy className="h-3 w-3" /> Copiar
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <HelpCircle className="mb-4 h-8 w-8 text-amber-500" />
            <p className="text-sm font-bold text-gray-400">
              Perguntas sendo geradas...
            </p>
            <p className="mt-1 max-w-xs text-xs text-gray-500">
              Perguntas priorizadas por impacto clínico serão geradas assim que
              houver dados do transcript. Comece a conversa com o paciente para
              gerar perguntas sugeridas.
            </p>
          </div>
        )}

        {lacunasAnamnese.length > 0 && (
          <div className="mt-4 space-y-2 rounded-xl border border-amber-800/50 bg-amber-950/20 p-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-3.5 w-3.5 text-amber-400" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                Informações Faltando
              </span>
            </div>
            {lacunasAnamnese.map((l, i) => (
              <div key={i} className="flex items-start gap-2 pl-1">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                <span className="text-xs text-amber-400">{l}</span>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 flex items-start gap-2 rounded-lg bg-gray-800/50 p-2">
          <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-gray-500" />
          <p className="text-[10px] text-gray-500">
            Sugestões baseadas nos dados disponíveis. O médico decide o que
            perguntar e quando.
          </p>
        </div>
      </>
    );
  }

  return null;
}
