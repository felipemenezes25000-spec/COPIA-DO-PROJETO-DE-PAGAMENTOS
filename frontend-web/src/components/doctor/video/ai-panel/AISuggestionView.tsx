/**
 * AISuggestionView — Anamnese, lacunas, exame físico, medicamentos,
 * interações, exames, orientações ao paciente.
 */
import {
  FileText,
  AlertCircle,
  Activity,
  Pill,
  Clipboard,
  FlaskConical,
  Heart,
  Flag,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { MedSugerido, ExameSugerido, InteracaoCruzada } from './types';
import { ANA_FIELDS, parseMed, parseExam } from './types';

interface AISuggestionViewProps {
  anamnesis: Record<string, unknown> | null;
  hasAna: boolean;
  meds: MedSugerido[];
  exames: ExameSugerido[];
  interacoesCruzadas: InteracaoCruzada[];
  expandedMeds: Set<number>;
  toggleMedExpand: (idx: number) => void;
  lacunasAnamnese: string[];
  exameFisicoDirigido: string;
  orientacoesPaciente: string[];
  criteriosRetorno: string[];
  copyToClipboard: (text: string, label: string) => void;
}

export function AISuggestionView({
  anamnesis,
  hasAna,
  meds,
  exames,
  interacoesCruzadas,
  expandedMeds,
  toggleMedExpand,
  lacunasAnamnese,
  exameFisicoDirigido,
  orientacoesPaciente,
  criteriosRetorno,
  copyToClipboard,
}: AISuggestionViewProps) {
  return (
    <>
      {/* Anamnese */}
      {hasAna && anamnesis && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <FileText className="h-3.5 w-3.5 text-primary" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Anamnese
            </span>
            <span className="rounded-md bg-primary/20 px-2 py-0.5 text-[9px] font-bold text-primary">
              IA
            </span>
          </div>
          {ANA_FIELDS.map(({ key, label }) => {
            const v = anamnesis[key];
            const isEmpty =
              !v ||
              (typeof v === 'string' && !(v as string).trim()) ||
              (Array.isArray(v) &&
                (v as unknown[]).every(
                  (x) => !x || (typeof x === 'string' && !(x as string).trim())
                ));
            const d = isEmpty
              ? null
              : Array.isArray(v)
                ? (v as unknown[])
                    .map((x) => (typeof x === 'string' ? x : String(x)))
                    .filter(Boolean)
                    .join(', ')
                : String(v).trim();
            const displayText =
              d && d.length > 0 ? d : '— Aguardando transcrição';
            const isPlaceholder = !d || d.length === 0;
            const isAlert = key === 'alergias';
            return (
              <div key={key} className="space-y-0.5 pl-1">
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider ${isAlert ? 'text-red-400' : 'text-gray-500'}`}
                >
                  {label}
                </span>
                <p
                  className={`text-xs text-gray-400 ${isPlaceholder ? 'italic' : ''}`}
                >
                  {displayText}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Lacunas */}
      {lacunasAnamnese.length > 0 && (
        <div className="space-y-2">
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

      {/* Exame físico dirigido */}
      {exameFisicoDirigido && (
        <div className="space-y-2 rounded-xl border border-primary/20 bg-primary/5 p-3">
          <div className="flex items-center gap-2">
            <Activity className="h-3.5 w-3.5 text-primary" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
              Exame Físico Dirigido
            </span>
          </div>
          <p className="text-xs leading-relaxed text-gray-400">
            {exameFisicoDirigido}
          </p>
        </div>
      )}

      {/* Medicamentos */}
      {meds.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Pill className="h-3.5 w-3.5 text-primary" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
              Medicamentos ({meds.length})
            </span>
          </div>
          {meds.map((m, i) => {
            const med = parseMed(m);
            const parts = [
              med.dose,
              med.via,
              med.posologia,
              med.duracao,
            ].filter(Boolean);
            const linha = parts.length > 0 ? parts.join(' • ') : '';
            const isExpanded = expandedMeds.has(i);
            const hasDetails =
              med.classe_terapeutica ||
              med.mecanismo_acao ||
              med.contraindicacoes ||
              med.interacoes ||
              med.ajuste_renal ||
              med.ajuste_hepatico ||
              med.alerta_faixa_etaria ||
              med.alternativa;
            return (
              <div
                key={i}
                className={`space-y-2 rounded-xl border border-gray-700/50 bg-gray-800/30 p-3 ${
                  hasDetails ? 'cursor-pointer' : ''
                }`}
                onClick={() => hasDetails && toggleMedExpand(i)}
                onKeyDown={(e) =>
                  hasDetails &&
                  (e.key === 'Enter' || e.key === ' ') &&
                  toggleMedExpand(i)
                }
                role={hasDetails ? 'button' : undefined}
                tabIndex={hasDetails ? 0 : undefined}
              >
                <div className="flex items-start gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-gray-200">
                      {med.nome}
                    </p>
                    {linha && <p className="text-xs text-gray-400">{linha}</p>}
                  </div>
                  {hasDetails &&
                    (isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-gray-500" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-gray-500" />
                    ))}
                </div>
                {med.indicacao && (
                  <p className="pl-7 text-xs text-gray-400">
                    ↳ {med.indicacao}
                  </p>
                )}
                {med.melhora_esperada && (
                  <p className="pl-7 text-xs font-semibold text-emerald-400">
                    ✨ {med.melhora_esperada}
                  </p>
                )}
                {isExpanded && (
                  <div className="space-y-1 border-t border-gray-700/50 pl-7 pt-2">
                    {med.classe_terapeutica && (
                      <p className="text-xs text-gray-400">
                        Classe: {med.classe_terapeutica}
                      </p>
                    )}
                    {med.mecanismo_acao && (
                      <p className="text-xs text-primary">
                        Mecanismo: {med.mecanismo_acao}
                      </p>
                    )}
                    {med.contraindicacoes && (
                      <p className="text-xs text-red-400">
                        CI: {med.contraindicacoes}
                      </p>
                    )}
                    {med.interacoes && (
                      <p className="text-xs text-amber-400">
                        Interações: {med.interacoes}
                      </p>
                    )}
                    {med.ajuste_renal && (
                      <p className="text-xs text-primary">
                        Ajuste renal: {med.ajuste_renal}
                      </p>
                    )}
                    {med.ajuste_hepatico && (
                      <p className="text-xs text-primary">
                        Ajuste hepático: {med.ajuste_hepatico}
                      </p>
                    )}
                    {med.alerta_faixa_etaria && (
                      <p className="text-xs text-amber-400">
                        {med.alerta_faixa_etaria}
                      </p>
                    )}
                    {med.alternativa && (
                      <p className="text-xs text-primary">
                        Alt: {med.alternativa}
                      </p>
                    )}
                  </div>
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    copyToClipboard(
                      `${med.nome}${linha ? '\n' + linha : ''}${med.indicacao ? '\nIndicação: ' + med.indicacao : ''}`,
                      'Medicamento'
                    );
                  }}
                  className="flex items-center gap-1 pl-7 text-xs font-semibold text-primary hover:underline"
                >
                  <Clipboard className="h-3 w-3" /> Copiar p/ receita
                </button>
              </div>
            );
          })}
          <p className="text-[10px] italic text-gray-600">
            Sugestões baseadas em protocolos clínicos • Interações verificadas •
            Decisão final do médico prescritor
          </p>
        </div>
      )}

      {/* Interações medicamentosas */}
      {interacoesCruzadas.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-3.5 w-3.5 text-red-400" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-red-400">
              Interações Medicamentosas ({interacoesCruzadas.length})
            </span>
          </div>
          {interacoesCruzadas.map((ic, i) => {
            const isGrave = ic.tipo === 'grave';
            const tipoLabel =
              ic.tipo === 'grave'
                ? 'GRAVE'
                : ic.tipo === 'moderada'
                  ? 'MODERADA'
                  : 'LEVE';
            return (
              <div
                key={i}
                className={`rounded-xl border p-3 ${
                  isGrave
                    ? 'border-red-800/50 bg-red-950/30'
                    : 'border-amber-800/50 bg-amber-950/30'
                }`}
              >
                <div className="mb-1 flex items-center gap-2">
                  <AlertCircle
                    className={`h-3.5 w-3.5 ${isGrave ? 'text-red-400' : 'text-amber-400'}`}
                  />
                  <span
                    className={`text-[9px] font-bold uppercase tracking-wider ${isGrave ? 'text-red-400' : 'text-amber-400'}`}
                  >
                    {tipoLabel}
                  </span>
                </div>
                <p className="text-sm font-bold text-gray-200">
                  {ic.medicamento_a} × {ic.medicamento_b}
                </p>
                <p className="text-xs text-gray-400">{ic.descricao}</p>
                {ic.conduta && (
                  <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-primary">
                    → {ic.conduta}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Exames */}
      {exames.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <FlaskConical className="h-3.5 w-3.5 text-primary" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
              Exames ({exames.length})
            </span>
          </div>
          {exames.map((ex, i) => {
            const exam = parseExam(ex);
            const isUrgent = exam.urgencia === 'urgente';
            return (
              <div
                key={i}
                className={`rounded-xl border p-3 ${
                  isUrgent
                    ? 'border-red-800/50 bg-red-950/30'
                    : 'border-gray-700/50 bg-gray-800/30'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary">
                    {i + 1}
                  </span>
                  <span className="flex-1 text-sm font-bold text-gray-200">
                    {exam.nome}
                  </span>
                  {isUrgent && (
                    <span className="rounded bg-red-600 px-2 py-0.5 text-[9px] font-bold text-white">
                      URGENTE
                    </span>
                  )}
                </div>
                {exam.codigo_tuss && (
                  <p className="ml-7 font-mono text-xs text-primary">
                    TUSS: {exam.codigo_tuss}
                  </p>
                )}
                {exam.o_que_afere && (
                  <p className="ml-7 text-xs text-gray-400">
                    Avalia: {exam.o_que_afere}
                  </p>
                )}
                {exam.indicacao && (
                  <p className="ml-7 text-xs text-gray-400">
                    ↳ {exam.indicacao}
                  </p>
                )}
                {exam.interpretacao_esperada && (
                  <div className="ml-7 mt-1 rounded-lg border-l-2 border-primary bg-primary/10 p-2">
                    <p className="text-xs italic text-primary">
                      Esperado: {exam.interpretacao_esperada}
                    </p>
                  </div>
                )}
                {exam.preparo_paciente && (
                  <p className="ml-7 text-xs text-amber-400">
                    📋 Preparo: {exam.preparo_paciente}
                  </p>
                )}
                {exam.prazo_resultado && (
                  <p className="ml-7 text-xs text-gray-400">
                    ⏱ Resultado: {exam.prazo_resultado}
                  </p>
                )}
              </div>
            );
          })}
          <p className="text-[10px] italic text-gray-600">
            Exames priorizados por diagnóstico diferencial • Código TUSS quando
            disponível • Decisão final do médico
          </p>
        </div>
      )}

      {/* Orientações + Critérios de retorno */}
      {(orientacoesPaciente.length > 0 || criteriosRetorno.length > 0) && (
        <div className="space-y-3">
          {orientacoesPaciente.length > 0 && (
            <>
              <div className="flex items-center gap-2">
                <Heart className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                  Orientações ao Paciente
                </span>
              </div>
              {orientacoesPaciente.map((o, i) => (
                <p key={i} className="pl-1 text-xs text-gray-400">
                  • {o}
                </p>
              ))}
            </>
          )}
          {criteriosRetorno.length > 0 && (
            <>
              <div className="mt-3 flex items-center gap-2">
                <Flag className="h-3.5 w-3.5 text-amber-400" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                  Critérios de Retorno
                </span>
              </div>
              {criteriosRetorno.map((c, i) => (
                <p key={i} className="pl-1 text-xs text-amber-400">
                  ⚠️ {c}
                </p>
              ))}
            </>
          )}
          <button
            type="button"
            onClick={() => {
              const text = [
                ...orientacoesPaciente.map((o) => `• ${o}`),
                '',
                'Sinais de alarme:',
                ...criteriosRetorno.map((c) => `⚠️ ${c}`),
              ].join('\n');
              copyToClipboard(text, 'Orientações');
            }}
            className="mt-2 flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/20"
          >
            Copiar orientações
          </button>
        </div>
      )}
    </>
  );
}
