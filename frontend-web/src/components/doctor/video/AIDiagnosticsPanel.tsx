/**
 * AIDiagnosticsPanel — Gravidade + diagnóstico diferencial.
 * Paridade com mobile AIIndicators.
 */
import { motion } from 'framer-motion';
import {
  Shield,
  ShieldAlert,
  ShieldX,
  Activity,
  GitBranch,
  Star,
  Copy,
} from 'lucide-react';
import { toast } from 'sonner';
import type { DiagDiferencial, ParsedAnamnesisAi } from './ai-panel/types';

const GRAVITY_CONFIG: Record<
  string,
  { color: string; label: string; icon: typeof Shield }
> = {
  verde: { color: 'text-emerald-400', label: 'Pouco urgente', icon: Shield },
  amarelo: { color: 'text-amber-400', label: 'Urgente', icon: ShieldAlert },
  laranja: {
    color: 'text-orange-400',
    label: 'Muito urgente',
    icon: ShieldAlert,
  },
  vermelho: { color: 'text-red-400', label: 'Emergência', icon: ShieldX },
};

export interface AIDiagnosticsPanelProps {
  data: ParsedAnamnesisAi | null;
}

export function AIDiagnosticsPanel({ data }: AIDiagnosticsPanelProps) {
  if (!data) return null;

  const gravidade = (data.classificacao_gravidade ?? '').toLowerCase();
  const diagDiferencial: DiagDiferencial[] = Array.isArray(
    data.diagnostico_diferencial
  )
    ? data.diagnostico_diferencial
    : [];
  const primary = diagDiferencial.length > 0 ? diagDiferencial[0] : null;

  const gravityCfg =
    gravidade && GRAVITY_CONFIG[gravidade] ? GRAVITY_CONFIG[gravidade] : null;

  const hasContent = gravityCfg || diagDiferencial.length > 0;

  if (!hasContent) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-800">
          <Activity className="h-7 w-7 text-gray-600" />
        </div>
        <p className="text-sm font-medium text-gray-400">
          Diagnóstico em construção
        </p>
        <p className="mt-1 max-w-xs text-xs text-gray-600">
          A IA analisa a transcrição e sugere diagnóstico diferencial em tempo
          real.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Gravidade */}
      {gravityCfg && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${
            gravidade === 'verde'
              ? 'border-emerald-800/50 bg-emerald-950/30'
              : gravidade === 'amarelo'
                ? 'border-amber-800/50 bg-amber-950/30'
                : gravidade === 'laranja'
                  ? 'border-orange-800/50 bg-orange-950/30'
                  : 'border-red-800/50 bg-red-950/30'
          }`}
        >
          <gravityCfg.icon className={`h-4 w-4 ${gravityCfg.color}`} />
          <span className={`text-sm font-semibold ${gravityCfg.color}`}>
            {gravityCfg.label}
          </span>
        </motion.div>
      )}

      {/* Hipótese Principal */}
      {primary && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-1 rounded-xl border-2 border-primary/50 bg-primary/10 p-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 fill-primary text-primary" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                Hipotese Principal
              </span>
            </div>
            <button
              type="button"
              onClick={async () => {
                const label =
                  primary.descricao || primary.hipotese || primary.cid;
                const text = primary.cid ? `${primary.cid} — ${label}` : label;
                await navigator.clipboard.writeText(text);
                toast.success('Hipotese copiada');
              }}
              className="rounded p-1 transition-colors hover:bg-primary/20"
              title="Copiar hipótese"
            >
              <Copy className="h-3.5 w-3.5 text-primary" />
            </button>
          </div>
          <p className="text-sm font-bold text-gray-200">
            {primary.descricao || primary.hipotese || primary.cid}
          </p>
          {primary.cid && (
            <p className="text-xs font-semibold text-primary">{primary.cid}</p>
          )}
          {primary.probabilidade && (
            <span className="mt-1 inline-block rounded-md bg-primary/20 px-2 py-0.5 text-xs font-semibold text-primary">
              {primary.probabilidade}
            </span>
          )}
        </motion.div>
      )}

      {/* Diagnóstico diferencial */}
      {diagDiferencial.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <GitBranch className="h-3.5 w-3.5 text-primary" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
              Diagnóstico diferencial
            </span>
          </div>
          <div className="space-y-2">
            {diagDiferencial.map((dd, i) => {
              const prob = (dd.probabilidade ?? '').toLowerCase();
              const probColor =
                prob === 'alta'
                  ? 'bg-emerald-500'
                  : prob === 'media'
                    ? 'bg-amber-500'
                    : 'bg-gray-500';
              const label = dd.descricao || dd.hipotese || dd.cid;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.03 }}
                  className="rounded-xl border border-gray-800 bg-gray-800/50 p-3"
                >
                  <div className="flex items-start gap-2">
                    <span
                      className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${probColor}`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-200">
                        {label}
                      </p>
                      {dd.cid && (
                        <p className="mt-0.5 text-xs font-medium text-primary">
                          {dd.cid}
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
