import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DoctorLayout } from '@/components/doctor/DoctorLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  getPatientProfile,
  getPatientRequests,
  getPatientClinicalSummary,
  addDoctorNote,
  type PatientProfile,
  type MedicalRequest,
  type DoctorNoteDto,
  type NoteSensitivity,
  DOCTOR_NOTE_TYPES,
  NOTE_SENSITIVITY_OPTIONS,
} from '@/services/doctorApi';
import { getTypeIcon, getTypeLabel, getStatusInfo } from '@/lib/doctor-helpers';
import { ClinicalTimeline } from '@/components/doctor/ClinicalTimeline';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import {
  Loader2,
  ArrowLeft,
  User,
  Phone,
  Mail,
  Heart,
  AlertTriangle,
  FileText,
  FlaskConical,
  Stethoscope,
  Clock,
  ChevronRight,
  Activity,
  ShieldCheck,
  FileStack,
  StickyNote,
  PlusCircle,
  Eye,
  Info,
  Search,
  X,
} from 'lucide-react';

type AlertCategory = 'allergy' | 'lacuna' | 'critical';

function parseAlertText(text: string): {
  category: AlertCategory;
  cleanText: string;
  isPositive: boolean;
} {
  const clean = text
    .replace(
      /^(?:\u{1F534}|\u{1F7E2}|\u{2139}\u{FE0F}?|\u{26A0}\u{FE0F}?|\u{1F6A8})\s*/gu,
      ''
    )
    .replace(/^\[ALERGIA\]\s*/i, '')
    .replace(/^\[LACUNA\]\s*/i, '')
    .trim();

  const isAllergy = text.includes('[ALERGIA]');
  const isLacuna = text.includes('[LACUNA]');
  const isPositiveAllergy =
    isAllergy &&
    /nkda|nenhuma|sem alergia|não informada|desconhecida|sem alergias conhecidas|no known/i.test(
      clean
    );

  return {
    category: isAllergy ? 'allergy' : isLacuna ? 'lacuna' : 'critical',
    cleanText: clean,
    isPositive: isPositiveAllergy,
  };
}

function ClinicalNotesForm({
  requests,
  onAdd,
}: {
  requests: MedicalRequest[];
  onAdd: (
    noteType: string,
    content: string,
    opts: {
      requestId?: string;
      sensitivity: NoteSensitivity;
      summaryForTeam?: string | null;
    }
  ) => Promise<void>;
}) {
  const [content, setContent] = useState('');
  const [noteType, setNoteType] = useState('progress_note');
  const [linkedRequestId, setLinkedRequestId] = useState<string | undefined>();
  const [sensitivity, setSensitivity] = useState<NoteSensitivity>('general');
  const [summaryForTeam, setSummaryForTeam] = useState('');
  const [adding, setAdding] = useState(false);

  // CFP 001/2009 + Lei 10.216/2001: quando a nota é privativa do autor,
  // exigimos um resumo seguro para que a equipe multidisciplinar consiga
  // dar continuidade ao cuidado sem acessar o texto completo.
  const requiresTeamSummary = sensitivity === 'author_only';
  const canSubmit =
    !!content.trim() &&
    (!requiresTeamSummary || summaryForTeam.trim().length > 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setAdding(true);
    try {
      await onAdd(noteType, content, {
        requestId: linkedRequestId,
        sensitivity,
        summaryForTeam: requiresTeamSummary ? summaryForTeam.trim() : null,
      });
      setContent('');
      setSummaryForTeam('');
      setSensitivity('general');
      setLinkedRequestId(undefined);
    } finally {
      setAdding(false);
    }
  };

  const sortedRequests = useMemo(
    () =>
      [...requests]
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
        .slice(0, 8),
    [requests]
  );

  return (
    <Card className="border-l-4 border-l-violet-500 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Nova nota clinica</CardTitle>
        <p className="text-xs text-muted-foreground">
          Registro de SOAP, impressoes e observacoes
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">
              Tipo da nota
            </p>
            <div
              className="mt-2 flex flex-wrap gap-2"
              role="group"
              aria-label="Tipo da nota"
            >
              {DOCTOR_NOTE_TYPES.map((t) => (
                <Button
                  key={t.key}
                  type="button"
                  variant={noteType === t.key ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setNoteType(t.key)}
                >
                  {t.label}
                </Button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">
              Confidencialidade
            </p>
            <div
              className="mt-2 flex flex-wrap gap-2"
              role="group"
              aria-label="Confidencialidade da nota"
            >
              {NOTE_SENSITIVITY_OPTIONS.map((opt) => (
                <Button
                  key={opt.key}
                  type="button"
                  variant={sensitivity === opt.key ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSensitivity(opt.key)}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
            <p className="mt-1.5 text-xs italic text-muted-foreground">
              {
                NOTE_SENSITIVITY_OPTIONS.find((o) => o.key === sensitivity)
                  ?.description
              }
            </p>
          </div>
          <div>
            <label
              htmlFor="doctor-note-content"
              className="text-xs font-medium uppercase text-muted-foreground"
            >
              Conteudo
            </label>
            <Textarea
              id="doctor-note-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Ex: Opto por associar medicacao X ao esquema atual..."
              className="mt-2 min-h-[88px]"
            />
          </div>
          {requiresTeamSummary && (
            <div>
              <label
                htmlFor="doctor-note-team-summary"
                className="text-xs font-medium uppercase text-muted-foreground"
              >
                Resumo para a equipe *
              </label>
              <Textarea
                id="doctor-note-team-summary"
                value={summaryForTeam}
                onChange={(e) => setSummaryForTeam(e.target.value)}
                placeholder="Resumo clínico seguro compartilhável com outros profissionais."
                className="mt-2 min-h-[72px]"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Outros médicos verão apenas este resumo — não o texto completo.
              </p>
            </div>
          )}
          {sortedRequests.length > 0 && (
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">
                Vincular a atendimento (opcional)
              </p>
              <div
                className="mt-2 flex flex-wrap gap-2"
                role="group"
                aria-label="Vincular a atendimento"
              >
                <Button
                  type="button"
                  variant={!linkedRequestId ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setLinkedRequestId(undefined)}
                >
                  Nenhum
                </Button>
                {sortedRequests.map((r) => {
                  const reqType =
                    r.type || (r as { requestType?: string }).requestType || '';
                  return (
                    <Button
                      key={r.id}
                      type="button"
                      variant={linkedRequestId === r.id ? 'default' : 'outline'}
                      size="sm"
                      onClick={() =>
                        setLinkedRequestId(
                          linkedRequestId === r.id ? undefined : r.id
                        )
                      }
                    >
                      {getTypeLabel(reqType)} ·{' '}
                      {new Date(r.createdAt).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'short',
                      })}
                    </Button>
                  );
                })}
              </div>
            </div>
          )}
          <Button
            type="submit"
            disabled={!canSubmit || adding}
            className="gap-2"
          >
            {adding && <Loader2 className="h-4 w-4 animate-spin" />}
            Registrar nota
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function DoctorPatientRecord() {
  const { patientId } = useParams<{ patientId: string }>();

  useEffect(() => {
    document.title = 'Prontuário — RenoveJá+';
    return () => {
      document.title = 'RenoveJa+';
    };
  }, []);
  const navigate = useNavigate();
  const [patient, setPatient] = useState<PatientProfile | null>(null);
  const [requests, setRequests] = useState<MedicalRequest[]>([]);
  const [summaryData, setSummaryData] = useState<{
    structured?: {
      problemList?: string[];
      activeMedications?: string[];
      narrativeSummary?: string;
      alerts?: string[];
    } | null;
    doctorNotes?: DoctorNoteDto[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!patientId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [p, r, s] = await Promise.all([
        getPatientProfile(patientId),
        getPatientRequests(patientId).catch(() => []),
        getPatientClinicalSummary(patientId).catch(() => null),
      ]);
      setPatient(p);
      setRequests(Array.isArray(r) ? r : []);
      setSummaryData(
        s
          ? {
              structured: s.structured ?? null,
              doctorNotes: s.doctorNotes ?? [],
            }
          : null
      );
    } catch {
      toast.error('Erro ao carregar prontuário');
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const age = useMemo(() => {
    if (!patient?.birthDate) return null;
    const nowMs = Date.now();
    return Math.floor(
      (nowMs - new Date(patient.birthDate).getTime()) /
        (365.25 * 24 * 60 * 60 * 1000)
    );
  }, [patient?.birthDate]);

  const handleAddNote = useCallback(
    async (
      noteType: string,
      content: string,
      opts: {
        requestId?: string;
        sensitivity: NoteSensitivity;
        summaryForTeam?: string | null;
      }
    ) => {
      if (!patientId || !content.trim()) return;
      try {
        const note = await addDoctorNote(patientId, {
          noteType,
          content: content.trim(),
          requestId: opts.requestId,
          sensitivity: opts.sensitivity,
          summaryForTeam: opts.summaryForTeam ?? null,
        });
        setSummaryData((prev) => ({
          ...(prev ?? {}),
          doctorNotes: [note, ...(prev?.doctorNotes ?? [])],
        }));
        toast.success('Nota registrada');
      } catch {
        toast.error('Não foi possível registrar a nota');
      }
    },
    [patientId]
  );

  const prescriptions = requests.filter((r) => r.type === 'prescription');
  const examsReqs = requests.filter((r) => r.type === 'exam');
  const consultations = requests.filter((r) => r.type === 'consultation');
  const doctorNotes = summaryData?.doctorNotes ?? [];
  const documentsCount = prescriptions.length + examsReqs.length;
  const activeMedications = summaryData?.structured?.activeMedications ?? [];

  // Busca na aba Documentos: filtra prescrições + exames por nome dos
  // itens, sintomas, notas e tipo. Case-insensitive e insensível a acentos.
  const [docSearch, setDocSearch] = useState('');
  const normalizedSearch = docSearch
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  const filteredDocs = useMemo(() => {
    const all = [...prescriptions, ...examsReqs];
    if (!normalizedSearch) return all;
    const matchesTerm = (text: string | undefined | null): boolean => {
      if (!text) return false;
      return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .includes(normalizedSearch);
    };
    return all.filter((req) => {
      if (matchesTerm(req.symptoms)) return true;
      if (matchesTerm(req.notes)) return true;
      if (matchesTerm(req.type)) return true;
      const meds = req.medications ?? [];
      if (meds.some((m) => matchesTerm(m))) return true;
      const exams = req.exams ?? [];
      if (exams.some((e) => matchesTerm(e))) return true;
      return false;
    });
    // prescriptions/examsReqs vêm de requests.filter na mesma render —
    // listá-los aqui garantiria recálculo desnecessário, então dependemos
    // de `requests` diretamente para que o memo seja estável.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requests, normalizedSearch]);

  const getNoteIcon = (key: string) => {
    const t = DOCTOR_NOTE_TYPES.find((x) => x.key === key);
    if (t?.icon === 'Stethoscope') return Stethoscope;
    if (t?.icon === 'PlusCircle') return PlusCircle;
    if (t?.icon === 'Eye') return Eye;
    return FileText;
  };

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
        <div className="py-20 text-center">
          <p className="text-muted-foreground">Paciente não encontrado</p>
          <Button variant="ghost" onClick={() => navigate(-1)} className="mt-4">
            Voltar
          </Button>
        </div>
      </DoctorLayout>
    );
  }

  return (
    <DoctorLayout>
      <div className="mx-auto max-w-5xl space-y-4 px-2 sm:space-y-6 sm:px-0">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            aria-label="Voltar"
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold tracking-tight sm:text-xl">
            Prontuário
          </h1>
        </div>

        {/* Patient identity card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="shadow-sm">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="relative flex h-[52px] w-[52px] shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-primary/20 to-primary/5">
                  <User className="h-6 w-6 text-primary" />
                  {patient.avatarUrl && (
                    <img
                      src={patient.avatarUrl}
                      alt={patient.name}
                      className="absolute inset-0 h-[52px] w-[52px] rounded-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-base font-bold sm:text-lg">
                    {patient.name}
                  </h2>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-muted-foreground">
                    {age !== null && <span>{age} anos</span>}
                    {age !== null && patient.gender && (
                      <span className="hidden sm:inline">·</span>
                    )}
                    {patient.gender && (
                      <span>
                        {patient.gender === 'male'
                          ? 'Masculino'
                          : patient.gender === 'female'
                            ? 'Feminino'
                            : patient.gender}
                      </span>
                    )}
                    {'cpf' in patient &&
                      (patient as unknown as { cpf?: string }).cpf && (
                        <>
                          <span className="hidden sm:inline">·</span>
                          <span>CPF ***</span>
                        </>
                      )}
                  </p>
                  {/* Contact info - visible on larger screens */}
                  <div className="mt-1.5 hidden flex-wrap gap-3 text-xs text-muted-foreground sm:flex">
                    {patient.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" /> {patient.email}
                      </span>
                    )}
                    {patient.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" /> {patient.phone}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Contact info - mobile only */}
              <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground sm:hidden">
                {patient.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="h-3 w-3" />{' '}
                    <span className="max-w-[180px] truncate">
                      {patient.email}
                    </span>
                  </span>
                )}
                {patient.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3" /> {patient.phone}
                  </span>
                )}
              </div>

              {/* Allergy banner */}
              {patient.allergies && patient.allergies.length > 0 && (
                <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm">
                  <AlertTriangle
                    className="mt-0.5 h-4 w-4 shrink-0 text-red-500"
                    aria-hidden
                  />
                  <div className="min-w-0">
                    <span className="font-semibold text-red-700">Alergia:</span>{' '}
                    <span className="text-red-600">
                      {patient.allergies.join(', ')}
                    </span>
                  </div>
                </div>
              )}

              {/* Chronic conditions banner */}
              {patient.chronicConditions &&
                patient.chronicConditions.length > 0 && (
                  <div className="mt-2 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm">
                    <Heart
                      className="mt-0.5 h-4 w-4 shrink-0 text-amber-500"
                      aria-hidden
                    />
                    <div className="min-w-0">
                      <span className="font-semibold text-amber-700">
                        Condições crônicas:
                      </span>{' '}
                      <span className="text-amber-600">
                        {patient.chronicConditions.join(', ')}
                      </span>
                    </div>
                  </div>
                )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Tabs with horizontal scroll on mobile */}
        <Tabs defaultValue="overview">
          <div className="scrollbar-none -mx-2 overflow-x-auto px-2 sm:mx-0 sm:px-0">
            <TabsList className="h-auto w-max justify-start gap-0 rounded-none border-b border-border bg-transparent p-0 sm:w-full">
              <TabsTrigger
                value="overview"
                className="gap-1.5 whitespace-nowrap rounded-none border-b-2 border-transparent px-3 py-2.5 text-sm data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none sm:px-4"
              >
                <Activity className="hidden h-3.5 w-3.5 sm:block" /> Visão Geral
              </TabsTrigger>
              <TabsTrigger
                value="consultations"
                className="gap-1.5 whitespace-nowrap rounded-none border-b-2 border-transparent px-3 py-2.5 text-sm data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none sm:px-4"
              >
                <Stethoscope className="hidden h-3.5 w-3.5 sm:block" />{' '}
                Consultas ({consultations.length})
              </TabsTrigger>
              <TabsTrigger
                value="documents"
                className="gap-1.5 whitespace-nowrap rounded-none border-b-2 border-transparent px-3 py-2.5 text-sm data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none sm:px-4"
              >
                <FileStack className="hidden h-3.5 w-3.5 sm:block" /> Docs (
                {documentsCount})
              </TabsTrigger>
              <TabsTrigger
                value="notes"
                className="gap-1.5 whitespace-nowrap rounded-none border-b-2 border-transparent px-3 py-2.5 text-sm data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none sm:px-4"
              >
                <StickyNote className="hidden h-3.5 w-3.5 sm:block" /> Notas (
                {doctorNotes.length})
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Overview tab */}
          <TabsContent value="overview">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-4 space-y-4"
            >
              {/* Nota: a grid de antropometria (Peso/Altura/IMC/Tipo sanguíneo)
                  foi removida porque o schema PatientProfile não tem esses
                  campos — os 4 cards mostravam "--" permanentemente, apenas
                  ocupando espaço. Quando houver data binding real, basta
                  reintroduzir o grid lendo de patient.weight/height/etc. */}

              {/* Active conditions as colored chips */}
              {summaryData?.structured?.problemList &&
                summaryData.structured.problemList.length > 0 && (
                  <Card className="shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-semibold">
                        Condições ativas
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex flex-wrap gap-2">
                        {summaryData.structured.problemList.map(
                          (problem, i) => (
                            <Badge
                              key={i}
                              variant="secondary"
                              className="border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs text-blue-700 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300"
                            >
                              {problem}
                            </Badge>
                          )
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

              {/* Active medications list */}
              {activeMedications.length > 0 && (
                <Card className="shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">
                      Medicamentos em uso
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <ul className="space-y-1.5">
                      {activeMedications.map((med, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm">
                          <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                          <span>{med}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Structured summary (AI) */}
              {summaryData?.structured &&
              (summaryData.structured.narrativeSummary ||
                summaryData.structured.alerts?.length) ? (
                <Card className="border-primary/10 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">
                      Resumo clínico
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-0">
                    {summaryData.structured.narrativeSummary && (
                      <p className="text-sm text-muted-foreground">
                        {summaryData.structured.narrativeSummary}
                      </p>
                    )}
                    {summaryData.structured.alerts &&
                      summaryData.structured.alerts.length > 0 &&
                      (() => {
                        const alerts = summaryData.structured!.alerts!;
                        const parsed = alerts.map((a) => parseAlertText(a));
                        const allergyAlerts = parsed.filter(
                          (p) => p.category === 'allergy'
                        );
                        const lacunas = parsed.filter(
                          (p) => p.category === 'lacuna'
                        );
                        const criticalAlerts = parsed.filter(
                          (p) => p.category === 'critical'
                        );

                        return (
                          <div className="space-y-3">
                            {allergyAlerts.length > 0 && (
                              <div className="space-y-2">
                                {allergyAlerts.map((a, i) => (
                                  <div
                                    key={`allergy-${i}`}
                                    className={`flex items-center gap-3 rounded-lg border p-3 text-sm ${
                                      a.isPositive
                                        ? 'border-emerald-100 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200'
                                        : 'border-red-100 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/30 dark:text-red-200'
                                    }`}
                                  >
                                    {a.isPositive ? (
                                      <ShieldCheck
                                        className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-500"
                                        aria-hidden
                                      />
                                    ) : (
                                      <AlertTriangle
                                        className="h-4 w-4 shrink-0 text-red-600 dark:text-red-500"
                                        aria-hidden
                                      />
                                    )}
                                    <span className="min-w-0 break-words">
                                      {a.isPositive
                                        ? `${a.cleanText}`
                                        : a.cleanText}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}

                            {criticalAlerts.length > 0 && (
                              <div className="space-y-2">
                                {criticalAlerts.map((a, i) => (
                                  <div
                                    key={`alert-${i}`}
                                    className="flex items-center gap-3 rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/30 dark:text-red-200"
                                  >
                                    <AlertTriangle
                                      className="h-4 w-4 shrink-0 text-red-600 dark:text-red-500"
                                      aria-hidden
                                    />
                                    <span className="min-w-0 break-words">
                                      {a.cleanText}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}

                            {lacunas.length > 0 && (
                              <div className="rounded-lg bg-muted/30 p-3">
                                <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                  <Info className="h-3.5 w-3.5" aria-hidden />
                                  Informações pendentes
                                </p>
                                <ul className="space-y-1 text-sm text-muted-foreground">
                                  {lacunas.map((a, i) => (
                                    <li
                                      key={`lacuna-${i}`}
                                      className="flex gap-2"
                                    >
                                      <span className="text-muted-foreground/60">
                                        ·
                                      </span>
                                      <span>{a.cleanText}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                  </CardContent>
                </Card>
              ) : null}

              {/* SOAP notes section — mostra até 3 notas mais recentes por inteiro.
                  Antes usava line-clamp-2 que truncava o diagnóstico em 2 linhas:
                  inaceitável para prontuário (médico lia só o "S" do SOAP).
                  Agora o conteúdo vem completo; se ficar longo o card expande. */}
              {doctorNotes.length > 0 && (
                <Card className="border-l-4 border-l-violet-400 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">
                      Notas SOAP recentes
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-0">
                    {doctorNotes.slice(0, 3).map((note) => (
                      <div
                        key={note.id}
                        className="border-b border-border pb-3 text-sm last:border-0 last:pb-0"
                      >
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <Badge
                            variant="secondary"
                            className="gap-1 text-[10px]"
                          >
                            {(() => {
                              const I = getNoteIcon(note.noteType);
                              return <I className="h-2.5 w-2.5" />;
                            })()}
                            {DOCTOR_NOTE_TYPES.find(
                              (t) => t.key === note.noteType
                            )?.label ?? note.noteType}
                          </Badge>
                          <span className="shrink-0 text-[10px] text-muted-foreground">
                            {new Date(note.createdAt).toLocaleString('pt-BR')}
                          </span>
                        </div>
                        <p className="whitespace-pre-wrap break-words text-sm text-foreground/80">
                          {note.content}
                        </p>
                      </div>
                    ))}
                    {doctorNotes.length > 3 && (
                      <p className="pt-1 text-center text-xs italic text-muted-foreground">
                        + {doctorNotes.length - 3}{' '}
                        {doctorNotes.length - 3 === 1
                          ? 'nota mais antiga'
                          : 'notas mais antigas'}{' '}
                        na aba "Notas"
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Stats grid: 3 cols on desktop, full width stacked on mobile */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Card className="shadow-sm">
                  <CardContent className="flex items-center gap-3 p-4 sm:flex-col sm:p-5 sm:text-center">
                    <FileText className="h-6 w-6 shrink-0 text-primary sm:h-8 sm:w-8" />
                    <div className="sm:mt-1">
                      <p className="text-2xl font-bold sm:text-3xl">
                        {prescriptions.length}
                      </p>
                      <p className="text-xs text-muted-foreground">Receitas</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="shadow-sm">
                  <CardContent className="flex items-center gap-3 p-4 sm:flex-col sm:p-5 sm:text-center">
                    <FlaskConical className="h-6 w-6 shrink-0 text-blue-500 sm:h-8 sm:w-8" />
                    <div className="sm:mt-1">
                      <p className="text-2xl font-bold sm:text-3xl">
                        {examsReqs.length}
                      </p>
                      <p className="text-xs text-muted-foreground">Exames</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="shadow-sm">
                  <CardContent className="flex items-center gap-3 p-4 sm:flex-col sm:p-5 sm:text-center">
                    <Stethoscope className="h-6 w-6 shrink-0 text-emerald-500 sm:h-8 sm:w-8" />
                    <div className="sm:mt-1">
                      <p className="text-2xl font-bold sm:text-3xl">
                        {consultations.length}
                      </p>
                      <p className="text-xs text-muted-foreground">Consultas</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recent requests */}
              <Card className="shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold">
                    Atendimentos Recentes
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  {requests.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">
                      Nenhum atendimento registrado
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {requests
                        .sort(
                          (a, b) =>
                            new Date(b.createdAt).getTime() -
                            new Date(a.createdAt).getTime()
                        )
                        .slice(0, 10)
                        .map((req) => {
                          const reqType =
                            req.type ||
                            (req as { requestType?: string }).requestType ||
                            '';
                          const Icon = getTypeIcon(reqType);
                          const statusInfo = getStatusInfo(req.status);
                          return (
                            <button
                              key={req.id}
                              onClick={() => navigate(`/pedidos/${req.id}`)}
                              className="group flex w-full items-center gap-3 rounded-xl p-3 text-left transition-colors hover:bg-muted/50"
                            >
                              <div className="shrink-0 rounded-lg bg-muted p-2">
                                <Icon className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium">
                                  {getTypeLabel(reqType)}
                                </p>
                                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Clock className="h-3 w-3 shrink-0" />
                                  {new Date(req.createdAt).toLocaleDateString(
                                    'pt-BR',
                                    {
                                      day: '2-digit',
                                      month: 'short',
                                      year: 'numeric',
                                    }
                                  )}
                                </p>
                              </div>
                              <Badge
                                variant={statusInfo.variant}
                                className={`shrink-0 text-[10px] ${statusInfo.color} ${statusInfo.bgColor} border`}
                              >
                                {statusInfo.label}
                              </Badge>
                              <ChevronRight className="hidden h-4 w-4 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 sm:block" />
                            </button>
                          );
                        })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Consultations tab — timeline vertical agrupada por mês.
              Antes era uma lista flat; agora o médico vê a evolução
              cronológica do paciente de relance, com marker colorido
              para cada mês e markers neutros para cada consulta. */}
          <TabsContent value="consultations">
            <div className="mt-4">
              <ClinicalTimeline
                items={consultations}
                onItemClick={(id) => navigate(`/pedidos/${id}`)}
                emptyLabel="Nenhuma consulta registrada"
                emptyIcon={
                  <Stethoscope className="mx-auto mb-2 h-10 w-10 text-muted-foreground/30" />
                }
              />
            </div>
          </TabsContent>

          {/* Documents tab — busca + timeline reutilizando ClinicalTimeline.
              Antes era lista flat sem busca; em pacientes com histórico
              extenso ficava inutilizável (scroll infinito sem filtro).
              Busca é case-insensitive e ignora acentos — filtra por nome
              dos medicamentos, exames, sintomas, notas e tipo. */}
          <TabsContent value="documents">
            <div className="mt-4 space-y-4">
              {documentsCount > 0 && (
                <div className="relative">
                  <Search
                    className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden
                  />
                  <Input
                    type="search"
                    value={docSearch}
                    onChange={(e) => setDocSearch(e.target.value)}
                    placeholder="Buscar por medicamento, exame, sintoma..."
                    className="pl-9 pr-9"
                    aria-label="Buscar no histórico de documentos"
                  />
                  {docSearch && (
                    <button
                      type="button"
                      onClick={() => setDocSearch('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      aria-label="Limpar busca"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              )}

              {documentsCount > 0 && normalizedSearch && (
                <p className="text-xs text-muted-foreground">
                  {filteredDocs.length === 0
                    ? `Nenhum documento encontrado para "${docSearch.trim()}"`
                    : `${filteredDocs.length} de ${documentsCount} ${filteredDocs.length === 1 ? 'documento' : 'documentos'}`}
                </p>
              )}

              <ClinicalTimeline
                items={filteredDocs}
                onItemClick={(id) => navigate(`/pedidos/${id}`)}
                emptyLabel={
                  documentsCount === 0
                    ? 'Nenhum documento registrado'
                    : 'Nenhum documento corresponde à busca'
                }
                emptyIcon={
                  <FileStack className="mx-auto mb-2 h-10 w-10 text-muted-foreground/30" />
                }
              />
            </div>
          </TabsContent>

          {/* Notes tab */}
          <TabsContent value="notes">
            <div className="mt-4 space-y-4">
              <ClinicalNotesForm requests={requests} onAdd={handleAddNote} />
              {doctorNotes.length > 0 ? (
                <Card className="shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">
                      Historico ({doctorNotes.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-0">
                    {doctorNotes.map((note, idx) => (
                      <div
                        key={note.id}
                        className={
                          idx < doctorNotes.length - 1
                            ? 'border-b border-border pb-4'
                            : ''
                        }
                      >
                        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Badge
                              variant="secondary"
                              className="gap-1 text-[10px]"
                            >
                              {(() => {
                                const I = getNoteIcon(note.noteType);
                                return <I className="h-2.5 w-2.5" />;
                              })()}
                              {DOCTOR_NOTE_TYPES.find(
                                (t) => t.key === note.noteType
                              )?.label ?? note.noteType}
                            </Badge>
                            {note.sensitivity &&
                              note.sensitivity !== 'general' && (
                                <Badge
                                  variant="outline"
                                  className="gap-1 border-amber-400 bg-amber-50 text-[10px] text-amber-700"
                                >
                                  {note.sensitivity === 'author_only'
                                    ? 'Só autor'
                                    : 'Especialidade'}
                                </Badge>
                              )}
                          </div>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(note.createdAt).toLocaleString('pt-BR')}
                          </span>
                        </div>
                        {note.isMaskedForViewer && (
                          <p className="mb-1 flex items-center gap-1.5 rounded bg-muted/50 px-2 py-1 text-[11px] italic text-muted-foreground">
                            <Eye className="h-3 w-3" />
                            Texto restrito ao autor — exibindo resumo para a
                            equipe.
                          </p>
                        )}
                        <p className="break-words text-sm">{note.content}</p>
                        {note.requestId && (
                          <Button
                            variant="link"
                            size="sm"
                            className="mt-1 h-auto p-0 text-xs"
                            onClick={() =>
                              navigate(`/pedidos/${note.requestId}`)
                            }
                          >
                            Ver atendimento vinculado →
                          </Button>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ) : (
                <Card className="shadow-sm">
                  <CardContent className="py-12 text-center">
                    <StickyNote className="mx-auto mb-2 h-10 w-10 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">
                      Nenhuma nota registrada. Use o formulário acima.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DoctorLayout>
  );
}
