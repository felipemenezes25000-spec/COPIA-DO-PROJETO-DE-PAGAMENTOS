import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { DoctorLayout } from '@/components/doctor/DoctorLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useDoctorAuth } from '@/contexts/DoctorAuthContext';
import { getRequests, type MedicalRequest } from '@/services/doctorApi';
import { motion } from 'framer-motion';
import {
  Loader2, Clock, FileText, Stethoscope, FlaskConical, ArrowRight,
  CheckCircle2, AlertTriangle, TrendingUp, Activity, User,
} from 'lucide-react';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

function getTypeIcon(type: string) {
  switch (type) {
    case 'prescription': return FileText;
    case 'exam': return FlaskConical;
    case 'consultation': return Stethoscope;
    default: return FileText;
  }
}

function getTypeLabel(type: string) {
  switch (type) {
    case 'prescription': return 'Receita';
    case 'exam': return 'Exame';
    case 'consultation': return 'Consulta';
    default: return type;
  }
}

function getStatusBadge(status: string) {
  const map: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    pending: { label: 'Pendente', variant: 'default' },
    approved: { label: 'Aprovado', variant: 'secondary' },
    paid: { label: 'Pago', variant: 'default' },
    signed: { label: 'Assinado', variant: 'secondary' },
    rejected: { label: 'Recusado', variant: 'destructive' },
    cancelled: { label: 'Cancelado', variant: 'destructive' },
    consultation_accepted: { label: 'Consulta aceita', variant: 'default' },
    in_consultation: { label: 'Em consulta', variant: 'default' },
    completed: { label: 'Concluído', variant: 'secondary' },
  };
  const s = map[status] || { label: status, variant: 'outline' as const };
  return <Badge variant={s.variant} className="text-[10px]">{s.label}</Badge>;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Agora';
  if (mins < 60) return `${mins}min atrás`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h atrás`;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

export default function DoctorDashboard() {
  const { user } = useDoctorAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<MedicalRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const data = await getRequests({ page: 1, pageSize: 100 });
      const list = Array.isArray(data) ? data : data?.items ?? data?.data ?? [];
      setRequests(list);
    } catch {
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, [loadData]);

  const pendentes = requests.filter(r => ['pending', 'paid', 'consultation_accepted'].includes(r.status));
  const hoje = requests.filter(r => {
    const d = new Date(r.createdAt);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  });
  const totalReceitas = requests.filter(r => r.type === 'prescription' && r.status === 'signed').length;
  const totalConsultas = requests.filter(r => r.type === 'consultation').length;

  const firstName = user?.name?.split(' ')[0] || 'Doutor(a)';

  const stats = [
    { label: 'Pendentes', value: pendentes.length, icon: Clock, color: 'text-orange-500', bg: 'bg-orange-500/10' },
    { label: 'Hoje', value: hoje.length, icon: TrendingUp, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Receitas assinadas', value: totalReceitas, icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { label: 'Consultas', value: totalConsultas, icon: Activity, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  ];

  const queue = pendentes.slice(0, 10);

  return (
    <DoctorLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              {getGreeting()}, {firstName}
            </h1>
            <p className="text-muted-foreground mt-1">
              {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
          {pendentes.length > 0 && (
            <Button onClick={() => navigate('/pedidos')} size="sm" className="gap-2">
              <FileText className="h-4 w-4" />
              Ver todos os pedidos
            </Button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {stats.map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                >
                  <Card className="shadow-sm hover:shadow-md transition-all duration-200 border-border/50">
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground font-medium">{stat.label}</p>
                          <p className="text-3xl font-bold mt-1 tracking-tight">{stat.value}</p>
                        </div>
                        <div className={`p-3 rounded-xl ${stat.bg}`}>
                          <stat.icon className={`h-5 w-5 ${stat.color}`} aria-hidden />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* Quick actions */}
            {pendentes.length > 0 && pendentes.some(r => r.type === 'consultation' && r.status === 'consultation_accepted') && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
                <Card className="border-primary/20 bg-primary/5">
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-primary/10">
                      <AlertTriangle className="h-5 w-5 text-primary" aria-hidden />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-sm">Consultas aguardando atendimento</p>
                      <p className="text-xs text-muted-foreground">
                        Você tem consultas aceitas que precisam ser iniciadas
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => navigate('/consultas')}
                      className="gap-1"
                    >
                      Atender
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Queue */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
              <Card className="shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Fila de Atendimento</CardTitle>
                    {pendentes.length > 10 && (
                      <Button variant="ghost" size="sm" onClick={() => navigate('/pedidos')} className="text-xs gap-1">
                        Ver todos ({pendentes.length})
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {queue.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                        <CheckCircle2 className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <p className="font-medium text-muted-foreground">Nenhum pedido pendente</p>
                      <p className="text-xs text-muted-foreground mt-1">Tudo em dia!</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {queue.map((req, i) => {
                        const Icon = getTypeIcon(req.type);
                        return (
                          <motion.button
                            key={req.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.4 + i * 0.05 }}
                            onClick={() => navigate(`/pedidos/${req.id}`)}
                            className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-muted/50 transition-all duration-150 text-left group border border-transparent hover:border-border/50"
                          >
                            <div className="p-2.5 rounded-xl bg-muted group-hover:bg-background transition-colors">
                              <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <User className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                                <p className="font-medium text-sm truncate">{req.patientName}</p>
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">{getTypeLabel(req.type)}</p>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              {getStatusBadge(req.status)}
                              <span className="text-xs text-muted-foreground">{formatDate(req.createdAt)}</span>
                              <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </motion.button>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </>
        )}
      </div>
    </DoctorLayout>
  );
}
