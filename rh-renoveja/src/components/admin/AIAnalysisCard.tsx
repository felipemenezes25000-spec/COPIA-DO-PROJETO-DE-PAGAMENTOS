import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Loader2, ThumbsUp, ThumbsDown, AlertCircle, ChevronDown,
  CheckCircle2, Brain, Zap, RotateCw, ShieldCheck, TrendingUp, Check,
} from 'lucide-react';
import { analyzeCandidate, isAIAvailable, type AIAnalysis } from '../../lib/openai';
import { saveCandidateAIAnalysis } from '../../lib/admin-api';
import type { AdminCandidate, AIAnalysisResult } from '../../types/admin';

/* ------------------------------------------------------------------ */
/* Visual config                                                       */
/* ------------------------------------------------------------------ */

type RecKey = 'aprovar' | 'entrevistar' | 'analisar_mais' | 'rejeitar';

const VERDICT_CONFIG: Record<RecKey, {
  label: string;
  tagline: string;
  icon: typeof ThumbsUp;
  /** Tailwind gradient for verdict banner */
  bannerGradient: string;
  /** Ring/accent color (hex) for the score gauge stroke */
  accent: string;
  chipClass: string;
  textClass: string;
}> = {
  aprovar: {
    label: 'Aprovar',
    tagline: 'Perfil alinhado — recomenda-se avançar.',
    icon: ThumbsUp,
    bannerGradient: 'from-emerald-500 via-emerald-600 to-teal-600',
    accent: '#10B981',
    chipClass: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    textClass: 'text-emerald-600',
  },
  entrevistar: {
    label: 'Entrevistar',
    tagline: 'Forte potencial — vale conversa com o time.',
    icon: Sparkles,
    bannerGradient: 'from-violet-500 via-purple-600 to-fuchsia-600',
    accent: '#8B5CF6',
    chipClass: 'bg-violet-50 text-violet-700 ring-violet-200',
    textClass: 'text-violet-600',
  },
  analisar_mais: {
    label: 'Analisar mais',
    tagline: 'Requer revisão humana em pontos específicos.',
    icon: AlertCircle,
    bannerGradient: 'from-amber-500 via-orange-500 to-amber-600',
    accent: '#F59E0B',
    chipClass: 'bg-amber-50 text-amber-700 ring-amber-200',
    textClass: 'text-amber-600',
  },
  rejeitar: {
    label: 'Rejeitar',
    tagline: 'Perfil não atende aos critérios atuais.',
    icon: ThumbsDown,
    bannerGradient: 'from-rose-500 via-red-500 to-rose-600',
    accent: '#EF4444',
    chipClass: 'bg-rose-50 text-rose-700 ring-rose-200',
    textClass: 'text-rose-600',
  },
};

/* ------------------------------------------------------------------ */
/* Score Gauge — semi-circle gradient dial                             */
/* ------------------------------------------------------------------ */

function ScoreGauge({ score, accent }: { score: number; accent: string }) {
  // Semi-circle gauge from 180° to 360° (bottom half inverted)
  const radius = 78;
  const stroke = 14;
  const circ = Math.PI * radius; // half circumference
  const pct = Math.min(Math.max(score, 0), 100) / 100;
  const dash = circ * pct;

  const label =
    score >= 80 ? 'Excelente' :
    score >= 60 ? 'Forte' :
    score >= 40 ? 'Médio' :
    'Abaixo';

  return (
    <div className="relative w-[200px] h-[120px] shrink-0">
      <svg viewBox="0 0 200 120" className="w-full h-full">
        <defs>
          <linearGradient id={`gauge-${accent}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={accent} stopOpacity="0.4" />
            <stop offset="100%" stopColor={accent} stopOpacity="1" />
          </linearGradient>
        </defs>
        {/* Track */}
        <path
          d={`M ${100 - radius} 100 A ${radius} ${radius} 0 0 1 ${100 + radius} 100`}
          fill="none"
          stroke="#F1F5F9"
          strokeWidth={stroke}
          strokeLinecap="round"
        />
        {/* Progress */}
        <motion.path
          d={`M ${100 - radius} 100 A ${radius} ${radius} 0 0 1 ${100 + radius} 100`}
          fill="none"
          stroke={`url(#gauge-${accent})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ - dash }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
        />
        {/* Tick marks */}
        {[0, 25, 50, 75, 100].map((t) => {
          const angle = Math.PI * (1 - t / 100);
          const x1 = 100 + (radius - stroke) * Math.cos(angle);
          const y1 = 100 - (radius - stroke) * Math.sin(angle);
          const x2 = 100 + (radius - stroke - 6) * Math.cos(angle);
          const y2 = 100 - (radius - stroke - 6) * Math.sin(angle);
          return <line key={t} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#CBD5E1" strokeWidth={1.5} />;
        })}
      </svg>
      <div className="absolute inset-x-0 bottom-1 flex flex-col items-center">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.4 }}
          className="flex items-baseline gap-1"
        >
          <span className="font-display text-5xl font-bold text-slate-900 tabular-nums leading-none">
            {score}
          </span>
          <span className="text-sm text-slate-400 font-medium">/100</span>
        </motion.div>
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 mt-1"
        >
          {label}
        </motion.span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Loading Timeline — sequenced analysis phases                        */
/* ------------------------------------------------------------------ */

const PHASES = [
  { key: 'profile', label: 'Decompondo perfil profissional', icon: Brain },
  { key: 'academic', label: 'Validando formação acadêmica', icon: ShieldCheck },
  { key: 'match', label: 'Calculando fit com a vaga', icon: Zap },
  { key: 'verdict', label: 'Formulando recomendação', icon: Sparkles },
] as const;

function LoadingTimeline() {
  // Active phase advances 0 → 1 → 2 → (PHASES.length - 1) then STAYS on the
  // last phase until this component unmounts (i.e. until the real API call
  // resolves). This prevents the "all checkmarks with nothing running" state
  // that would appear if the backend is slower than our scripted timeline.
  const [active, setActive] = useState(0);
  const LAST = PHASES.length - 1;

  useEffect(() => {
    // Advance through the first (LAST) phases only; do NOT schedule a tick
    // that would mark the final phase as "done".
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 1; i <= LAST; i++) {
      timers.push(setTimeout(() => setActive(i), 650 + (i - 1) * 750));
    }
    return () => timers.forEach(clearTimeout);
  }, [LAST]);

  return (
    <div className="px-8 py-10" role="status" aria-live="polite" aria-label="Analisando perfil com IA">
      <div className="flex items-center gap-3 mb-6">
        <div className="relative">
          <div className="absolute inset-0 bg-violet-400/30 blur-xl rounded-full" />
          <Loader2 size={18} className="relative animate-spin text-violet-600" />
        </div>
        <span className="text-sm font-medium text-slate-700">Analisando perfil com IA</span>
        <span className="ml-auto text-[10px] font-mono uppercase tracking-wider text-slate-400">
          gpt-4o-mini
        </span>
      </div>

      <ol className="relative space-y-3 pl-1">
        {PHASES.map((phase, i) => {
          const done = i < active;
          const running = i === active;
          const Icon = phase.icon;
          return (
            <li key={phase.key} className="flex items-center gap-3">
              <div
                className={[
                  'flex items-center justify-center w-7 h-7 rounded-full shrink-0 transition-all duration-300',
                  done ? 'bg-emerald-500 text-white shadow-[0_0_0_4px_rgba(16,185,129,0.12)]'
                    : running ? 'bg-violet-500 text-white shadow-[0_0_0_4px_rgba(139,92,246,0.15)]'
                    : 'bg-slate-100 text-slate-400',
                ].join(' ')}
              >
                {done ? <Check size={14} strokeWidth={3} /> : <Icon size={13} />}
              </div>
              <span
                className={[
                  'text-sm transition-colors',
                  done ? 'text-slate-400 line-through decoration-slate-200'
                    : running ? 'text-slate-800 font-medium'
                    : 'text-slate-400',
                ].join(' ')}
              >
                {phase.label}
              </span>
              {running && (
                <motion.span
                  className="ml-auto flex gap-0.5"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  {[0, 1, 2].map((d) => (
                    <motion.span
                      key={d}
                      className="w-1 h-1 rounded-full bg-violet-500"
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1, repeat: Infinity, delay: d * 0.2 }}
                    />
                  ))}
                </motion.span>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Empty State — invitation to analyze                                 */
/* ------------------------------------------------------------------ */

function EmptyState({ onAnalyze }: { onAnalyze: () => void }) {
  return (
    <div className="relative overflow-hidden">
      {/* Gradient mesh background */}
      <div className="absolute inset-0 opacity-60">
        <div className="absolute -top-16 -left-16 w-64 h-64 bg-violet-300/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-16 -right-16 w-72 h-72 bg-sky-300/30 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-fuchsia-200/20 rounded-full blur-3xl" />
      </div>

      <div className="relative px-8 py-10 flex flex-col items-center text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="relative mb-5"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-violet-400 to-fuchsia-400 blur-2xl opacity-40" />
          <div className="relative flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 via-purple-600 to-fuchsia-600 shadow-[0_10px_30px_-10px_rgba(139,92,246,0.7)]">
            <Sparkles size={28} className="text-white" strokeWidth={2.2} />
          </div>
        </motion.div>

        <h4 className="font-display text-xl font-bold text-slate-900 mb-1.5">
          Pronto para a análise inteligente?
        </h4>
        <p className="text-sm text-slate-500 max-w-sm leading-relaxed mb-6">
          A IA avalia o perfil contra <span className="font-medium text-slate-700">12 critérios técnicos e comportamentais</span>, gerando score, pontos-fortes e uma recomendação objetiva.
        </p>

        <button
          type="button"
          onClick={onAnalyze}
          className="group relative inline-flex items-center gap-2.5 px-6 py-3 rounded-xl bg-slate-900 text-white text-sm font-semibold shadow-[0_10px_30px_-10px_rgba(15,23,42,0.6)] hover:shadow-[0_15px_40px_-10px_rgba(139,92,246,0.6)] hover:bg-gradient-to-r hover:from-violet-600 hover:to-fuchsia-600 transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"
        >
          <Sparkles size={15} className="group-hover:rotate-12 transition-transform" />
          Gerar análise agora
          <span className="absolute -top-1.5 -right-1.5 flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75 animate-ping" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-violet-500" />
          </span>
        </button>

        <div className="flex items-center gap-4 mt-6 text-[10px] font-medium uppercase tracking-widest text-slate-400">
          <span className="flex items-center gap-1"><ShieldCheck size={11} /> Dados privados</span>
          <span className="w-1 h-1 bg-slate-300 rounded-full" />
          <span>≈ 4 segundos</span>
          <span className="w-1 h-1 bg-slate-300 rounded-full" />
          <span>GPT-4o</span>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main Card                                                           */
/* ------------------------------------------------------------------ */

interface Props {
  candidate: AdminCandidate;
  token?: string | null;
  onAnalysisComplete?: (analysis: AIAnalysisResult) => void;
}

export default function AIAnalysisCard({ candidate, token, onAnalysisComplete }: Props) {
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    if (candidate.aiAnalysis) setAnalysis(candidate.aiAnalysis);
  }, [candidate.aiAnalysis]);

  const verdict = useMemo(
    () => (analysis ? VERDICT_CONFIG[analysis.recomendacao] : null),
    [analysis],
  );

  if (!isAIAvailable() && !candidate.aiAnalysis) return null;

  async function handleAnalyze() {
    setLoading(true);
    setError(null);
    try {
      const result = await analyzeCandidate({
        nome: candidate.nome,
        categoria: candidate.categoria,
        especialidade: candidate.especialidade,
        anosExperiencia: candidate.anosExperiencia ?? 'mais_10',
        expTelemedicina: candidate.expTelemedicina,
        sobre: candidate.sobre,
        graduacao: candidate.graduacao,
        universidade: candidate.universidade,
        anoConclusao: candidate.anoConclusao,
        posGraduacao: candidate.posGraduacao,
        residencia: candidate.residencia,
      }, token);
      setAnalysis(result);
      const saved = await saveCandidateAIAnalysis(candidate.id, result, token);
      onAnalysisComplete?.(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao analisar candidato.');
    } finally {
      setLoading(false);
    }
  }

  const VerdictIcon = verdict?.icon;
  const analyzedAt =
    analysis && 'analyzedAt' in analysis ? (analysis as AIAnalysisResult).analyzedAt : null;

  return (
    <section
      role="region"
      aria-label="Análise de IA do candidato"
      aria-busy={loading || undefined}
      className="bg-white rounded-2xl border border-slate-200/80 shadow-card overflow-hidden"
    >
      {/* ---------- Header bar ---------- */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 via-white to-white">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-400 to-fuchsia-400 blur-md opacity-50" />
            <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 shadow-sm">
              <Sparkles size={15} className="text-white" strokeWidth={2.3} />
            </div>
          </div>
          <div>
            <h3 className="font-display font-bold text-slate-900 leading-tight">Intelligence Report</h3>
            <p className="text-[10px] uppercase tracking-[0.15em] text-slate-400 font-semibold">
              Análise por IA · GPT-4o
            </p>
          </div>
        </div>

        {analysis && !loading && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleAnalyze}
              title="Reanalisar"
              className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50 transition-colors"
            >
              <RotateCw size={14} />
            </button>
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              aria-label={expanded ? 'Recolher' : 'Expandir'}
            >
              <ChevronDown
                size={16}
                className={`transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}
              />
            </button>
          </div>
        )}
      </div>

      {/* ---------- Body ---------- */}
      {loading ? (
        <LoadingTimeline />
      ) : error ? (
        <div className="p-6">
          <div className="flex items-start gap-3 text-rose-700 bg-rose-50 rounded-xl p-4 border border-rose-100">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium">{error}</p>
              <button
                type="button"
                onClick={handleAnalyze}
                className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-rose-700 hover:text-rose-800 underline decoration-rose-300 underline-offset-2"
              >
                <RotateCw size={11} /> Tentar novamente
              </button>
            </div>
          </div>
        </div>
      ) : !analysis ? (
        <EmptyState onAnalyze={handleAnalyze} />
      ) : (
        <AnimatePresence initial={false}>
          {expanded && verdict && VerdictIcon && (
            <motion.div
              key="results"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              {/* Verdict banner */}
              <div className={`relative overflow-hidden bg-gradient-to-br ${verdict.bannerGradient} px-6 py-5`}>
                {/* Noise / decorative dots */}
                <div className="absolute inset-0 opacity-20 mix-blend-overlay" style={{
                  backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
                  backgroundSize: '14px 14px',
                }} />
                <div className="relative flex items-center gap-4">
                  <motion.div
                    initial={{ scale: 0.5, rotate: -12, opacity: 0 }}
                    animate={{ scale: 1, rotate: 0, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 18 }}
                    className="flex items-center justify-center w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm border border-white/30"
                  >
                    <VerdictIcon size={22} className="text-white" strokeWidth={2.3} />
                  </motion.div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/80">
                      Veredito da IA
                    </p>
                    <p className="font-display text-2xl font-bold text-white leading-tight">
                      {verdict.label}
                    </p>
                    <p className="text-xs text-white/90 mt-0.5">{verdict.tagline}</p>
                  </div>
                  <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur-sm border border-white/25 text-white text-xs font-semibold">
                    <TrendingUp size={12} /> Score {analysis.score}
                  </div>
                </div>
              </div>

              {/* Score + Executive summary */}
              <div className="px-6 py-6 grid grid-cols-1 md:grid-cols-[auto_1fr] gap-6 items-center border-b border-slate-100">
                <ScoreGauge score={analysis.score} accent={verdict.accent} />
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 mb-2">
                    Sumário executivo
                  </p>
                  <p className="text-[15px] leading-relaxed text-slate-700 font-body">
                    {analysis.resumo}
                  </p>
                  {analysis.recomendacaoTexto && (
                    <p className={`mt-3 text-xs italic ${verdict.textClass}`}>
                      “{analysis.recomendacaoTexto}”
                    </p>
                  )}
                </div>
              </div>

              {/* Strengths & weaknesses */}
              <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100">
                {analysis.pontosFortes.length > 0 && (
                  <div className="px-6 py-5">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="flex items-center justify-center w-6 h-6 rounded-md bg-emerald-100">
                        <CheckCircle2 size={13} className="text-emerald-600" strokeWidth={2.5} />
                      </div>
                      <h5 className="text-[11px] font-bold uppercase tracking-[0.15em] text-emerald-700">
                        Pontos fortes
                      </h5>
                      <span className="ml-auto text-[10px] font-bold text-emerald-500 tabular-nums">
                        {analysis.pontosFortes.length}
                      </span>
                    </div>
                    <ul className="space-y-2.5">
                      {analysis.pontosFortes.map((p, i) => (
                        <motion.li
                          key={i}
                          initial={{ opacity: 0, x: -6 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.1 + i * 0.06 }}
                          className="flex items-start gap-2.5 text-sm text-slate-700"
                        >
                          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                          <span className="leading-snug">{p}</span>
                        </motion.li>
                      ))}
                    </ul>
                  </div>
                )}

                {analysis.pontosFracos.length > 0 && (
                  <div className="px-6 py-5 bg-slate-50/40">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="flex items-center justify-center w-6 h-6 rounded-md bg-amber-100">
                        <AlertCircle size={13} className="text-amber-600" strokeWidth={2.5} />
                      </div>
                      <h5 className="text-[11px] font-bold uppercase tracking-[0.15em] text-amber-700">
                        Pontos de atenção
                      </h5>
                      <span className="ml-auto text-[10px] font-bold text-amber-500 tabular-nums">
                        {analysis.pontosFracos.length}
                      </span>
                    </div>
                    <ul className="space-y-2.5">
                      {analysis.pontosFracos.map((p, i) => (
                        <motion.li
                          key={i}
                          initial={{ opacity: 0, x: -6 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.1 + i * 0.06 }}
                          className="flex items-start gap-2.5 text-sm text-slate-700"
                        >
                          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                          <span className="leading-snug">{p}</span>
                        </motion.li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between px-6 py-3 border-t border-slate-100 bg-slate-50/40">
                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>
                    {analyzedAt
                      ? `Analisado ${new Date(analyzedAt).toLocaleString('pt-BR', {
                          day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                        })}`
                      : 'Recém-gerado'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleAnalyze}
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 hover:text-violet-600 transition-colors"
                >
                  <RotateCw size={11} /> Reanalisar
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </section>
  );
}
