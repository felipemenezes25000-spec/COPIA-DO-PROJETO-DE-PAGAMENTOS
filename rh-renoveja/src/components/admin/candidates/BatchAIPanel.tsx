import { motion } from 'framer-motion';
import { Loader2, CheckCircle2, AlertCircle, Zap } from 'lucide-react';

interface BatchAIPanelProps {
  unanalyzed: number;
  running: boolean;
  progress: { done: number; total: number; current: string };
  onRun: () => void;
  onCancel: () => void;
}

/**
 * "Analisar em lote" control rendered in the candidates header.
 * Has three mutually exclusive visual states:
 *   - running     → progress bar + cancel button
 *   - unanalyzed=0 → quiet success pill
 *   - otherwise   → prominent CTA button
 */
export default function BatchAIPanel({
  unanalyzed,
  running,
  progress,
  onRun,
  onCancel,
}: BatchAIPanelProps) {
  const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

  if (running) {
    return (
      <div
        role="region"
        aria-label="Progresso da análise em lote"
        aria-live="polite"
        className="relative overflow-hidden rounded-xl bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 p-0.5 shadow-[0_10px_30px_-10px_rgba(139,92,246,0.5)]"
      >
        <div className="relative bg-white rounded-[10px] px-4 py-3 min-w-[320px]">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Loader2 size={14} className="animate-spin text-violet-600" aria-hidden="true" />
              <span className="text-xs font-bold text-slate-700">Análise em lote</span>
            </div>
            <span className="text-xs font-mono text-slate-500 tabular-nums">
              {progress.done}/{progress.total}
            </span>
          </div>
          <div
            className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-2"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <motion.div
              className="h-full bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500"
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] text-slate-500 truncate flex-1">
              Analisando: <span className="font-medium text-slate-700">{progress.current || '...'}</span>
            </p>
            <button
              type="button"
              onClick={onCancel}
              aria-label="Cancelar análise em lote em andamento"
              className="text-[11px] font-semibold text-slate-400 hover:text-rose-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 rounded"
            >
              cancelar
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (unanalyzed === 0) {
    return (
      <div
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700"
        role="status"
      >
        <CheckCircle2 size={15} aria-hidden="true" />
        <span className="text-xs font-semibold">Todos analisados pela IA</span>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onRun}
      aria-label={`Iniciar análise em lote de ${unanalyzed} candidato${unanalyzed !== 1 ? 's' : ''} ainda sem análise de IA`}
      className="group relative inline-flex items-center gap-3 px-5 py-3 rounded-xl bg-slate-900 text-white shadow-[0_10px_30px_-10px_rgba(15,23,42,0.5)] hover:bg-gradient-to-r hover:from-violet-600 hover:to-fuchsia-600 hover:shadow-[0_15px_40px_-10px_rgba(139,92,246,0.5)] transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2"
    >
      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 group-hover:bg-white/20 transition-colors">
        <Zap size={15} className="text-white" strokeWidth={2.5} aria-hidden="true" />
      </div>
      <div className="text-left">
        <p className="text-xs font-bold uppercase tracking-wider opacity-80">Análise em lote</p>
        <p className="text-sm font-semibold flex items-center gap-1.5">
          Analisar {unanalyzed} candidato{unanalyzed !== 1 ? 's' : ''}
          <AlertCircle size={12} className="opacity-70" aria-hidden="true" />
        </p>
      </div>
      <span className="absolute -top-1.5 -right-1.5 flex h-3 w-3" aria-hidden="true">
        <span className="absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75 animate-ping" />
        <span className="relative inline-flex rounded-full h-3 w-3 bg-violet-500" />
      </span>
    </button>
  );
}
