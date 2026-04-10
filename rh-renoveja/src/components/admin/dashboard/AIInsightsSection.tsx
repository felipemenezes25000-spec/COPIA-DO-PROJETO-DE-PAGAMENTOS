import { BarChart3, Sparkles, TrendingUp } from 'lucide-react';
import DonutChart from './DonutChart';

export interface AIStatsData {
  totalAnalisados: number;
  semAnalise: number;
  scoreMedio: number;
  porRecomendacao: Record<string, number>;
  distribuicaoScore: { faixa: string; total: number }[];
}

interface AIInsightsSectionProps {
  aiStats: AIStatsData;
}

function scoreToneClass(score: number): string {
  if (score >= 70) return 'text-emerald-600';
  if (score >= 50) return 'text-purple-600';
  return 'text-amber-600';
}

function scoreBarClass(score: number): string {
  if (score >= 70) return 'bg-emerald-500';
  if (score >= 50) return 'bg-purple-500';
  return 'bg-amber-500';
}

function faixaColor(faixa: string): string {
  if (faixa === '80-100') return 'bg-emerald-500';
  if (faixa === '60-79') return 'bg-purple-500';
  if (faixa === '40-59') return 'bg-amber-500';
  return 'bg-red-500';
}

export default function AIInsightsSection({ aiStats }: AIInsightsSectionProps) {
  const analyzed = aiStats.totalAnalisados;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* KPIs */}
      <section
        role="region"
        aria-label="Triagem por IA"
        className="bg-white rounded-xl border border-slate-200 p-6"
      >
        <h3 className="font-semibold text-slate-800 mb-5 flex items-center gap-2">
          <Sparkles size={16} className="text-purple-500" aria-hidden="true" />
          Triagem por IA
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">Candidatos analisados</span>
            <span className="text-lg font-bold text-slate-800 tabular-nums">
              {analyzed}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">Aguardando análise</span>
            <span className="text-lg font-bold text-amber-600 tabular-nums">
              {aiStats.semAnalise}
            </span>
          </div>
          <div className="pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-slate-500">Score médio</span>
              <span className={`text-2xl font-bold tabular-nums ${scoreToneClass(aiStats.scoreMedio)}`}>
                {aiStats.scoreMedio || '—'}
              </span>
            </div>
            {analyzed > 0 && (
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden mt-2">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${scoreBarClass(aiStats.scoreMedio)}`}
                  style={{ width: `${Math.max(0, Math.min(100, aiStats.scoreMedio))}%` }}
                />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Recommendations */}
      <section
        role="region"
        aria-label="Recomendações da IA"
        className="bg-white rounded-xl border border-slate-200 p-6"
      >
        <h3 className="font-semibold text-slate-800 mb-5 flex items-center gap-2">
          <BarChart3 size={16} className="text-purple-500" aria-hidden="true" />
          Recomendações da IA
        </h3>
        {analyzed > 0 ? (
          <DonutChart
            segments={[
              { label: 'Aprovar', value: aiStats.porRecomendacao.aprovar ?? 0, color: '#22C55E' },
              { label: 'Entrevistar', value: aiStats.porRecomendacao.entrevistar ?? 0, color: '#A855F7' },
              { label: 'Analisar mais', value: aiStats.porRecomendacao.analisar_mais ?? 0, color: '#F59E0B' },
              { label: 'Rejeitar', value: aiStats.porRecomendacao.rejeitar ?? 0, color: '#EF4444' },
            ]}
          />
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Sparkles size={32} className="text-slate-200 mb-3" aria-hidden="true" />
            <p className="text-sm text-slate-400">Nenhum candidato analisado ainda.</p>
            <p className="text-xs text-slate-300 mt-1">
              Acesse um candidato e clique em "Analisar".
            </p>
          </div>
        )}
      </section>

      {/* Score distribution */}
      <section
        role="region"
        aria-label="Distribuição de scores"
        className="bg-white rounded-xl border border-slate-200 p-6"
      >
        <h3 className="font-semibold text-slate-800 mb-5 flex items-center gap-2">
          <TrendingUp size={16} className="text-purple-500" aria-hidden="true" />
          Distribuição de scores
        </h3>
        {analyzed > 0 ? (
          <ul className="space-y-3">
            {aiStats.distribuicaoScore.map((faixa) => {
              const pctVal = analyzed > 0 ? Math.round((faixa.total / analyzed) * 100) : 0;
              return (
                <li key={faixa.faixa}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-slate-600">Score {faixa.faixa}</span>
                    <span className="text-sm font-semibold text-slate-800 tabular-nums">
                      {faixa.total} ({pctVal}%)
                    </span>
                  </div>
                  <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${faixaColor(faixa.faixa)} transition-all duration-700`}
                      style={{ width: `${Math.max(pctVal, 2)}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Sparkles size={32} className="text-slate-200 mb-3" aria-hidden="true" />
            <p className="text-sm text-slate-400">Sem dados de score ainda.</p>
          </div>
        )}
      </section>
    </div>
  );
}
