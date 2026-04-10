/**
 * AiCopilotSection — Cabeçalho do Copiloto IA no detalhe do pedido.
 *
 * Renderiza o header (ícone de lâmpada roxo, badge de risco, aviso legal)
 * e delega a renderização do resumo ao novo AiCopilotRichContent, que faz
 * o parsing semântico em seções (Medicamentos, Exames, Conduta, Alertas…)
 * com ícones específicos por tipo, highlighting de warnings e collapse
 * individual.
 *
 * Antes: tentava parsear o summary em "blocks" flat (header/bullet/text) e
 * renderizava tudo como texto, com um botão global "Ver análise completa".
 * O médico via um wall of text roxo sem hierarquia semântica.
 *
 * Agora: hierarquia visual por tipo de conteúdo. Médico vê "MEDICAMENTOS"
 * com pílula verde, "ALERTAS" em vermelho sempre aberto (safety-first),
 * "EXAMES" com frasco azul, etc. Botão único "Copiar tudo" preservado
 * no header; cópia por linha fica dentro do rich content.
 */
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { hasUsefulAiContent } from '@/lib/aiCopilotHelpers';
import type { MedicalRequest } from '@/services/doctorApi';
import {
  Lightbulb,
  Shield,
  AlertTriangle,
  AlertCircle,
  Clock,
  Copy,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { AiCopilotRichContent } from '@/components/doctor/AiCopilotRichContent';

const RISK_LABELS: Record<string, string> = {
  low: 'Risco baixo',
  medium: 'Risco médio',
  high: 'Risco alto',
};
const URGENCY_LABELS: Record<string, string> = {
  routine: 'Rotina',
  urgent: 'Urgente',
  emergency: 'Emergência',
};

function getRiskLabel(level: string | null | undefined): string {
  if (!level) return 'Risco não classificado';
  return RISK_LABELS[level.toLowerCase()] ?? 'Risco não classificado';
}

function getUrgencyLabel(level: string | null | undefined): string {
  if (!level) return 'Não informado';
  return URGENCY_LABELS[level.toLowerCase()] ?? 'Não informado';
}

interface AiCopilotSectionProps {
  request: MedicalRequest;
  className?: string;
}

export function AiCopilotSection({
  request,
  className,
}: AiCopilotSectionProps) {
  const summaryText = request.aiSummaryForDoctor?.trim() ?? '';

  if (
    !hasUsefulAiContent(
      request.aiSummaryForDoctor,
      request.aiRiskLevel,
      request.aiUrgency
    )
  ) {
    return null;
  }

  const riskLevel = request.aiRiskLevel?.toLowerCase();
  const RiskIcon =
    riskLevel === 'low'
      ? Shield
      : riskLevel === 'high'
        ? AlertCircle
        : AlertTriangle;
  const riskBg =
    riskLevel === 'low'
      ? 'bg-emerald-100 text-emerald-700'
      : riskLevel === 'high'
        ? 'bg-red-100 text-red-700'
        : 'bg-amber-100 text-amber-700';

  const handleCopyAll = async () => {
    if (!summaryText) return;
    try {
      await navigator.clipboard.writeText(summaryText);
      toast.success('Resumo completo copiado');
    } catch {
      toast.error('Não foi possível copiar. Selecione o texto manualmente.');
    }
  };

  return (
    <Card
      className={cn(
        'border-2 border-violet-300 bg-violet-50/30 dark:border-violet-500/40 dark:bg-violet-950/10',
        className
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="rounded-lg bg-violet-100 p-1.5 dark:bg-violet-900/40">
            <Lightbulb
              className="h-4 w-4 text-violet-600 dark:text-violet-400"
              aria-hidden
            />
          </div>
          <span className="text-sm font-semibold text-violet-900 dark:text-violet-200">
            Copiloto IA
          </span>
          {request.aiRiskLevel && (
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-medium',
                riskBg
              )}
            >
              <RiskIcon className="h-3 w-3" />
              {getRiskLabel(request.aiRiskLevel)}
            </span>
          )}
          {summaryText.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyAll}
              className="ml-auto h-7 gap-1.5 text-xs text-violet-700 hover:bg-violet-100 hover:text-violet-800 dark:text-violet-300 dark:hover:bg-violet-900/30"
            >
              <Copy className="h-3 w-3" />
              Copiar tudo
            </Button>
          )}
        </div>
        <p className="mt-1 text-xs italic text-muted-foreground">
          Sugestões geradas por IA — decisão final do médico.
        </p>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {summaryText.length > 0 && (
          <AiCopilotRichContent summaryText={summaryText} />
        )}
        {request.aiUrgency && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            Urgência: {getUrgencyLabel(request.aiUrgency)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
