import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { DoctorLayout } from '@/components/doctor/DoctorLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  approveRequest,
  rejectRequest,
  acceptConsultation,
  cancelRequest,
  markRequestDelivered,
  generatePdf,
  getDocumentDownloadUrl,
  getPatientProfile,
  type PatientProfile,
} from '@/services/doctorApi';
import {
  reopenAiRejection,
  claimRequest,
} from '@/services/doctor-api-requests';
import { useDoctorAuth } from '@/hooks/useDoctorAuth';
import { DOCTOR_REQUESTS_QUERY_KEY } from '@/hooks/useDoctorRequestsQuery';
import { doctorRequestDetailKeys } from '@/hooks/useDoctorRequestDetailQuery';
import {
  getTypeLabel,
  getTypeIcon,
  getStatusInfo,
  normalizeStatus,
} from '@/lib/doctor-helpers';
import { getUrgencyLabelPt } from '@/lib/aiCopilotHelpers';
import { StatusTracker } from '@/components/doctor/StatusTracker';
import { ConsultationPostSection } from '@/components/doctor/ConsultationPostSection';
import { PatientSidePanel } from '@/components/doctor/PatientSidePanel';
import { AiCopilotSection } from '@/components/doctor/request/AiCopilotSection';
import { PrescriptionImageGallery } from '@/components/doctor/request/PrescriptionImageGallery';
import { ConductForm } from '@/components/doctor/request/ConductForm';
import { AnamnesisCard } from '@/components/doctor/request/AnamnesisCard';
import { MedicationsCard } from '@/components/doctor/request/MedicationsCard';
import { ExamsCard } from '@/components/doctor/request/ExamsCard';
import { TranscriptionCard } from '@/components/doctor/request/TranscriptionCard';
import { RequestActionsCard } from '@/components/doctor/request/RequestActionsCard';
import { AssistantBanner } from '@/components/doctor/AssistantBanner';
import { useDoctorRequestDetailQuery } from '@/hooks/useDoctorRequestDetailQuery';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import {
  Loader2,
  ArrowLeft,
  User,
  Calendar,
  Phone,
  AlertTriangle,
  Shield,
  ChevronRight,
  Stethoscope,
} from 'lucide-react';

/** Normaliza symptoms para array (backend pode retornar string ou string[]). */
function normalizeSymptoms(symptoms: unknown): string[] {
  if (Array.isArray(symptoms))
    return symptoms.filter((s): s is string => typeof s === 'string');
  if (typeof symptoms === 'string' && symptoms.trim())
    return symptoms
      .split(/[,;]/)
      .map((s) => s.trim())
      .filter(Boolean);
  return [];
}

export default function DoctorRequestDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useDoctorAuth();

  const {
    data: request,
    isLoading: loading,
    refetch,
  } = useDoctorRequestDetailQuery(id);

  const [patient, setPatient] = useState<PatientProfile | null>(null);
  const [actionLoading, setActionLoading] = useState('');
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [sidePanelCollapsed, setSidePanelCollapsed] = useState(false);
  const [reopening, setReopening] = useState(false);
  const [reopenError, setReopenError] = useState<string | null>(null);
  const [isClaiming, setIsClaiming] = useState(false);

  useEffect(() => {
    document.title = id
      ? `Pedido #${id.slice(0, 8)} — RenoveJa+`
      : 'Pedido — RenoveJa+';
    return () => {
      document.title = 'RenoveJa+';
    };
  }, [id]);

  useEffect(() => {
    if (!request?.patientId) return;
    const controller = new AbortController();
    getPatientProfile(request.patientId)
      .then((p) => {
        if (!controller.signal.aborted) setPatient(p);
      })
      .catch(() => {
        if (!controller.signal.aborted) setPatient(null);
      });
    return () => controller.abort();
  }, [request?.patientId]);

  // ── Action handlers ──

  const handleApprove = async () => {
    if (!id) return;
    setActionLoading('approve');
    try {
      await approveRequest(id);
      toast.success('Pedido aprovado');
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao aprovar');
    } finally {
      setActionLoading('');
    }
  };

  const handleReject = async () => {
    if (!id) return;
    setActionLoading('reject');
    try {
      await rejectRequest(id, rejectReason);
      toast.success('Pedido recusado');
      setRejectOpen(false);
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao recusar');
    } finally {
      setActionLoading('');
    }
  };

  const handleAcceptConsultation = async () => {
    if (!id) return;
    setActionLoading('accept');
    try {
      await acceptConsultation(id);
      toast.success('Consulta aceita');
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao aceitar');
    } finally {
      setActionLoading('');
    }
  };

  const handleCancel = async () => {
    if (!id) return;
    setActionLoading('cancel');
    try {
      await cancelRequest(id);
      toast.success('Pedido cancelado');
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao cancelar');
    } finally {
      setActionLoading('');
    }
  };

  const handleMarkDelivered = async () => {
    if (!id) return;
    setActionLoading('deliver');
    try {
      await markRequestDelivered(id);
      toast.success('Pedido marcado como entregue');
      await refetch();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Erro ao marcar entrega'
      );
    } finally {
      setActionLoading('');
    }
  };

  const handleGeneratePdf = async () => {
    if (!id) return;
    setActionLoading('genpdf');
    try {
      const result = await generatePdf(id);
      toast.success(result.message || 'PDF gerado com sucesso');
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao gerar PDF');
    } finally {
      setActionLoading('');
    }
  };

  const handleReopenAiRejection = async () => {
    if (!id) return;
    setReopening(true);
    setReopenError(null);
    try {
      await reopenAiRejection(id);
      toast.success('Pedido reaberto para análise');
      await refetch();
    } catch (err) {
      setReopenError(
        err instanceof Error ? err.message : 'Erro ao reabrir pedido'
      );
    } finally {
      setReopening(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!id || !request) return;
    setActionLoading('download');
    try {
      const url =
        request.signedDocumentUrl || (await getDocumentDownloadUrl(id));
      if (!url) {
        toast.error('URL de download não disponível');
        return;
      }
      window.open(url, '_blank', 'noopener,noreferrer');
      toast.success('Download iniciado');
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Erro ao baixar documento'
      );
    } finally {
      setActionLoading('');
    }
  };

  const handleClaim = async () => {
    if (!id || !request || isClaiming) return;
    setIsClaiming(true);
    try {
      await claimRequest(id);
      await queryClient.invalidateQueries({
        queryKey: DOCTOR_REQUESTS_QUERY_KEY,
      });
      await queryClient.invalidateQueries({
        queryKey: doctorRequestDetailKeys.detail(id),
      });
      await refetch();
      toast.success('Pedido iniciado. Revisão em andamento.');
    } catch (err: unknown) {
      const apiErr = err as { status?: number; body?: { claimedBy?: string } };
      if (apiErr?.status === 409) {
        const holder = apiErr?.body?.claimedBy ?? 'Outro médico';
        toast.info(`${holder} já pegou este pedido.`);
        await queryClient.invalidateQueries({
          queryKey: DOCTOR_REQUESTS_QUERY_KEY,
        });
        navigate('/pedidos');
      } else {
        toast.error(
          err instanceof Error ? err.message : 'Erro ao iniciar revisão'
        );
      }
    } finally {
      setIsClaiming(false);
    }
  };

  // ── Loading / error states ──

  if (loading) {
    return (
      <DoctorLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DoctorLayout>
    );
  }

  if (!request) {
    return (
      <DoctorLayout>
        <div className="py-20 text-center">
          <p className="text-muted-foreground">Pedido não encontrado</p>
          <Button
            variant="ghost"
            onClick={() => navigate('/pedidos')}
            className="mt-4"
          >
            Voltar aos pedidos
          </Button>
        </div>
      </DoctorLayout>
    );
  }

  const statusInfo = getStatusInfo(request.status);
  const reqType = (request.type ?? '').toLowerCase();
  const Icon = getTypeIcon(reqType);
  const symptomsList = normalizeSymptoms(request.symptoms);

  return (
    <DoctorLayout>
      <div className="flex min-h-screen">
        {/* Main content */}
        {/* Main content toma 100% até xl: (1280px). De 1024-1279px o sidebar
            do paciente fica escondido para não esmagar o conteúdo principal.
            Antes era lg: (1024px), que exibia split-view em iPad landscape
            com main = 614px e sidebar = 410px, ambos apertados demais. */}
        <div className="min-w-0 flex-1 overflow-y-auto xl:flex-[0_0_60%]">
          <div className="max-w-4xl space-y-5">
            {/* ── Dark header (#0C4A6E) ── */}
            <div className="rounded-xl bg-sky-900 p-4 text-white sm:p-5">
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate('/pedidos')}
                  aria-label="Voltar"
                  className="shrink-0 text-white hover:bg-white/10"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <div className="shrink-0 rounded-lg bg-white/10 p-2">
                    <Icon className="h-5 w-5 text-white" aria-hidden />
                  </div>
                  <div className="min-w-0">
                    <h1 className="truncate text-lg font-bold tracking-tight sm:text-xl">
                      {getTypeLabel(reqType)}
                    </h1>
                    <p className="text-xs text-sky-200 sm:text-sm">
                      {new Date(request.createdAt).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
                <div
                  className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold sm:text-sm ${statusInfo.bgColor} ${statusInfo.color}`}
                >
                  {statusInfo.label}
                </div>
              </div>
            </div>

            {/* ── Status tracker ── */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
            >
              <StatusTracker status={request.status} type={reqType} />
            </motion.div>

            {/* ── Dra. Renova assistant ── */}
            <AssistantBanner
              requestId={request.id}
              requestStatus={request.status}
              requestType={reqType}
              onNavigate={(route) => navigate(route)}
            />

            {/* ── AI rejection banner ── */}
            {request.rejectionSource === 'Ai' &&
              normalizeStatus(request.status) === 'rejected' && (
                <div className="mb-4 rounded-md border-l-4 border-amber-500 bg-amber-50 p-4">
                  <div className="mb-1 font-semibold text-amber-800">
                    Este pedido foi rejeitado automaticamente pela IA
                  </div>
                  <div className="mb-3 text-sm text-gray-700">
                    <strong>Motivo:</strong> {request.aiRejectionReason ?? '—'}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleReopenAiRejection}
                      disabled={reopening}
                      className="rounded-md bg-amber-600 px-4 py-2 text-white hover:bg-amber-700 disabled:opacity-50"
                    >
                      {reopening ? 'Reabrindo…' : 'Reabrir para análise'}
                    </button>
                  </div>
                  {reopenError && (
                    <div role="alert" className="mt-2 text-sm text-red-600">
                      {reopenError}
                    </div>
                  )}
                </div>
              )}

            {/* ── Main content grid: stacks on mobile, side-by-side on desktop ── */}
            <div className="grid gap-5 lg:grid-cols-3">
              {/* Main column */}
              <div className="space-y-5 lg:col-span-2">
                {/* ── Patient card ── */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card className="overflow-hidden shadow-sm">
                    <CardContent className="p-4 sm:p-5">
                      {/* Avatar + name + prontuario button */}
                      <div className="mb-4 flex items-center gap-3 sm:gap-4">
                        <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 sm:h-12 sm:w-12">
                          <User className="h-5 w-5 text-primary sm:h-6 sm:w-6" />
                          {patient?.avatarUrl && (
                            <img
                              src={patient.avatarUrl}
                              alt=""
                              className="absolute inset-0 h-full w-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold sm:text-base">
                            {request.patientName}
                          </p>
                          {patient?.birthDate && (
                            <p className="text-xs text-muted-foreground">
                              {(() => {
                                const b = new Date(patient.birthDate!);
                                const t = new Date();
                                const age = t.getFullYear() - b.getFullYear();
                                const m = t.getMonth() - b.getMonth();
                                const finalAge =
                                  m < 0 ||
                                  (m === 0 && t.getDate() < b.getDate())
                                    ? age - 1
                                    : age;
                                return `${finalAge} anos`;
                              })()}
                              {patient.gender && (
                                <>
                                  {' '}
                                  ·{' '}
                                  {patient.gender === 'male'
                                    ? 'Masculino'
                                    : patient.gender === 'female'
                                      ? 'Feminino'
                                      : patient.gender}
                                </>
                              )}
                            </p>
                          )}
                        </div>
                        {request.patientId && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              navigate(`/paciente/${request.patientId}`)
                            }
                            className="shrink-0 gap-1 text-xs sm:text-sm"
                          >
                            Prontuário <ChevronRight className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>

                      {/* Info chips: type, urgency, UBS, CNS, phone */}
                      <div className="mb-3 flex flex-wrap gap-2">
                        <Badge variant="secondary" className="gap-1 text-xs">
                          <Icon className="h-3 w-3" aria-hidden />
                          {getTypeLabel(reqType)}
                        </Badge>
                        {request.aiUrgency && (
                          <Badge
                            variant="secondary"
                            className={`text-xs ${
                              request.aiUrgency.toLowerCase() === 'emergency'
                                ? 'bg-red-100 text-red-700'
                                : request.aiUrgency.toLowerCase() === 'urgent'
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-emerald-100 text-emerald-700'
                            }`}
                          >
                            {getUrgencyLabelPt(request.aiUrgency)}
                          </Badge>
                        )}
                        {patient?.phone && (
                          <Badge variant="secondary" className="gap-1 text-xs">
                            <Phone className="h-3 w-3" aria-hidden />
                            {patient.phone}
                          </Badge>
                        )}
                        {patient?.birthDate && (
                          <Badge variant="secondary" className="gap-1 text-xs">
                            <Calendar className="h-3 w-3" aria-hidden />
                            {new Date(patient.birthDate).toLocaleDateString(
                              'pt-BR'
                            )}
                          </Badge>
                        )}
                      </div>

                      {/* Allergies */}
                      {patient?.allergies && patient.allergies.length > 0 && (
                        <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950/20">
                          <p className="mb-1 flex items-center gap-1 text-xs font-semibold text-red-700 dark:text-red-400">
                            <AlertTriangle className="h-3.5 w-3.5" /> Alergias
                          </p>
                          <p className="text-sm text-red-600 dark:text-red-300">
                            {patient.allergies.join(', ')}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Anamnese (consultations) */}
                {reqType === 'consultation' &&
                  request.consultationAnamnesis && (
                    <AnamnesisCard
                      consultationAnamnesis={request.consultationAnamnesis}
                    />
                  )}

                {/* ── AI Copilot section (purple border) ── */}
                <AiCopilotSection request={request} />

                {/* Prescription / exam images */}
                {(request.prescriptionImages?.length ?? 0) > 0 && (
                  <PrescriptionImageGallery
                    images={request.prescriptionImages!}
                    label="Imagens da receita"
                    iconBgColor="bg-primary/10"
                  />
                )}
                {(request.examImages?.length ?? 0) > 0 && (
                  <PrescriptionImageGallery
                    images={request.examImages!}
                    label="Imagens do exame"
                    iconBgColor="bg-amber-100"
                  />
                )}

                {/* Symptoms */}
                {symptomsList.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    <Card className="shadow-sm">
                      <CardContent className="space-y-3 p-4 sm:p-5">
                        <p className="mb-2 text-xs font-medium text-muted-foreground">
                          Sintomas relatados
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {symptomsList.map((s, i) => (
                            <Badge
                              key={i}
                              variant="secondary"
                              className="text-xs"
                            >
                              {s}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}

                {/* ── Medications list (numbered) ── */}
                {Array.isArray(request.medications) &&
                  request.medications.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      <MedicationsCard medications={request.medications} />
                    </motion.div>
                  )}

                {/* Conduct (consultations) */}
                {reqType === 'consultation' && (
                  <ConductForm
                    requestId={request.id}
                    initialNotes={request.doctorConductNotes ?? ''}
                    initialIncludeInPdf={request.includeConductInPdf ?? false}
                    aiSuggestion={request.aiConductSuggestion}
                    onSaved={async () => {
                      await refetch();
                    }}
                  />
                )}

                {/* Transcription */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.22 }}
                >
                  <TranscriptionCard
                    transcript={request.consultationTranscript ?? ''}
                  />
                </motion.div>

                {/* AI suggestion (prescription/exam) */}
                {request.aiConductSuggestion && reqType !== 'consultation' && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.24 }}
                  >
                    <Card className="border-violet-200 bg-violet-50/30 shadow-sm dark:border-violet-500/40 dark:bg-violet-950/10">
                      <CardContent className="flex gap-3 p-4 sm:p-5">
                        <Stethoscope
                          className="mt-0.5 h-4 w-4 shrink-0 text-violet-600"
                          aria-hidden
                        />
                        <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                          {request.aiConductSuggestion}
                        </p>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}

                {/* Exams */}
                {Array.isArray(request.exams) && request.exams.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.21 }}
                  >
                    <ExamsCard exams={request.exams} />
                  </motion.div>
                )}

                {/* Post-consultation */}
                {reqType === 'consultation' &&
                  normalizeStatus(request.status) ===
                    'consultation_finished' && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.28 }}
                    >
                      <ConsultationPostSection
                        request={request}
                        requestId={id!}
                      />
                    </motion.div>
                  )}

                {/* Signed document */}
                {request.signedDocumentUrl && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                  >
                    <Card className="border-emerald-200 bg-emerald-50/50 shadow-sm dark:border-emerald-800 dark:bg-emerald-950/20">
                      <CardContent className="flex flex-wrap items-center gap-4 p-4 sm:p-5">
                        <div className="shrink-0 rounded-xl bg-emerald-100 p-3 dark:bg-emerald-900/40">
                          <Shield
                            className="h-5 w-5 text-emerald-600 dark:text-emerald-400"
                            aria-hidden
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                            Documento assinado digitalmente
                          </p>
                          <p className="text-xs text-emerald-600 dark:text-emerald-400">
                            Certificado ICP-Brasil
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleDownloadPdf}
                          className="shrink-0"
                        >
                          Ver PDF
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </div>
              {/* end main column */}

              {/* ── Actions sidebar ── */}
              <div className="space-y-4">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  {!request.doctorId && user?.role === 'doctor' ? (
                    <Card className="shadow-sm lg:sticky lg:top-6">
                      <CardContent className="space-y-3 p-4">
                        <div className="flex items-start gap-2 rounded-lg border border-sky-200 bg-sky-50 p-3">
                          <Stethoscope
                            className="mt-0.5 h-4 w-4 shrink-0 text-sky-600"
                            aria-hidden
                          />
                          <p className="text-sm text-sky-900">
                            Este pedido está disponível na fila. Clique em{' '}
                            <strong>Iniciar revisão</strong> para atendê-lo.
                          </p>
                        </div>
                        <Button
                          className="w-full gap-2 bg-sky-500 text-white hover:bg-sky-600 disabled:opacity-60"
                          onClick={handleClaim}
                          disabled={isClaiming}
                        >
                          {isClaiming ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Stethoscope className="h-4 w-4" />
                          )}
                          {isClaiming ? 'Carregando...' : 'Iniciar revisão'}
                        </Button>
                      </CardContent>
                    </Card>
                  ) : (
                    <RequestActionsCard
                      request={request}
                      id={id!}
                      actionLoading={actionLoading}
                      onApprove={handleApprove}
                      onRejectOpen={() => setRejectOpen(true)}
                      onAcceptConsult={handleAcceptConsultation}
                      onGenPdf={handleGeneratePdf}
                      onDownloadPdf={handleDownloadPdf}
                      onDeliver={handleMarkDelivered}
                      onCancel={handleCancel}
                    />
                  )}
                </motion.div>
              </div>
            </div>
            {/* end grid */}
          </div>
        </div>
        {/* end main content */}

        {/* Patient side panel */}
        <PatientSidePanel
          patientId={request.patientId}
          currentRequestId={id ?? undefined}
          collapsed={sidePanelCollapsed}
          onCollapsedChange={setSidePanelCollapsed}
        />
      </div>

      {/* Reject dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Recusar Pedido</DialogTitle>
            <DialogDescription>
              Informe o motivo da recusa (opcional)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Label htmlFor="reject-reason">Motivo</Label>
            <Textarea
              id="reject-reason"
              placeholder="Ex: Dados insuficientes, necessita exame complementar..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRejectOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!!actionLoading}
            >
              {actionLoading === 'reject' && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Confirmar recusa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DoctorLayout>
  );
}
