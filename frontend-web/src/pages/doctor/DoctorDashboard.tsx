import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { DoctorLayout } from '@/components/doctor/DoctorLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useDoctorAuth } from '@/hooks/useDoctorAuth';
import {
  getRequests,
  getDoctorStats,
  getActiveCertificate,
  type MedicalRequest,
  type DoctorStats,
} from '@/services/doctorApi';
import { useRequestEvents } from '@/hooks/useSignalR';
import {
  getGreeting,
  getTypeIcon,
  getTypeLabel,
  getStatusInfo,
  getRiskBadge,
  getWaitingTime,
  parseApiList,
  isActionableStatus,
} from '@/lib/doctor-helpers';
import { getUrgencyLabelPt } from '@/lib/aiCopilotHelpers';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock,
  FileText,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Wifi,
  WifiOff,
  Brain,
  Video,
  Shield,
  RefreshCw,
  Users,
  ClipboardList,
  Stethoscope,
  CalendarDays,
} from 'lucide-react';
import { toast } from 'sonner';
import { SkeletonStats, SkeletonQueue } from '@/components/ui/skeleton';

export default function DoctorDashboard() {
  const { user } = useDoctorAuth();
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'Painel — RenoveJá+';
    return () => {
      document.title = 'RenoveJá+';
    };
  }, []);

  const [requests, setRequests] = useState<MedicalRequest[]>([]);
  const [stats, setStats] = useState<DoctorStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasCertificate, setHasCertificate] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [reqData, statsData, certData] = await Promise.all([
        getRequests({ page: 1, pageSize: 50 }),
        getDoctorStats().catch(() => null),
        getActiveCertificate().catch(() => null),
      ]);
      const list = parseApiList<MedicalRequest>(reqData);
      setRequests(list);
      if (statsData) setStats(statsData);
      setHasCertificate(certData != null);
    } catch {
      setRequests([]);
      setError('Erro ao carregar dados do painel.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadData().catch(() => {
      /* handled in loadData */
    });
    const interval = setInterval(() => {
      if (!cancelled) loadData();
    }, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [loadData]);

  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { connected: realtimeConnected } = useRequestEvents(
    useCallback(
      (event: { requestId: string; status: string; message?: string }) => {
        const statusNorm = (event.status || '')
          .toLowerCase()
          .replace(/-/g, '_');

        if (statusNorm === 'in_consultation' && event.requestId) {
          if (window.location.pathname.includes(`/video/${event.requestId}`)) {
            loadData();
            return;
          }

          let remaining = 5;
          const toastId = toast.info(
            `Consulta iniciada! Entrando em ${remaining}s...`,
            {
              duration: 7000,
              action: {
                label: 'Entrar agora',
                onClick: () => {
                  if (countdownRef.current) {
                    clearInterval(countdownRef.current);
                    countdownRef.current = null;
                  }
                  navigate(`/video/${event.requestId}`);
                },
              },
            }
          );

          if (countdownRef.current) {
            clearInterval(countdownRef.current);
            countdownRef.current = null;
          }
          countdownRef.current = setInterval(() => {
            remaining -= 1;
            if (remaining <= 0) {
              if (countdownRef.current) {
                clearInterval(countdownRef.current);
                countdownRef.current = null;
              }
              toast.dismiss(toastId);
              navigate(`/video/${event.requestId}`);
            } else {
              toast.info(`Consulta iniciada! Entrando em ${remaining}s...`, {
                id: toastId,
                duration: 7000,
                action: {
                  label: 'Entrar agora',
                  onClick: () => {
                    if (countdownRef.current) {
                      clearInterval(countdownRef.current);
                      countdownRef.current = null;
                    }
                    navigate(`/video/${event.requestId}`);
                  },
                },
              });
            }
          }, 1000);
        } else {
          toast.info(`Pedido atualizado: ${event.status}`, {
            description: event.message || 'Um pedido foi atualizado',
            action: {
              label: 'Ver',
              onClick: () => navigate(`/pedidos/${event.requestId}`),
            },
          });
        }

        loadData();
      },
      [loadData, navigate]
    )
  );

  // Cleanup countdown on unmount
  useEffect(() => {
    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
    };
  }, []);

  const pendentes = requests.filter((r) => isActionableStatus(r.status));
  const consultasAtivas = requests.filter(
    (r) =>
      r.type === 'consultation' &&
      [
        'consultation_accepted',
        'in_consultation',
        'paid',
        'consultation_ready',
      ].includes(r.status?.toLowerCase() ?? '')
  );
  const comRiscoAlto = requests.filter(
    (r) =>
      r.aiRiskLevel &&
      (r.aiRiskLevel.toLowerCase().includes('high') ||
        r.aiRiskLevel.toLowerCase().includes('alto'))
  );
  const withAiSummary = requests
    .filter((r) => r.aiSummaryForDoctor)
    .slice(0, 3);

  const firstName = user?.name?.split(' ')[0] || 'Doutor(a)';

  function getMinutesSince(dateStr: string): number {
    return Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  }

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadData();
      toast.success('Dados atualizados');
    } catch {
      toast.error('Erro ao atualizar');
    } finally {
      setRefreshing(false);
    }
  };

  const statsCards = [
    {
      label: 'Pendentes',
      value: stats?.pendingCount ?? pendentes.length,
      icon: Clock,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-100 dark:bg-amber-900/40',
      ringColor: 'ring-amber-200 dark:ring-amber-800',
      urgent: (stats?.pendingCount ?? pendentes.length) > 0,
      filterParam: 'pending',
    },
    {
      label: 'Concluidos',
      value: stats?.completedCount ?? 0,
      icon: CheckCircle2,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-100 dark:bg-emerald-900/40',
      ringColor: 'ring-emerald-200 dark:ring-emerald-800',
      urgent: false,
      filterParam: 'completed',
    },
    {
      label: 'Receitas',
      value: requests.filter((r) => r.type === 'prescription').length,
      icon: ClipboardList,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-100 dark:bg-blue-900/40',
      ringColor: 'ring-blue-200 dark:ring-blue-800',
      urgent: false,
      filterParam: 'prescription',
    },
    {
      label: 'Consultas',
      value: requests.filter((r) => r.type === 'consultation').length,
      icon: Stethoscope,
      color: 'text-violet-600 dark:text-violet-400',
      bg: 'bg-violet-100 dark:bg-violet-900/40',
      ringColor: 'ring-violet-200 dark:ring-violet-800',
      urgent: false,
      filterParam: 'consultation',
    },
  ];

  const queue = pendentes
    .sort((a, b) => {
      const sa = getStatusInfo(a.status);
      const sb = getStatusInfo(b.status);
      if (sa.priority !== sb.priority) return sa.priority - sb.priority;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    })
    .slice(0, 15);

  const today = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <DoctorLayout>
      <div className="space-y-6 pb-8">
        {/* ── Greeting Header ── */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
        >
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl lg:text-4xl">
              {getGreeting()}, Dr(a). {firstName}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5 shrink-0" aria-hidden />
                <span className="capitalize">{today}</span>
              </span>
              <span className="hidden text-border sm:inline" aria-hidden>
                |
              </span>
              <span
                className={`flex items-center gap-1 text-xs font-medium ${realtimeConnected ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}
              >
                {realtimeConnected ? (
                  <>
                    <Wifi className="h-3 w-3" /> Tempo real ativo
                  </>
                ) : (
                  <>
                    <WifiOff className="h-3 w-3" /> Conectando...
                  </>
                )}
              </span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="gap-1.5"
              aria-label="Atualizar dados"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`}
              />
              <span className="hidden sm:inline">Atualizar</span>
            </Button>
            {pendentes.length > 0 && (
              <Button
                onClick={() => navigate('/pedidos')}
                size="sm"
                className="gap-1.5"
              >
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Ver pedidos</span>
                <Badge
                  variant="secondary"
                  className="ml-1 h-5 min-w-[1.25rem] border-0 bg-white/20 px-1.5 text-[10px] text-white"
                >
                  {pendentes.length}
                </Badge>
              </Button>
            )}
          </div>
        </motion.div>

        {/* ── Certificate Alert ── */}
        <AnimatePresence>
          {!loading && hasCertificate === false && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <Card className="rounded-xl border-amber-200 bg-amber-50/60 shadow-sm dark:border-amber-800 dark:bg-amber-950/20">
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="shrink-0 rounded-xl bg-amber-100 p-2.5 dark:bg-amber-900/50">
                    <Shield
                      className="h-5 w-5 text-amber-600 dark:text-amber-400"
                      aria-hidden
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                      Certificado Digital pendente
                    </p>
                    <p className="truncate text-xs text-amber-700 dark:text-amber-300">
                      Configure para assinar receitas digitalmente
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate('/perfil')}
                    className="shrink-0 gap-1 border-amber-300 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-300 dark:hover:bg-amber-900/50"
                  >
                    Configurar
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Loading State ── */}
        {loading && (
          <div className="space-y-6">
            <SkeletonStats />
            <SkeletonQueue count={5} />
          </div>
        )}

        {/* ── Error State ── */}
        {!loading && error && (
          <Card className="rounded-xl border-red-200 shadow-sm dark:border-red-900">
            <CardContent className="flex flex-col items-center justify-center gap-4 p-8 text-center">
              <div className="rounded-2xl bg-red-100 p-3 dark:bg-red-900/40">
                <AlertTriangle className="h-8 w-8 text-red-500 dark:text-red-400" />
              </div>
              <div>
                <p className="font-semibold text-red-800 dark:text-red-300">
                  {error}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Verifique sua conexao e tente novamente.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                className="gap-1.5"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Tentar novamente
              </Button>
            </CardContent>
          </Card>
        )}

        {!loading && !error && (
          <>
            {/* ── Queue Hero Card (gradient navy) ── */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.05 }}
            >
              <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-[#0C4A6E] to-[#075985] p-5 text-white shadow-lg sm:p-6">
                {/* Decorative circles */}
                <div
                  className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/5"
                  aria-hidden
                />
                <div
                  className="pointer-events-none absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-white/5"
                  aria-hidden
                />

                <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm">
                      <Users className="h-7 w-7 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-sky-200">
                        Fila de Atendimento
                      </p>
                      <p className="text-3xl font-bold tracking-tight sm:text-4xl">
                        {pendentes.length}
                      </p>
                      <p className="mt-0.5 text-xs text-sky-300">
                        {pendentes.length === 0
                          ? 'Nenhum paciente aguardando'
                          : pendentes.length === 1
                            ? 'paciente aguardando'
                            : 'pacientes aguardando'}
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={() => navigate('/pedidos')}
                    size="sm"
                    className="w-full gap-1.5 bg-white font-semibold text-[#0C4A6E] shadow-md hover:bg-sky-50 sm:w-auto"
                  >
                    Ver fila <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </motion.div>

            {/* ── Stats Grid (4 columns on desktop, 2 on tablet, 1 on small mobile) ── */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {statsCards.map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.06, duration: 0.35 }}
                >
                  <Card
                    className={`group cursor-pointer rounded-xl border-border/40 bg-white shadow-sm transition-all duration-200 hover:shadow-md dark:bg-card ${stat.urgent ? `ring-1 ${stat.ringColor}` : ''}`}
                    onClick={() =>
                      navigate(`/pedidos?status=${stat.filterParam}`)
                    }
                    role="button"
                    tabIndex={0}
                    aria-label={`Ver pedidos: ${stat.label} — ${stat.value}`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        navigate(`/pedidos?status=${stat.filterParam}`);
                      }
                    }}
                  >
                    <CardContent className="p-4 sm:p-5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                            {stat.label}
                          </p>
                          <p className="mt-1.5 text-2xl font-bold tracking-tight sm:text-3xl">
                            {stat.value}
                          </p>
                        </div>
                        <div
                          className={`rounded-xl p-2.5 ${stat.bg} shrink-0 transition-transform duration-200 group-hover:scale-110`}
                        >
                          <stat.icon
                            className={`h-5 w-5 ${stat.color}`}
                            aria-hidden
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* ── Alert Cards ── */}
            <AnimatePresence>
              {comRiscoAlto.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <Card className="rounded-xl border-red-200 bg-red-50/50 shadow-sm dark:border-red-900 dark:bg-red-950/20">
                    <CardContent className="flex flex-col items-start gap-3 p-4 sm:flex-row sm:items-center sm:gap-4">
                      <div className="shrink-0 rounded-xl bg-red-100 p-2.5 dark:bg-red-900/50">
                        <AlertTriangle
                          className="h-5 w-5 text-red-600 dark:text-red-400"
                          aria-hidden
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-red-800 dark:text-red-300">
                          {comRiscoAlto.length}{' '}
                          {comRiscoAlto.length === 1 ? 'pedido' : 'pedidos'} com
                          risco alto identificado pela IA
                        </p>
                        <p className="text-xs text-red-600 dark:text-red-400">
                          Requer atenção prioritária
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate('/pedidos')}
                        className="w-full shrink-0 gap-1 border-red-300 text-red-700 hover:bg-red-100 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-900/50 sm:w-auto"
                      >
                        Ver <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {consultasAtivas.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                >
                  <Card className="rounded-xl border-primary/20 bg-primary/5 shadow-sm dark:bg-primary/10">
                    <CardContent className="flex flex-col items-start gap-3 p-4 sm:flex-row sm:items-center sm:gap-4">
                      <div className="shrink-0 rounded-xl bg-primary/10 p-2.5 dark:bg-primary/20">
                        <Video className="h-5 w-5 text-primary" aria-hidden />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold">
                          {consultasAtivas.length} consulta(s) aguardando
                          atendimento
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {(() => {
                            const withStarted = consultasAtivas.find(
                              (r) => r.consultationStartedAt
                            );
                            if (withStarted?.consultationStartedAt) {
                              const min = getMinutesSince(
                                withStarted.consultationStartedAt
                              );
                              return min < 60
                                ? `Iniciada ha ${min}min`
                                : `Iniciada ha ${Math.floor(min / 60)}h`;
                            }
                            return 'Clique para iniciar videochamada com IA integrada';
                          })()}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => navigate('/consultas')}
                        className="w-full gap-1 sm:w-auto"
                      >
                        Atender <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Main Content: 2 column layout on large screens ── */}
            <div className="grid gap-6 lg:grid-cols-3">
              {/* ── Recent Requests (left 2/3) ── */}
              <motion.div
                className="lg:col-span-2"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25, duration: 0.4 }}
              >
                <Card className="rounded-xl border-border/40 shadow-sm">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg font-semibold">
                        Pedidos Recentes
                      </CardTitle>
                      {pendentes.length > 15 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate('/pedidos')}
                          className="gap-1 text-xs text-muted-foreground hover:text-foreground"
                        >
                          Ver todos ({pendentes.length}){' '}
                          <ArrowRight className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {queue.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/60 dark:bg-muted/30">
                          <CheckCircle2 className="h-8 w-8 text-emerald-400" />
                        </div>
                        <p className="font-semibold text-foreground">
                          Nenhum pedido pendente
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Tudo em dia! Novos pedidos aparecerao aqui em tempo
                          real.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {queue.map((req, i) => {
                          const Icon = getTypeIcon(req.type);
                          const statusInfo = getStatusInfo(req.status);
                          const risk = getRiskBadge(req.aiRiskLevel);
                          const waiting = getWaitingTime(req.createdAt);

                          return (
                            <motion.button
                              key={req.id}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.3 + i * 0.03 }}
                              onClick={() => navigate(`/pedidos/${req.id}`)}
                              className="group flex w-full items-center gap-3 rounded-xl border border-transparent p-3 text-left transition-all duration-150 hover:border-border/50 hover:bg-muted/50 dark:hover:bg-muted/20"
                            >
                              <div className="shrink-0 rounded-lg bg-muted/70 p-2 transition-colors group-hover:bg-background dark:bg-muted/30">
                                <Icon
                                  className="h-4 w-4 text-muted-foreground"
                                  aria-hidden
                                />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="truncate text-sm font-medium">
                                    {req.patientName}
                                  </p>
                                  {req.aiSummaryForDoctor && (
                                    <Sparkles
                                      className="h-3 w-3 shrink-0 text-primary"
                                      aria-label="Resumo de IA disponivel"
                                    />
                                  )}
                                </div>
                                <div className="mt-0.5 flex flex-wrap items-center gap-2">
                                  <span className="text-xs text-muted-foreground">
                                    {getTypeLabel(req.type)}
                                  </span>
                                  {req.priority &&
                                    req.priority !== 'normal' && (
                                      <span
                                        className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                                          req.priority === 'urgent'
                                            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                                            : req.priority === 'high'
                                              ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
                                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                        }`}
                                        title="Prioridade clínica"
                                      >
                                        {req.priority === 'urgent'
                                          ? 'Urgente'
                                          : req.priority === 'high'
                                            ? 'Alta'
                                            : 'Baixa'}
                                      </span>
                                    )}
                                  {req.requiredSpecialty && (
                                    <span
                                      className="rounded bg-muted/50 px-1.5 py-0.5 text-[10px] text-muted-foreground"
                                      title="Especialidade exigida"
                                    >
                                      {req.requiredSpecialty}
                                    </span>
                                  )}
                                  {req.aiUrgency && (
                                    <span className="text-[10px] text-amber-600 dark:text-amber-400">
                                      {getUrgencyLabelPt(req.aiUrgency)}
                                    </span>
                                  )}
                                </div>
                              </div>
                              {/* Status & waiting: stack on small screens */}
                              <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-2">
                                {risk && (
                                  <span
                                    className={`hidden rounded-full border px-2 py-0.5 text-[9px] font-bold sm:inline-block ${risk.color}`}
                                  >
                                    {risk.label}
                                  </span>
                                )}
                                <Badge
                                  variant={statusInfo.variant}
                                  className={`whitespace-nowrap text-[10px] ${statusInfo.color} ${statusInfo.bgColor}`}
                                >
                                  {statusInfo.label}
                                </Badge>
                                <span
                                  className={`text-[11px] ${waiting.urgent ? 'font-semibold text-red-500 dark:text-red-400' : 'text-muted-foreground'}`}
                                >
                                  {waiting.label}
                                </span>
                              </div>
                              <ArrowRight className="hidden h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 sm:block" />
                            </motion.button>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              {/* ── Sidebar (right 1/3): AI Summaries + AI Feature Banner ── */}
              <motion.div
                className="space-y-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35, duration: 0.4 }}
              >
                {/* AI Summaries */}
                <Card className="rounded-xl border-border/40 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base font-semibold">
                      <Sparkles className="h-4 w-4 text-primary" />
                      Resumos da IA
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {withAiSummary.length === 0 ? (
                      <div className="py-8 text-center">
                        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-muted/60 dark:bg-muted/30">
                          <Brain className="h-6 w-6 text-muted-foreground/60" />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Nenhum resumo de IA disponivel.
                        </p>
                        <p className="mt-1 text-[11px] text-muted-foreground/70">
                          Os resumos aparecerao quando a IA analisar novos
                          pedidos.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {withAiSummary.map((req) => (
                          <button
                            key={req.id}
                            onClick={() => navigate(`/pedidos/${req.id}`)}
                            className="group w-full rounded-lg border border-border/40 p-3 text-left transition-all duration-150 hover:border-primary/30 hover:bg-primary/5 dark:hover:bg-primary/10"
                          >
                            <div className="mb-1 flex items-center gap-2">
                              <p className="truncate text-sm font-medium">
                                {req.patientName}
                              </p>
                              <Badge
                                variant="outline"
                                className="shrink-0 text-[9px]"
                              >
                                {getTypeLabel(req.type)}
                              </Badge>
                            </div>
                            <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                              {req.aiSummaryForDoctor}
                            </p>
                            <p className="mt-1.5 flex items-center gap-1 text-[10px] text-primary opacity-0 transition-opacity group-hover:opacity-100">
                              Ver detalhes <ArrowRight className="h-3 w-3" />
                            </p>
                          </button>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* AI Feature Banner */}
                <Card className="rounded-xl border-border/40 bg-gradient-to-br from-background to-primary/[0.04] shadow-sm dark:to-primary/[0.08]">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="shrink-0 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 p-2 dark:from-primary/20 dark:to-primary/10">
                        <Sparkles className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">
                          Consulta Inteligente
                        </p>
                        <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                          Transcrição em tempo real, anamnese automática e
                          sugestões de conduta.
                        </p>
                        <Badge
                          variant="outline"
                          className="mt-2 gap-1 text-[9px]"
                        >
                          <Shield className="h-3 w-3" /> CFM 2.454/2026
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </>
        )}
      </div>
    </DoctorLayout>
  );
}
