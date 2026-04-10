/**
 * AIMedicationsPanel — Medicamentos sugeridos em cards, interações cruzadas com alertas.
 * Paridade com mobile AISuggestionView (meds + interações).
 */
import { motion } from 'framer-motion';
import { Pill, FlaskConical, AlertTriangle, Copy } from 'lucide-react';
import { toast } from 'sonner';
import type {
  MedicamentoSugerido,
  ExameSugerido,
  InteracaoCruzada,
  ParsedAnamnesisAi,
} from './ai-panel/types';

function copyToClipboard(text: string, label: string) {
  navigator.clipboard.writeText(text).then(
    () => toast.success(`${label} copiado`),
    () => toast.error('Erro ao copiar')
  );
}

function formatMedLine(med: MedicamentoSugerido): string {
  const parts = [
    med.dose,
    med.via,
    med.frequencia ?? med.posologia,
    med.duracao,
  ].filter(Boolean);
  return parts.join(' • ');
}

export interface AIMedicationsPanelProps {
  data: ParsedAnamnesisAi | null;
}

export function AIMedicationsPanel({ data }: AIMedicationsPanelProps) {
  if (!data) return null;

  const meds: (MedicamentoSugerido | string)[] = Array.isArray(
    data.medicamentos_sugeridos
  )
    ? data.medicamentos_sugeridos.filter(
        (m) =>
          m != null &&
          (typeof m === 'string'
            ? (m as string).trim()
            : (m as MedicamentoSugerido).nome)
      )
    : [];
  const exames: ExameSugerido[] = Array.isArray(data.exames_sugeridos)
    ? data.exames_sugeridos
    : [];
  const interacoes: InteracaoCruzada[] = Array.isArray(data.interacoes_cruzadas)
    ? data.interacoes_cruzadas
    : [];

  const hasContent =
    meds.length > 0 || exames.length > 0 || interacoes.length > 0;

  if (!hasContent) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-800">
          <Pill className="h-7 w-7 text-gray-600" />
        </div>
        <p className="text-sm font-medium text-gray-400">
          Prescrição em construção
        </p>
        <p className="mt-1 max-w-xs text-xs text-gray-600">
          Medicamentos e exames sugeridos aparecerão aqui conforme a IA analisa
          a consulta.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Medicamentos sugeridos */}
      {meds.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Pill className="h-3.5 w-3.5 text-primary" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
              Medicamentos ({meds.length})
            </span>
          </div>
          <div className="space-y-2">
            {meds.map((m, i) => {
              const med =
                typeof m === 'string'
                  ? { nome: m, dose: '', via: '', frequencia: '', duracao: '' }
                  : m;
              const linha = formatMedLine(med);
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="rounded-xl border border-gray-800 bg-gray-800/50 p-3"
                >
                  <div className="flex items-start gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-200">
                        {med.nome}
                      </p>
                      {linha && (
                        <p className="mt-0.5 text-xs text-gray-400">{linha}</p>
                      )}
                      {med.observacoes && (
                        <p className="mt-1 text-xs italic text-gray-500">
                          {med.observacoes}
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      copyToClipboard(
                        `${med.nome}${linha ? '\n' + linha : ''}${med.observacoes ? '\n' + med.observacoes : ''}`,
                        'Medicamento'
                      )
                    }
                    className="mt-2 flex items-center gap-1.5 text-[10px] font-semibold text-primary hover:underline"
                  >
                    <Copy className="h-3 w-3" /> Copiar p/ receita
                  </button>
                </motion.div>
              );
            })}
          </div>
          <p className="text-[10px] italic text-gray-600">
            * Sugestões da IA — decisão final do médico
          </p>
        </div>
      )}

      {/* Interações cruzadas */}
      {interacoes.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-red-400">
              Interações medicamentosas ({interacoes.length})
            </span>
          </div>
          <div className="space-y-2">
            {interacoes.map((ic, i) => {
              const tipo = (ic.tipo ?? ic.gravidade ?? '').toLowerCase();
              const isGrave = tipo === 'grave';
              const medsStr =
                (ic.medicamentos?.length ?? 0) > 0
                  ? ic.medicamentos!.join(' × ')
                  : ic.medicamento_a && ic.medicamento_b
                    ? `${ic.medicamento_a} × ${ic.medicamento_b}`
                    : '—';
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`rounded-xl border p-3 ${
                    isGrave
                      ? 'border-red-800/50 bg-red-950/40'
                      : 'border-amber-800/50 bg-amber-950/30'
                  }`}
                >
                  <div className="mb-1.5 flex items-center gap-2">
                    <AlertTriangle
                      className={`h-3.5 w-3.5 ${isGrave ? 'text-red-400' : 'text-amber-400'}`}
                    />
                    <span
                      className={`text-[9px] font-bold uppercase ${
                        isGrave ? 'text-red-400' : 'text-amber-400'
                      }`}
                    >
                      {isGrave
                        ? 'Grave'
                        : tipo === 'moderada'
                          ? 'Moderada'
                          : 'Leve'}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-gray-200">
                    {medsStr}
                  </p>
                  <p
                    className={`mt-1 text-xs ${isGrave ? 'text-red-300' : 'text-amber-300'}`}
                  >
                    {ic.descricao}
                  </p>
                  {ic.conduta && (
                    <p className="mt-1.5 text-xs font-medium text-primary">
                      {ic.conduta}
                    </p>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Exames sugeridos */}
      {exames.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <FlaskConical className="h-3.5 w-3.5 text-primary" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
              Exames ({exames.length})
            </span>
          </div>
          <div className="space-y-2">
            {exames.map((ex, i) => {
              const exam =
                typeof ex === 'string'
                  ? { nome: ex, justificativa: '', urgencia: '' }
                  : ex;
              const isUrgent =
                (exam.urgencia ?? '').toLowerCase() === 'urgente';
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`rounded-xl border p-3 ${
                    isUrgent
                      ? 'border-red-800/50 bg-red-950/30'
                      : 'border-gray-800 bg-gray-800/50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary">
                      {i + 1}
                    </span>
                    <p className="flex-1 text-sm font-semibold text-gray-200">
                      {exam.nome}
                    </p>
                    {isUrgent && (
                      <span className="rounded bg-red-600 px-1.5 py-0.5 text-[9px] font-bold text-white">
                        URGENTE
                      </span>
                    )}
                  </div>
                  {exam.justificativa && (
                    <p className="mt-1 pl-7 text-xs text-gray-400">
                      {exam.justificativa}
                    </p>
                  )}
                </motion.div>
              );
            })}
          </div>
          <p className="text-[10px] italic text-gray-600">
            * Sugestões da IA — decisão final do médico
          </p>
        </div>
      )}
    </div>
  );
}
