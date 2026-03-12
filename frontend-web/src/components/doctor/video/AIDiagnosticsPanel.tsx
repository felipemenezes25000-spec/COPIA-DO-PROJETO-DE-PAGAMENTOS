/**
 * AIDiagnosticsPanel — Gravidade, CID sugerido + confiança, diagnóstico diferencial.
 * Paridade com mobile AIIndicators.
 */
import { motion } from 'framer-motion';
import { Shield, ShieldAlert, ShieldX, Activity, Copy, GitBranch } from 'lucide-react';
import { toast } from 'sonner';
import type { DiagDiferencial, ParsedAnamnesisAi } from './ai-panel-types';

const GRAVITY_CONFIG: Record<string, { color: string; label: string; icon: typeof Shield }> = {
  leve: { color: 'text-emerald-400', label: 'Leve', icon: Shield },
  moderada: { color: 'text-amber-400', label: 'Moderada', icon: ShieldAlert },
  grave: { color: 'text-red-400', label: 'Grave', icon: ShieldX },
};

const CONFIDENCE_CONFIG: Record<string, { color: string; label: string }> = {
  alta: { color: 'text-emerald-400', label: 'Alta' },
  media: { color: 'text-amber-400', label: 'Média' },
  baixa: { color: 'text-red-400', label: 'Baixa' },
};

function copyToClipboard(text: string, label: string) {
  navigator.clipboard.writeText(text).then(
    () => toast.success(`${label} copiado`),
    () => toast.error('Erro ao copiar'),
  );
}

export interface AIDiagnosticsPanelProps {
  data: ParsedAnamnesisAi | null;
}

export function AIDiagnosticsPanel({ data }: AIDiagnosticsPanelProps) {
  if (!data) return null;

  const gravidade = (data.classificacao_gravidade ?? '').toLowerCase();
  const cidSugerido = data.cid_sugerido ?? '';
  const cidDescricao = data.cid_descricao ?? '';
  const confiancaCid = (data.confianca_cid ?? '').toLowerCase();
  const diagDiferencial: DiagDiferencial[] = Array.isArray(data.diagnostico_diferencial)
    ? data.diagnostico_diferencial
    : [];

  const gravityCfg = gravidade && GRAVITY_CONFIG[gravidade] ? GRAVITY_CONFIG[gravidade] : null;
  const confidenceCfg = confiancaCid && CONFIDENCE_CONFIG[confiancaCid] ? CONFIDENCE_CONFIG[confiancaCid] : null;

  const hasContent = gravityCfg || cidSugerido || diagDiferencial.length > 0;

  if (!hasContent) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-14 h-14 rounded-2xl bg-gray-800 flex items-center justify-center mb-3">
          <Activity className="h-7 w-7 text-gray-600" />
        </div>
        <p className="text-sm text-gray-400 font-medium">Diagnóstico em construção</p>
        <p className="text-xs text-gray-600 mt-1 max-w-xs">
          A IA analisa a transcrição e sugere CID e diagnóstico diferencial em tempo real.
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
          className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${
            gravidade === 'leve'
              ? 'bg-emerald-950/30 border-emerald-800/50'
              : gravidade === 'moderada'
                ? 'bg-amber-950/30 border-amber-800/50'
                : 'bg-red-950/30 border-red-800/50'
          }`}
        >
          <gravityCfg.icon className={`h-4 w-4 ${gravityCfg.color}`} />
          <span className={`text-sm font-semibold ${gravityCfg.color}`}>{gravityCfg.label}</span>
        </motion.div>
      )}

      {/* CID sugerido + confiança */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="p-3 rounded-xl bg-primary/10 border border-primary/20"
      >
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-[10px] font-bold text-primary uppercase tracking-wider">
            Hipótese diagnóstica (CID)
          </span>
          {confidenceCfg && (
            <span className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-gray-800 ${confidenceCfg.color}`}>
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  confiancaCid === 'alta' ? 'bg-emerald-400' : confiancaCid === 'media' ? 'bg-amber-400' : 'bg-red-400'
                }`}
              />
              {confidenceCfg.label}
            </span>
          )}
        </div>
        {cidSugerido ? (
          <>
            <p className="text-sm font-bold text-gray-200">{cidSugerido}</p>
            {cidDescricao && <p className="text-xs text-gray-400 mt-1">{cidDescricao}</p>}
            <button
              type="button"
              onClick={() => copyToClipboard(`${cidSugerido}${cidDescricao ? ` — ${cidDescricao}` : ''}`, 'CID')}
              className="mt-2 flex items-center gap-1.5 text-[10px] font-semibold text-primary hover:underline"
            >
              <Copy className="h-3 w-3" /> Copiar CID
            </button>
          </>
        ) : (
          <p className="text-xs text-gray-500 italic">Aguardando dados da transcrição para sugerir CID</p>
        )}
      </motion.div>

      {/* Diagnóstico diferencial */}
      {diagDiferencial.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <GitBranch className="h-3.5 w-3.5 text-primary" />
            <span className="text-[10px] font-bold text-primary uppercase tracking-wider">
              Diagnóstico diferencial
            </span>
          </div>
          <div className="space-y-2">
            {diagDiferencial.map((dd, i) => {
              const prob = (dd.probabilidade ?? '').toLowerCase();
              const probColor =
                prob === 'alta' ? 'bg-emerald-500' : prob === 'media' ? 'bg-amber-500' : 'bg-gray-500';
              const label = dd.descricao || dd.hipotese || dd.cid;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.03 }}
                  className="p-3 rounded-xl bg-gray-800/50 border border-gray-800"
                >
                  <div className="flex items-start gap-2">
                    <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${probColor}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-200">{label}</p>
                      {dd.cid && <p className="text-xs text-primary font-medium mt-0.5">{dd.cid}</p>}
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
