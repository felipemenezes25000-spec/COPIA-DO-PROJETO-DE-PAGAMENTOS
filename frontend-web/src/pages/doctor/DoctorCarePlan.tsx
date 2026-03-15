/**
 * DoctorCarePlan — Plano de cuidados (acesso por ID).
 * Versão melhorada: ações individuais por task, visualização de arquivos,
 * estados visuais detalhados. Alinhado ao mobile care-plans/[carePlanId].
 */
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DoctorLayout } from '@/components/doctor/DoctorLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  getCarePlan, reviewCarePlan, carePlanTaskAction,
  type CarePlan, type CarePlanTask, type CarePlanTaskFile,
} from '@/services/doctor-api-care-plans';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import {
  Loader2, ArrowLeft, ClipboardList, CheckCircle2, Clock,
  Play, FileText, Image, ExternalLink, AlertTriangle,
} from 'lucide-react';

function formatStatus(s: string): string {
  const map: Record<string, string> = {
    pending: 'Pendente', in_progress: 'Em andamento', submitted: 'Enviado',
    reviewed: 'Revisado', closed: 'Fechado', ready_for_review: 'Pronto p/ revisão',
    active: 'Ativo', completed: 'Concluído',
  };
  return map[s] || s.replace(/_/g, ' ');
}

function getStatusBadge(state: string) {
  switch (state) {
    case 'submitted': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    case 'reviewed': case 'completed': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200';
    case 'closed': return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
    case 'in_progress': return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200';
    default: return 'bg-muted text-muted-foreground';
  }
}

function formatType(s: string): string {
  const map: Record<string, string> = {
    exam: 'Exame', medication: 'Medicação', follow_up: 'Retorno',
    referral: 'Encaminhamento', lifestyle: 'Estilo de vida',
  };
  return map[s] || s.replace(/_/g, ' ');
}

function TaskFileList({ files }: { files: CarePlanTaskFile[] }) {
  if (!files?.length) return null;
  return (
    <div className="mt-3 space-y-2">
      <p className="text-xs font-medium text-muted-foreground">Arquivos ({files.length})</p>
      {files.map((f) => {
        const isImage = f.contentType?.startsWith('image/');
        return (
          <a
            key={f.id}
            href={f.fileUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 border border-border/50 hover:bg-muted transition-colors text-sm"
          >
            {isImage ? <Image className="h-4 w-4 text-primary shrink-0" /> : <FileText className="h-4 w-4 text-primary shrink-0" />}
            <span className="flex-1 truncate text-xs">{f.contentType || 'Arquivo'}</span>
            <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />
          </a>
        );
      })}
    </div>
  );
}

export default function DoctorCarePlan() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [taskAction, setTaskAction] = useState<string | null>(null);
  const [carePlan, setCarePlan] = useState<CarePlan | null>(null);

  useEffect(() => {
    document.title = 'Plano de Cuidados — RenoveJá+';
    return () => { document.title = 'RenoveJá+'; };
  }, []);

  useEffect(() => {
    if (!id) return;
    getCarePlan(id)
      .then(setCarePlan)
      .catch(() => {
        toast.error('Não foi possível carregar o plano');
        navigate('/consultas');
      })
      .finally(() => setLoading(false));
  }, [id, navigate]);

  const handleTaskAction = async (taskId: string, action: 'start' | 'complete' | 'submit_results') => {
    if (!carePlan) return;
    setTaskAction(taskId);
    try {
      const updated = await carePlanTaskAction(carePlan.id, taskId, action);
      setCarePlan(updated);
      toast.success(action === 'start' ? 'Tarefa iniciada' : action === 'complete' ? 'Tarefa concluída' : 'Resultados enviados');
    } catch {
      toast.error('Erro ao executar ação');
    } finally {
      setTaskAction(null);
    }
  };

  const handleReviewAndClose = async () => {
    if (!carePlan) return;
    setSaving(true);
    try {
      const decisions = carePlan.tasks.map((t) => ({
        taskId: t.id,
        decision: t.state === 'submitted' ? 'reviewed' : t.state === 'in_progress' ? 'closed' : t.state,
      }));
      const updated = await reviewCarePlan(carePlan.id, {
        closePlan: true,
        notes: 'Revisão concluída pelo médico responsável.',
        taskDecisions: decisions,
      });
      setCarePlan(updated);
      toast.success('Plano revisado e encerrado');
    } catch {
      toast.error('Erro ao encerrar plano');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DoctorLayout>
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Carregando plano...</p>
        </div>
      </DoctorLayout>
    );
  }

  if (!carePlan) {
    return (
      <DoctorLayout>
        <div className="text-center py-20">
          <p className="text-muted-foreground">Plano não encontrado</p>
          <Button variant="ghost" onClick={() => navigate('/consultas')} className="mt-4">
            Voltar às consultas
          </Button>
        </div>
      </DoctorLayout>
    );
  }

  const pendingTasks = carePlan.tasks.filter(t => t.state === 'pending');
  const inProgressTasks = carePlan.tasks.filter(t => t.state === 'in_progress');
  const submittedTasks = carePlan.tasks.filter(t => t.state === 'submitted');
  const closedTasks = carePlan.tasks.filter(t => ['reviewed', 'closed', 'completed'].includes(t.state));

  return (
    <DoctorLayout>
      <div className="space-y-6 max-w-2xl">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Voltar">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold tracking-tight">Plano de cuidados</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge className={getStatusBadge(carePlan.status)}>{formatStatus(carePlan.status)}</Badge>
              <span className="text-xs text-muted-foreground">
                {carePlan.tasks.length} tarefa{carePlan.tasks.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Pendentes', count: pendingTasks.length, icon: Clock, color: 'text-muted-foreground' },
            { label: 'Em andamento', count: inProgressTasks.length, icon: Play, color: 'text-amber-600' },
            { label: 'Enviadas', count: submittedTasks.length, icon: AlertTriangle, color: 'text-blue-600' },
            { label: 'Concluídas', count: closedTasks.length, icon: CheckCircle2, color: 'text-emerald-600' },
          ].map((stat) => (
            <div key={stat.label} className="p-3 rounded-xl bg-muted/50 text-center">
              <stat.icon className={`h-4 w-4 ${stat.color} mx-auto mb-1`} />
              <p className="text-lg font-bold">{stat.count}</p>
              <p className="text-[10px] text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Task list */}
        <div className="space-y-3">
          {carePlan.tasks.map((task: CarePlanTask, i: number) => {
            const canStart = task.state === 'pending';
            const canComplete = task.state === 'in_progress';
            const isSubmitted = task.state === 'submitted';
            const isDone = ['reviewed', 'closed', 'completed'].includes(task.state);
            let payload: Record<string, unknown> = {};
            try { payload = task.payloadJson ? JSON.parse(task.payloadJson) : {}; } catch { /* ignore parse error */ }

            return (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className={`shadow-sm ${isSubmitted ? 'border-blue-200 dark:border-blue-800' : isDone ? 'border-emerald-200 dark:border-emerald-800 opacity-75' : ''}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <ClipboardList className="h-4 w-4 text-primary" />
                        {task.title}
                      </CardTitle>
                      <Badge className={`text-[10px] ${getStatusBadge(task.state)}`}>
                        {formatStatus(task.state)}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground capitalize">
                      {formatType(task.type)}
                      {task.dueAt && ` · Prazo: ${new Date(task.dueAt).toLocaleDateString('pt-BR')}`}
                    </p>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {task.description && (
                      <p className="text-sm text-muted-foreground mb-2">{task.description}</p>
                    )}
                    {typeof payload.instructions === 'string' && payload.instructions && (
                      <p className="text-xs text-muted-foreground italic mb-2">
                        Instruções: {payload.instructions}
                      </p>
                    )}
                    {typeof payload.priority === 'string' && payload.priority && (
                      <Badge variant="outline" className="text-[10px] mb-2">
                        Prioridade: {payload.priority}
                      </Badge>
                    )}
                    <TaskFileList files={task.files} />
                    {(canStart || canComplete) && (
                      <div className="flex gap-2 mt-3">
                        {canStart && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleTaskAction(task.id, 'start')}
                            disabled={taskAction === task.id}
                            className="gap-1.5"
                          >
                            {taskAction === task.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
                            Iniciar
                          </Button>
                        )}
                        {canComplete && (
                          <Button
                            size="sm"
                            onClick={() => handleTaskAction(task.id, 'complete')}
                            disabled={taskAction === task.id}
                            className="gap-1.5"
                          >
                            {taskAction === task.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                            Concluir
                          </Button>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {carePlan.status === 'ready_for_review' && (
          <Button onClick={handleReviewAndClose} disabled={saving} className="w-full gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Revisar e encerrar plano
          </Button>
        )}
      </div>
    </DoctorLayout>
  );
}
