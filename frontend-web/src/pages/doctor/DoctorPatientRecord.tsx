import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DoctorLayout } from '@/components/doctor/DoctorLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  getPatientProfile, getPatientRequests, getPatientClinicalSummary,
  type PatientProfile, type MedicalRequest,
} from '@/services/doctorApi';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import {
  Loader2, ArrowLeft, User, Calendar, Phone, Mail, Heart,
  AlertTriangle, FileText, FlaskConical, Stethoscope, Clock,
  ChevronRight, Activity, Shield,
} from 'lucide-react';

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

export default function DoctorPatientRecord() {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<PatientProfile | null>(null);
  const [requests, setRequests] = useState<MedicalRequest[]>([]);
  const [, setSummary] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!patientId) return;
    setLoading(true);
    Promise.all([
      getPatientProfile(patientId),
      getPatientRequests(patientId).catch(() => []),
      getPatientClinicalSummary(patientId).catch(() => null),
    ])
      .then(([p, r, s]) => {
        setPatient(p);
        const list = Array.isArray(r) ? r : r?.items ?? r?.data ?? [];
        setRequests(list);
        setSummary(s);
      })
      .catch(() => toast.error('Erro ao carregar prontuário'))
      .finally(() => setLoading(false));
  }, [patientId]);

  if (loading) {
    return (
      <DoctorLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DoctorLayout>
    );
  }

  if (!patient) {
    return (
      <DoctorLayout>
        <div className="text-center py-20">
          <p className="text-muted-foreground">Paciente não encontrado</p>
          <Button variant="ghost" onClick={() => navigate(-1)} className="mt-4">Voltar</Button>
        </div>
      </DoctorLayout>
    );
  }

  const prescriptions = requests.filter(r => r.type === 'prescription');
  const examsReqs = requests.filter(r => r.type === 'exam');
  const consultations = requests.filter(r => r.type === 'consultation');

  const age = patient.birthDate
    ? Math.floor((Date.now() - new Date(patient.birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null;

  return (
    <DoctorLayout>
      <div className="space-y-6 max-w-5xl">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Voltar">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold tracking-tight">Prontuário do Paciente</h1>
        </div>

        {/* Patient card */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-start gap-5">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0">
                  {patient.avatarUrl ? (
                    <img src={patient.avatarUrl} alt={patient.name} className="w-16 h-16 rounded-2xl object-cover" />
                  ) : (
                    <User className="h-8 w-8 text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-bold">{patient.name}</h2>
                  <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
                    {patient.email && (
                      <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> {patient.email}</span>
                    )}
                    {patient.phone && (
                      <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> {patient.phone}</span>
                    )}
                    {age !== null && (
                      <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> {age} anos</span>
                    )}
                    {patient.gender && (
                      <span className="flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5" />
                        {patient.gender === 'male' ? 'Masculino' : patient.gender === 'female' ? 'Feminino' : patient.gender}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-3 shrink-0">
                  <div className="text-center p-3 rounded-xl bg-muted">
                    <p className="text-2xl font-bold">{requests.length}</p>
                    <p className="text-[10px] text-muted-foreground font-medium">ATENDIMENTOS</p>
                  </div>
                </div>
              </div>

              {/* Alerts */}
              <div className="flex flex-wrap gap-3 mt-4">
                {patient.allergies && patient.allergies.length > 0 && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-sm">
                    <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" aria-hidden />
                    <div>
                      <span className="font-medium text-red-700">Alergias:</span>{' '}
                      <span className="text-red-600">{patient.allergies.join(', ')}</span>
                    </div>
                  </div>
                )}
                {patient.chronicConditions && patient.chronicConditions.length > 0 && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-sm">
                    <Heart className="h-4 w-4 text-amber-500 shrink-0" aria-hidden />
                    <div>
                      <span className="font-medium text-amber-700">Condições crônicas:</span>{' '}
                      <span className="text-amber-600">{patient.chronicConditions.join(', ')}</span>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Tabs */}
        <Tabs defaultValue="overview">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="overview" className="gap-1.5">
              <Activity className="h-3.5 w-3.5" /> Visão Geral
            </TabsTrigger>
            <TabsTrigger value="prescriptions" className="gap-1.5">
              <FileText className="h-3.5 w-3.5" /> Receitas ({prescriptions.length})
            </TabsTrigger>
            <TabsTrigger value="exams" className="gap-1.5">
              <FlaskConical className="h-3.5 w-3.5" /> Exames ({examsReqs.length})
            </TabsTrigger>
            <TabsTrigger value="consultations" className="gap-1.5">
              <Stethoscope className="h-3.5 w-3.5" /> Consultas ({consultations.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 mt-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <Card className="shadow-sm">
                  <CardContent className="p-5 text-center">
                    <FileText className="h-8 w-8 text-primary mx-auto mb-2" />
                    <p className="text-3xl font-bold">{prescriptions.length}</p>
                    <p className="text-xs text-muted-foreground">Receitas</p>
                  </CardContent>
                </Card>
                <Card className="shadow-sm">
                  <CardContent className="p-5 text-center">
                    <FlaskConical className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                    <p className="text-3xl font-bold">{examsReqs.length}</p>
                    <p className="text-xs text-muted-foreground">Exames</p>
                  </CardContent>
                </Card>
                <Card className="shadow-sm">
                  <CardContent className="p-5 text-center">
                    <Stethoscope className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                    <p className="text-3xl font-bold">{consultations.length}</p>
                    <p className="text-xs text-muted-foreground">Consultas</p>
                  </CardContent>
                </Card>
              </div>

              {/* Recent */}
              <Card className="shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Atendimentos Recentes</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  {requests.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-6 text-center">Nenhum atendimento registrado</p>
                  ) : (
                    <div className="space-y-2">
                      {requests
                        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                        .slice(0, 10)
                        .map(req => {
                          const Icon = getTypeIcon(req.type);
                          return (
                            <button
                              key={req.id}
                              onClick={() => navigate(`/pedidos/${req.id}`)}
                              className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors text-left group"
                            >
                              <div className="p-2 rounded-lg bg-muted"><Icon className="h-4 w-4 text-muted-foreground" /></div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium">{getTypeLabel(req.type)}</p>
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {new Date(req.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </p>
                              </div>
                              <Badge variant="secondary" className="text-[10px]">{req.status}</Badge>
                              <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100" />
                            </button>
                          );
                        })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {['prescriptions', 'exams', 'consultations'].map(tab => {
            const list =
              tab === 'prescriptions' ? prescriptions :
              tab === 'exams' ? examsReqs :
              consultations;
            return (
              <TabsContent key={tab} value={tab}>
                <div className="space-y-2 mt-4">
                  {list.length === 0 ? (
                    <Card className="shadow-sm">
                      <CardContent className="py-12 text-center">
                        <p className="text-sm text-muted-foreground">Nenhum registro</p>
                      </CardContent>
                    </Card>
                  ) : (
                    list
                      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                      .map(req => {
                        const Icon = getTypeIcon(req.type);
                        return (
                          <Card
                            key={req.id}
                            className="shadow-sm hover:shadow-md cursor-pointer transition-all group"
                            onClick={() => navigate(`/pedidos/${req.id}`)}
                          >
                            <CardContent className="p-4 flex items-center gap-4">
                              <div className="p-3 rounded-xl bg-muted"><Icon className="h-5 w-5 text-muted-foreground" /></div>
                              <div className="flex-1">
                                <p className="font-medium text-sm">{getTypeLabel(req.type)}</p>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(req.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                                </p>
                              </div>
                              <Badge variant="secondary" className="text-[10px]">{req.status}</Badge>
                              {req.signedDocumentUrl && (
                                <div className="flex items-center gap-1 text-emerald-600">
                                  <Shield className="h-3.5 w-3.5" />
                                  <span className="text-[10px] font-medium">Assinado</span>
                                </div>
                              )}
                              <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100" />
                            </CardContent>
                          </Card>
                        );
                      })
                  )}
                </div>
              </TabsContent>
            );
          })}
        </Tabs>
      </div>
    </DoctorLayout>
  );
}
