/**
 * RequestActionsCard — Ações disponíveis para um pedido, agrupadas por
 * hierarquia (primária / secundária / destrutiva).
 *
 * Antes: até ~5 botões renderizados verticalmente com o mesmo peso visual,
 * incluindo duplicação real (para consulta + status "submitted" aparecia
 * "Rejeitar" no topo E "Recusar" na linha do Aceitar, ambos chamando a
 * mesma função onRejectOpen). Médico em tablet via um scroll vertical de
 * botões sem saber qual era o próximo passo natural.
 *
 * Agora:
 *   - **Primária** (1 botão): ação dominante baseada no status (Iniciar
 *     Vídeo > Aceitar Consulta > Emitir Documentos > Aprovar > Gerar PDF >
 *     Marcar Entregue). Full-width, colorida, sempre no topo.
 *   - **Secundárias** (0-3 botões): ações auxiliares em grid 2-col quando
 *     couberem (Editar, Ver Resumo, Baixar documento, etc).
 *   - **Destrutivas** (0-2 botões): Rejeitar/Recusar e Cancelar, separadas
 *     por divider visual e estilizadas em vermelho subtil.
 *
 * A dedup de Rejeitar/Recusar é resolvida por construção: a ação de recusa
 * é computada uma única vez (com label adaptado ao tipo) e entra só na
 * seção destrutiva.
 */
import { useNavigate } from 'react-router-dom';
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Pen,
  Video,
  Stethoscope,
  FileOutput,
  Download,
  PackageCheck,
  Ban,
  Clock,
  FileText,
  ClipboardList,
  Hourglass,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';
import {
  normalizeStatus,
  isAwaitingPayment,
  getPaymentStatusInfo,
} from '@/lib/doctor-helpers';
import type { MedicalRequest } from '@/services/doctorApi';

interface Props {
  request: MedicalRequest;
  id: string;
  actionLoading: string;
  onApprove: () => void;
  onRejectOpen: () => void;
  onAcceptConsult: () => void;
  onGenPdf: () => void;
  onDownloadPdf: () => void;
  onDeliver: () => void;
  onCancel: () => void;
}

/** Descriptor normalizado de uma ação renderizável. */
interface ActionDescriptor {
  key: string;
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  /** Chave usada em `actionLoading` — quando bate, mostra spinner. */
  loadingKey?: string;
}

export function RequestActionsCard({
  request,
  id,
  actionLoading,
  onApprove,
  onRejectOpen,
  onAcceptConsult,
  onGenPdf,
  onDownloadPdf,
  onDeliver,
  onCancel,
}: Props) {
  const navigate = useNavigate();
  const statusNorm = normalizeStatus(request.status);
  const reqType = (request.type ?? '').toLowerCase();
  const isConsultation = reqType === 'consultation';

  /* ── Condições por ação (mantidas iguais ao original) ── */
  const canApprove =
    !isConsultation &&
    ['submitted', 'pending', 'in_review'].includes(statusNorm);
  const canReject = [
    'submitted',
    'pending',
    'in_review',
    'searching_doctor',
    'approved_pending_payment',
    'approved',
    'paid',
  ].includes(statusNorm);
  const canEdit = statusNorm === 'paid' && !isConsultation;
  const canAcceptConsult =
    isConsultation &&
    ['searching_doctor', 'submitted', 'pending'].includes(statusNorm);
  const canVideo =
    isConsultation &&
    [
      'paid',
      'consultation_accepted',
      'consultation_ready',
      'in_consultation',
    ].includes(statusNorm);
  const canPostConsult =
    isConsultation &&
    (statusNorm === 'consultation_finished' ||
      statusNorm === 'pending_post_consultation');
  const canSummary =
    isConsultation &&
    (statusNorm === 'consultation_finished' ||
      statusNorm === 'pending_post_consultation');
  const canCancel = [
    'submitted',
    'pending',
    'in_review',
    'searching_doctor',
  ].includes(statusNorm);
  const canDeliver = statusNorm === 'signed';
  const canGenPdf = statusNorm === 'paid' && reqType === 'prescription';
  const canDownload =
    !!request.signedDocumentUrl ||
    statusNorm === 'signed' ||
    statusNorm === 'delivered';

  /* ── Hierarquia: uma única ação primária (a dominante p/ status atual) ── */

  // Ordem de prioridade: a primeira condição que bater vira a primária.
  let primary: ActionDescriptor | null = null;
  if (canVideo) {
    primary = {
      key: 'video',
      label: 'Iniciar videoconsulta',
      icon: Video,
      onClick: () => navigate(`/video/${id}`),
    };
  } else if (canAcceptConsult) {
    primary = {
      key: 'accept',
      label: 'Aceitar consulta',
      icon: Stethoscope,
      onClick: onAcceptConsult,
      loadingKey: 'accept',
    };
  } else if (canPostConsult) {
    primary = {
      key: 'postConsult',
      label: 'Emitir documentos',
      icon: FileText,
      onClick: () => navigate(`/pos-consulta/${id}`),
    };
  } else if (canApprove) {
    primary = {
      key: 'approve',
      label: 'Aprovar',
      icon: CheckCircle2,
      onClick: onApprove,
      loadingKey: 'approve',
    };
  } else if (canGenPdf) {
    primary = {
      key: 'genPdf',
      label: 'Gerar PDF',
      icon: FileOutput,
      onClick: onGenPdf,
      loadingKey: 'genpdf',
    };
  } else if (canDeliver) {
    primary = {
      key: 'deliver',
      label: 'Marcar como entregue',
      icon: PackageCheck,
      onClick: onDeliver,
      loadingKey: 'deliver',
    };
  }

  const primaryKey = primary?.key;

  /* ── Ações secundárias: auxiliares não-destrutivas que não são primárias ── */
  const secondary: ActionDescriptor[] = [];
  if (canEdit) {
    secondary.push({
      key: 'edit',
      label: 'Editar receita',
      icon: Pen,
      onClick: () => navigate(`/pedidos/${id}/editor`),
    });
  }
  if (canSummary) {
    secondary.push({
      key: 'summary',
      label: 'Ver resumo',
      icon: ClipboardList,
      onClick: () => navigate(`/resumo-consulta/${id}`),
    });
  }
  if (canDownload) {
    secondary.push({
      key: 'download',
      label: 'Baixar documento',
      icon: Download,
      onClick: onDownloadPdf,
      loadingKey: 'download',
    });
  }
  // Estas três só entram em secundária se NÃO forem a primária
  if (canPostConsult && primaryKey !== 'postConsult') {
    secondary.push({
      key: 'postConsultSec',
      label: 'Emitir documentos',
      icon: FileText,
      onClick: () => navigate(`/pos-consulta/${id}`),
    });
  }
  if (canGenPdf && primaryKey !== 'genPdf') {
    secondary.push({
      key: 'genPdfSec',
      label: 'Gerar PDF',
      icon: FileOutput,
      onClick: onGenPdf,
      loadingKey: 'genpdf',
    });
  }
  if (canDeliver && primaryKey !== 'deliver') {
    secondary.push({
      key: 'deliverSec',
      label: 'Marcar entregue',
      icon: PackageCheck,
      onClick: onDeliver,
      loadingKey: 'deliver',
    });
  }

  /* ── Ações destrutivas: sempre um único "recusar/rejeitar" + cancelar ── */
  const destructive: ActionDescriptor[] = [];
  if (canReject) {
    destructive.push({
      key: 'reject',
      // "Recusar" para consulta ("paciente → médico"), "Rejeitar" para
      // receita/exame (decisão clínica sobre o pedido). Mesma função
      // por baixo — apenas label semanticamente adaptado.
      label: isConsultation ? 'Recusar consulta' : 'Rejeitar pedido',
      icon: XCircle,
      onClick: onRejectOpen,
    });
  }
  if (canCancel) {
    destructive.push({
      key: 'cancel',
      label: 'Cancelar pedido',
      icon: Ban,
      onClick: onCancel,
      loadingKey: 'cancel',
    });
  }

  const noActions =
    !primary && secondary.length === 0 && destructive.length === 0;
  const hasLoading = !!actionLoading;

  const awaitingPayment = isAwaitingPayment(request);
  const paymentInfo = getPaymentStatusInfo(request);

  return (
    <Card
      className={`shadow-sm lg:sticky lg:top-6 ${awaitingPayment ? 'border-amber-200 dark:border-amber-800' : ''}`}
    >
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Ações</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {/* ── Payment status banner ── */}
        {paymentInfo && (
          <div
            className={`mb-3 flex items-center gap-2.5 rounded-lg border p-3 ${paymentInfo.bgColor}`}
          >
            <paymentInfo.icon
              className={`h-4 w-4 shrink-0 ${paymentInfo.color}`}
              aria-hidden
            />
            <p className={`text-xs font-medium ${paymentInfo.color}`}>
              {paymentInfo.label}
            </p>
          </div>
        )}

        {noActions ? (
          <div className="py-4 text-center">
            <Clock className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Sem ações disponíveis
            </p>
          </div>
        ) : (
          <div className={`space-y-3 ${awaitingPayment ? 'opacity-60' : ''}`}>
            {/* ── Primária ── */}
            {primary &&
              (awaitingPayment ? (
                <Tooltip>
                  <TooltipTrigger className="w-full">
                    <Button
                      className="w-full cursor-not-allowed gap-2 bg-gray-400 text-white"
                      disabled
                    >
                      <Hourglass className="h-4 w-4" />
                      Aguardando pagamento
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    Aguarde o pagamento do paciente para prosseguir
                  </TooltipContent>
                </Tooltip>
              ) : (
                <Button
                  className="w-full gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
                  onClick={primary.onClick}
                  disabled={hasLoading}
                >
                  {primary.loadingKey &&
                  actionLoading === primary.loadingKey ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <primary.icon className="h-4 w-4" />
                  )}
                  {primary.label}
                </Button>
              ))}

            {/* ── Secundárias (grid 2-col quando couber) ── */}
            {secondary.length > 0 && (
              <div
                className={
                  secondary.length === 1
                    ? ''
                    : 'grid grid-cols-1 gap-2 sm:grid-cols-2'
                }
              >
                {secondary.map((action) => (
                  <Button
                    key={action.key}
                    variant="outline"
                    className="w-full gap-2"
                    onClick={action.onClick}
                    disabled={hasLoading}
                  >
                    {action.loadingKey &&
                    actionLoading === action.loadingKey ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <action.icon className="h-4 w-4" />
                    )}
                    {action.label}
                  </Button>
                ))}
              </div>
            )}

            {/* ── Destrutivas (separadas por divider) ── */}
            {destructive.length > 0 && (
              <>
                {(primary || secondary.length > 0) && (
                  <div className="border-t border-border/50" />
                )}
                <div
                  className={
                    destructive.length === 1
                      ? ''
                      : 'grid grid-cols-1 gap-2 sm:grid-cols-2'
                  }
                >
                  {destructive.map((action) => (
                    <Button
                      key={action.key}
                      variant="outline"
                      className="w-full gap-2 border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-950/30"
                      onClick={action.onClick}
                      disabled={hasLoading}
                    >
                      {action.loadingKey &&
                      actionLoading === action.loadingKey ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <action.icon className="h-4 w-4" />
                      )}
                      {action.label}
                    </Button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
