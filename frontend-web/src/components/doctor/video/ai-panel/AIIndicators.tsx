/**
 * AIIndicators — Gravidade Manchester, alertas vermelhos,
 * diagnóstico diferencial para a tab Consulta.
 */
import {
  ShieldCheck,
  AlertCircle,
  AlertTriangle,
  XCircle,
  GitBranch,
  Copy,
  Star,
} from 'lucide-react';
import { toast } from 'sonner';
import type { DiagDiferencial } from './types';
import { getGravityConfig } from './types';

const GRAVITY_ICONS: Record<string, typeof ShieldCheck> = {
  verde: ShieldCheck,
  amarelo: AlertCircle,
  laranja: AlertTriangle,
  vermelho: XCircle,
};

interface AIIndicatorsProps {
  gravidade: string;
  denominadorComum?: string;
  alertasVermelhos: string[];
  diagDiferencial: DiagDiferencial[];
  primaryCid?: string;
  primaryHipotese?: string;
  copyToClipboard?: (text: string, label: string) => void;
}

export function AIIndicators({
  gravidade,
  denominadorComum,
  alertasVermelhos,
  diagDiferencial,
  primaryCid,
  primaryHipotese,
}: AIIndicatorsProps) {
  const GRAVITY_CONFIG = getGravityConfig();

  return (
    <>
      {/* Gravidade Manchester */}
      {gravidade && GRAVITY_CONFIG[gravidade] && (
        <div
          className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${
            gravidade === 'verde'
              ? 'border-emerald-800/50 bg-emerald-950/40'
              : gravidade === 'amarelo'
                ? 'border-amber-800/50 bg-amber-950/40'
                : gravidade === 'laranja'
                  ? 'border-orange-800/50 bg-orange-950/40'
                  : 'border-red-800/50 bg-red-950/40'
          }`}
        >
          {(() => {
            const Icon = GRAVITY_ICONS[gravidade] ?? ShieldCheck;
            const cfg = GRAVITY_CONFIG[gravidade];
            return (
              <>
                <Icon className="h-4 w-4 shrink-0" aria-hidden />
                <span className={`text-sm font-bold ${cfg.color}`}>
                  {cfg.label}
                </span>
              </>
            );
          })()}
        </div>
      )}

      {/* Denominador comum (categoria ampla) */}
      {denominadorComum && (
        <div className="space-y-1 rounded-xl border border-primary/30 bg-primary/10 p-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
              Denominador comum
            </span>
          </div>
          <p className="text-sm font-bold text-gray-200">{denominadorComum}</p>
        </div>
      )}

      {/* Alertas vermelhos */}
      {alertasVermelhos.length > 0 && (
        <div className="space-y-2 rounded-xl border border-red-800/50 bg-red-950/30 p-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-3.5 w-3.5 text-red-400" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-red-400">
              Alertas
            </span>
          </div>
          {alertasVermelhos.map((a, i) => (
            <p key={i} className="text-xs text-red-300">
              ⚠️ {a}
            </p>
          ))}
        </div>
      )}

      {/* Hipótese Principal */}
      {primaryHipotese && (
        <div className="space-y-1 rounded-xl border-2 border-primary/50 bg-primary/10 p-3">
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
                const text = primaryCid
                  ? `${primaryCid} — ${primaryHipotese}`
                  : primaryHipotese;
                await navigator.clipboard.writeText(text);
                toast.success('Hipotese copiada');
              }}
              className="rounded p-1 transition-colors hover:bg-primary/20"
              title="Copiar hipótese"
            >
              <Copy className="h-3.5 w-3.5 text-primary" />
            </button>
          </div>
          <p className="text-sm font-bold text-gray-200">{primaryHipotese}</p>
          {primaryCid && (
            <p className="text-xs font-semibold text-primary">{primaryCid}</p>
          )}
          {diagDiferencial[0]?.probabilidade && (
            <span className="mt-1 inline-block rounded-md bg-primary/20 px-2 py-0.5 text-xs font-semibold text-primary">
              {diagDiferencial[0].probabilidade_percentual != null
                ? `${diagDiferencial[0].probabilidade_percentual}%`
                : diagDiferencial[0].probabilidade}
            </span>
          )}
        </div>
      )}

      {/* Diagnóstico diferencial */}
      {diagDiferencial.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <GitBranch className="h-3.5 w-3.5 text-primary" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
              Diagnóstico Diferencial
            </span>
          </div>
          <div className="space-y-2">
            {diagDiferencial.map((dd, i) => {
              const probColor =
                dd.probabilidade === 'alta'
                  ? 'bg-emerald-500'
                  : dd.probabilidade === 'media'
                    ? 'bg-amber-500'
                    : 'bg-gray-500';
              const probLabel =
                dd.probabilidade_percentual != null
                  ? `${dd.probabilidade_percentual}%`
                  : dd.probabilidade;
              return (
                <div
                  key={i}
                  className="space-y-1 rounded-lg border border-gray-700/50 bg-gray-800/50 p-3"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${probColor}`}
                      aria-hidden
                    />
                    <span className="flex-1 text-sm font-bold text-gray-200">
                      {dd.hipotese}
                    </span>
                    {probLabel && (
                      <span className="rounded-md bg-primary/20 px-2 py-0.5 text-xs font-semibold text-primary">
                        {probLabel}
                      </span>
                    )}
                  </div>
                  {dd.cid && (
                    <p className="ml-4 text-xs font-semibold text-primary">
                      {dd.cid}
                    </p>
                  )}
                  {dd.argumentos_a_favor && (
                    <p className="ml-4 text-xs text-emerald-400">
                      ✓ {dd.argumentos_a_favor}
                    </p>
                  )}
                  {dd.argumentos_contra && (
                    <p className="ml-4 text-xs text-amber-400">
                      ✗ {dd.argumentos_contra}
                    </p>
                  )}
                  {dd.exames_confirmatorios && (
                    <p className="ml-4 text-xs text-primary">
                      🔬 {dd.exames_confirmatorios}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
