import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Plus,
  Search,
  Play,
  Pencil,
  MoreVertical,
  Copy,
  CalendarClock,
  Share2,
  Trash2,
  FileText,
  FileSpreadsheet,
  FileDown,
  Stethoscope,
  DollarSign,
  Activity,
  ShieldCheck,
  Users,
  Sparkles,
  ArrowLeft,
  ArrowRight,
  Check,
  MapPin,
  CalendarDays,
  Heart,
  Star,
  UserCog,
  ClipboardList,
  PieChart,
  LineChart,
  Clock,
  Mail,
  X,
  Power,
  Database,
  BarChart3,
  FileBarChart,
} from 'lucide-react';
import { toast } from 'sonner';

import { AdminLayout } from '@/components/admin/AdminLayout';
import { AiInsightsPanel } from '@/components/admin/ai/AiInsightsPanel';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

type Category =
  | 'Médicos'
  | 'Financeiro'
  | 'Operacional'
  | 'Qualidade'
  | 'Engajamento';

type ExportFormat = 'PDF' | 'Excel' | 'CSV';

interface SavedReport {
  id: string;
  title: string;
  description: string;
  category: Category;
  lastRun: string;
  formats: ExportFormat[];
}

interface ReportTemplate {
  id: string;
  title: string;
  description: string;
  category: Exclude<Category, 'Engajamento'> | 'Engajamento';
  icon: React.ComponentType<{ className?: string }>;
}

type Frequency = 'Diário' | 'Semanal' | 'Mensal';

interface ScheduledReport {
  id: string;
  name: string;
  frequency: Frequency;
  nextRun: string;
  recipients: string[];
  status: 'Ativo' | 'Pausado';
}

const CATEGORY_STYLES: Record<
  Category,
  { bg: string; fg: string; icon: React.ComponentType<{ className?: string }> }
> = {
  Médicos: {
    bg: 'bg-blue-500/10',
    fg: 'text-blue-600 dark:text-blue-400',
    icon: Stethoscope,
  },
  Financeiro: {
    bg: 'bg-emerald-500/10',
    fg: 'text-emerald-600 dark:text-emerald-400',
    icon: DollarSign,
  },
  Operacional: {
    bg: 'bg-amber-500/10',
    fg: 'text-amber-600 dark:text-amber-400',
    icon: Activity,
  },
  Qualidade: {
    bg: 'bg-violet-500/10',
    fg: 'text-violet-600 dark:text-violet-400',
    icon: ShieldCheck,
  },
  Engajamento: {
    bg: 'bg-pink-500/10',
    fg: 'text-pink-600 dark:text-pink-400',
    icon: Users,
  },
};

const MOCK_REPORTS: SavedReport[] = [
  {
    id: 'r1',
    title: 'Médicos cadastrados por UF',
    description: 'Distribuição geográfica de médicos aprovados na plataforma.',
    category: 'Médicos',
    lastRun: 'há 2 horas',
    formats: ['PDF', 'Excel'],
  },
  {
    id: 'r2',
    title: 'Receita mensal consolidada',
    description: 'Relatório financeiro mensal com receita, custos e margem.',
    category: 'Financeiro',
    lastRun: 'ontem',
    formats: ['PDF', 'Excel', 'CSV'],
  },
  {
    id: 'r3',
    title: 'Consultas realizadas por especialidade',
    description: 'Volume de consultas agrupado por especialidade médica.',
    category: 'Operacional',
    lastRun: 'há 3 dias',
    formats: ['PDF', 'CSV'],
  },
  {
    id: 'r4',
    title: 'NPS e satisfação dos pacientes',
    description: 'Indicadores de qualidade e avaliações pós-atendimento.',
    category: 'Qualidade',
    lastRun: 'há 1 semana',
    formats: ['PDF'],
  },
  {
    id: 'r5',
    title: 'Usuários ativos por município',
    description: 'Engajamento de pacientes por localização geográfica.',
    category: 'Engajamento',
    lastRun: 'há 5 horas',
    formats: ['Excel', 'CSV'],
  },
  {
    id: 'r6',
    title: 'Aprovações de médicos pendentes',
    description: 'Fila de médicos aguardando validação documental.',
    category: 'Médicos',
    lastRun: 'há 30 min',
    formats: ['PDF', 'Excel'],
  },
  {
    id: 'r7',
    title: 'Economia gerada por município',
    description: 'Impacto financeiro para prefeituras parceiras.',
    category: 'Financeiro',
    lastRun: 'há 2 dias',
    formats: ['PDF', 'Excel'],
  },
  {
    id: 'r8',
    title: 'Tempo médio de atendimento',
    description: 'Performance operacional por horário e especialidade.',
    category: 'Operacional',
    lastRun: 'há 6 horas',
    formats: ['CSV'],
  },
  {
    id: 'r9',
    title: 'Retenção e churn de pacientes',
    description: 'Taxa de retorno dos pacientes após primeira consulta.',
    category: 'Engajamento',
    lastRun: 'há 4 dias',
    formats: ['PDF', 'Excel'],
  },
];

const MOCK_TEMPLATES: ReportTemplate[] = [
  {
    id: 't1',
    title: 'Cadastros de médicos por UF',
    description: 'Distribuição geográfica completa.',
    category: 'Médicos',
    icon: MapPin,
  },
  {
    id: 't2',
    title: 'Consultas realizadas/mês',
    description: 'Volume mensal consolidado.',
    category: 'Operacional',
    icon: CalendarDays,
  },
  {
    id: 't3',
    title: 'Aprovações pendentes > 7 dias',
    description: 'Fila crítica de validação.',
    category: 'Médicos',
    icon: ClipboardList,
  },
  {
    id: 't4',
    title: 'Economia por município',
    description: 'Impacto financeiro por cidade.',
    category: 'Financeiro',
    icon: DollarSign,
  },
  {
    id: 't5',
    title: 'Atividade dos usuários',
    description: 'Logins, sessões e acessos.',
    category: 'Engajamento',
    icon: Activity,
  },
  {
    id: 't6',
    title: 'Faixa etária dos pacientes',
    description: 'Segmentação demográfica.',
    category: 'Engajamento',
    icon: PieChart,
  },
  {
    id: 't7',
    title: 'NPS mensal',
    description: 'Índice de recomendação.',
    category: 'Qualidade',
    icon: Star,
  },
  {
    id: 't8',
    title: 'Custo por atendimento',
    description: 'Análise de custo unitário.',
    category: 'Financeiro',
    icon: LineChart,
  },
  {
    id: 't9',
    title: 'Especialidades mais solicitadas',
    description: 'Ranking de demanda.',
    category: 'Operacional',
    icon: BarChart3,
  },
  {
    id: 't10',
    title: 'Satisfação por médico',
    description: 'Avaliação individual dos profissionais.',
    category: 'Qualidade',
    icon: Heart,
  },
  {
    id: 't11',
    title: 'Horários de pico',
    description: 'Distribuição de carga por horário.',
    category: 'Operacional',
    icon: Clock,
  },
  {
    id: 't12',
    title: 'Administradores ativos',
    description: 'Uso do painel administrativo.',
    category: 'Engajamento',
    icon: UserCog,
  },
];

const MOCK_SCHEDULED: ScheduledReport[] = [
  {
    id: 's1',
    name: 'Consolidado financeiro mensal',
    frequency: 'Mensal',
    nextRun: '01/05/2026 08:00',
    recipients: ['Marina S.', 'Rafael L.', 'Camila O.'],
    status: 'Ativo',
  },
  {
    id: 's2',
    name: 'Fila de aprovação de médicos',
    frequency: 'Diário',
    nextRun: '09/04/2026 07:00',
    recipients: ['Júlio P.', 'Ana C.'],
    status: 'Ativo',
  },
  {
    id: 's3',
    name: 'NPS semanal',
    frequency: 'Semanal',
    nextRun: '14/04/2026 09:00',
    recipients: ['Carolina M.', 'Diego R.', 'Felipe T.', 'Bruna V.'],
    status: 'Ativo',
  },
  {
    id: 's4',
    name: 'Atividade dos usuários',
    frequency: 'Semanal',
    nextRun: '14/04/2026 10:00',
    recipients: ['Ricardo B.'],
    status: 'Pausado',
  },
  {
    id: 's5',
    name: 'Economia por município',
    frequency: 'Mensal',
    nextRun: '01/05/2026 06:00',
    recipients: ['Paula D.', 'Marcos A.', 'Tânia F.'],
    status: 'Ativo',
  },
  {
    id: 's6',
    name: 'Consultas realizadas',
    frequency: 'Diário',
    nextRun: '09/04/2026 23:00',
    recipients: ['Larissa K.', 'Eduardo M.'],
    status: 'Pausado',
  },
];

const TEMPLATE_CATEGORIES: Array<'Todos' | ReportTemplate['category']> = [
  'Todos',
  'Médicos',
  'Financeiro',
  'Operacional',
  'Qualidade',
  'Engajamento',
];

interface DataSource {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const DATA_SOURCES: DataSource[] = [
  {
    id: 'medicos',
    label: 'Médicos',
    description: 'Cadastros, aprovações e CRMs.',
    icon: Stethoscope,
  },
  {
    id: 'consultas',
    label: 'Consultas',
    description: 'Agenda e atendimentos.',
    icon: CalendarDays,
  },
  {
    id: 'financeiro',
    label: 'Financeiro',
    description: 'Receita, custos e margem.',
    icon: DollarSign,
  },
  {
    id: 'atividade',
    label: 'Atividade',
    description: 'Engajamento de usuários.',
    icon: Activity,
  },
  {
    id: 'logs',
    label: 'Logs',
    description: 'Eventos e auditoria.',
    icon: Database,
  },
];

const METRICS_BY_SOURCE: Record<string, string[]> = {
  medicos: [
    'Total de cadastros',
    'Aprovados',
    'Pendentes',
    'Recusados',
    'Por UF',
    'Por especialidade',
  ],
  consultas: [
    'Total realizadas',
    'Canceladas',
    'Tempo médio',
    'Por especialidade',
    'Por horário',
  ],
  financeiro: [
    'Receita bruta',
    'Custos operacionais',
    'Margem',
    'Economia gerada',
    'Ticket médio',
  ],
  atividade: [
    'Usuários ativos',
    'Logins',
    'Sessões',
    'Tempo médio de sessão',
    'Retenção',
  ],
  logs: [
    'Eventos críticos',
    'Erros',
    'Tentativas de login',
    'Ações administrativas',
  ],
};

const formatIcon = (f: ExportFormat) => {
  if (f === 'PDF') return FileText;
  if (f === 'Excel') return FileSpreadsheet;
  return FileDown;
};

const getInitials = (name: string): string => {
  const parts = name.split(' ');
  return (parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '');
};

const AdminRelatorios = () => {
  const [tab, setTab] = useState<'meus' | 'templates' | 'agendados'>('meus');
  const [search, setSearch] = useState('');
  const [templateCategory, setTemplateCategory] =
    useState<(typeof TEMPLATE_CATEGORIES)[number]>('Todos');

  // Sheet wizard state
  const [sheetOpen, setSheetOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([]);
  const [period, setPeriod] = useState('ultimos-30');
  const [uf, setUf] = useState('all');
  const [format, setFormat] = useState<ExportFormat>('PDF');

  // Schedule dialog
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleName, setScheduleName] = useState('');
  const [scheduleFreq, setScheduleFreq] = useState<Frequency>('Semanal');
  const [scheduleTime, setScheduleTime] = useState('08:00');
  const [recipientDraft, setRecipientDraft] = useState('');
  const [recipients, setRecipients] = useState<string[]>([]);

  const filteredReports = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return MOCK_REPORTS;
    return MOCK_REPORTS.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q)
    );
  }, [search]);

  const filteredTemplates = useMemo(() => {
    if (templateCategory === 'Todos') return MOCK_TEMPLATES;
    return MOCK_TEMPLATES.filter((t) => t.category === templateCategory);
  }, [templateCategory]);

  const openNewReport = () => {
    setWizardStep(1);
    setSelectedSource(null);
    setSelectedMetrics([]);
    setPeriod('ultimos-30');
    setUf('all');
    setFormat('PDF');
    setSheetOpen(true);
  };

  const toggleMetric = (m: string) => {
    setSelectedMetrics((prev) =>
      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]
    );
  };

  const canAdvance = (): boolean => {
    if (wizardStep === 1) return selectedSource !== null;
    if (wizardStep === 2) return selectedMetrics.length > 0;
    return true;
  };

  const handleGenerate = () => {
    toast.success('Relatório enviado para a fila de geração.', {
      description: `Formato: ${format} · ${selectedMetrics.length} métricas`,
    });
    setSheetOpen(false);
  };

  const addRecipient = () => {
    const v = recipientDraft.trim();
    if (!v) return;
    if (recipients.includes(v)) return;
    setRecipients((prev) => [...prev, v]);
    setRecipientDraft('');
  };

  const removeRecipient = (r: string) => {
    setRecipients((prev) => prev.filter((x) => x !== r));
  };

  const handleCreateSchedule = () => {
    if (!scheduleName.trim()) {
      toast.error('Informe um nome para o agendamento.');
      return;
    }
    toast.success('Agendamento criado com sucesso!', {
      description: `${scheduleFreq} · ${scheduleTime} · ${recipients.length} destinatário(s)`,
    });
    setScheduleOpen(false);
    setScheduleName('');
    setRecipients([]);
    setRecipientDraft('');
  };

  return (
    <AdminLayout>
      <TooltipProvider delayDuration={200}>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Relatórios</h1>
              <p className="text-muted-foreground">
                Construa, agende e exporte relatórios inteligentes da
                plataforma.
              </p>
            </div>
            <Button onClick={openNewReport} className="gap-2">
              <Plus className="h-4 w-4" />
              Novo relatório
            </Button>
          </div>

          {/* AI Suggestion Card */}
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
          >
            <Card className="border-primary/30 bg-gradient-to-r from-primary/5 via-primary/10 to-transparent shadow-sm">
              <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="rounded-xl bg-primary/15 p-2.5">
                    <Sparkles className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">IA sugere</p>
                      <Badge variant="secondary" className="text-xs">
                        Alta prioridade
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Gerar relatório de{' '}
                      <span className="font-medium text-foreground">
                        médicos aprovados vs meta
                      </span>{' '}
                      — atualmente 34% abaixo da meta do trimestre.
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() =>
                    toast.success(
                      'Gerando relatório "Médicos aprovados vs meta"...'
                    )
                  }
                  className="gap-2"
                >
                  <Play className="h-4 w-4" />
                  Gerar agora
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
            <div className="min-w-0 space-y-4">
              <Tabs
                value={tab}
                onValueChange={(v) =>
                  setTab(v as 'meus' | 'templates' | 'agendados')
                }
              >
                <TabsList className="grid w-full max-w-xl grid-cols-3">
                  <TabsTrigger value="meus">Meus Relatórios</TabsTrigger>
                  <TabsTrigger value="templates">Templates</TabsTrigger>
                  <TabsTrigger value="agendados">Agendados</TabsTrigger>
                </TabsList>

                {/* Meus Relatórios */}
                <TabsContent value="meus" className="mt-5 space-y-4">
                  <div className="relative max-w-md">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Buscar relatórios..."
                      className="pl-9"
                    />
                  </div>

                  {filteredReports.length === 0 ? (
                    <Card className="border-dashed">
                      <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                        <div className="rounded-full bg-muted p-4">
                          <FileBarChart className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium">
                            Nenhum relatório encontrado
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Ajuste a busca ou crie um novo relatório.
                          </p>
                        </div>
                        <Button
                          onClick={openNewReport}
                          size="sm"
                          className="gap-2"
                        >
                          <Plus className="h-4 w-4" /> Novo relatório
                        </Button>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {filteredReports.map((report, i) => {
                        const style = CATEGORY_STYLES[report.category];
                        const CatIcon = style.icon;
                        return (
                          <motion.div
                            key={report.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.25, delay: i * 0.04 }}
                            whileHover={{ scale: 1.015 }}
                          >
                            <Card className="flex h-full flex-col shadow-sm transition-shadow hover:shadow-md">
                              <CardHeader className="pb-3">
                                <div className="flex items-start justify-between">
                                  <div
                                    className={cn('rounded-xl p-2.5', style.bg)}
                                  >
                                    <CatIcon
                                      className={cn('h-5 w-5', style.fg)}
                                    />
                                  </div>
                                  <Badge variant="outline" className="text-xs">
                                    {report.category}
                                  </Badge>
                                </div>
                                <CardTitle className="mt-3 text-base leading-tight">
                                  {report.title}
                                </CardTitle>
                                <p className="text-sm text-muted-foreground">
                                  {report.description}
                                </p>
                              </CardHeader>
                              <CardContent className="flex-1 space-y-3">
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                  <Clock className="h-3.5 w-3.5" />
                                  Última execução: {report.lastRun}
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                  {report.formats.map((f) => {
                                    const Icon = formatIcon(f);
                                    return (
                                      <Badge
                                        key={f}
                                        variant="secondary"
                                        className="gap-1 text-xs"
                                      >
                                        <Icon className="h-3 w-3" /> {f}
                                      </Badge>
                                    );
                                  })}
                                </div>
                              </CardContent>
                              <CardFooter className="gap-2 pt-0">
                                <Button
                                  size="sm"
                                  className="flex-1 gap-1.5"
                                  onClick={() =>
                                    toast.success(
                                      `Executando "${report.title}"...`
                                    )
                                  }
                                >
                                  <Play className="h-3.5 w-3.5" />
                                  Executar
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="gap-1.5"
                                  onClick={() =>
                                    toast.info(`Editando "${report.title}"`)
                                  }
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                  Editar
                                </Button>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="px-2"
                                    >
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                      onClick={() =>
                                        toast.success('Relatório duplicado.')
                                      }
                                    >
                                      <Copy className="mr-2 h-4 w-4" /> Duplicar
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => setScheduleOpen(true)}
                                    >
                                      <CalendarClock className="mr-2 h-4 w-4" />{' '}
                                      Agendar
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() =>
                                        toast.success('Link copiado!')
                                      }
                                    >
                                      <Share2 className="mr-2 h-4 w-4" />{' '}
                                      Compartilhar
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      className="text-destructive focus:text-destructive"
                                      onClick={() =>
                                        toast.success('Relatório excluído.')
                                      }
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />{' '}
                                      Excluir
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </CardFooter>
                            </Card>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </TabsContent>

                {/* Templates */}
                <TabsContent value="templates" className="mt-5 space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {TEMPLATE_CATEGORIES.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setTemplateCategory(c)}
                        className={cn(
                          'rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors',
                          templateCategory === c
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border bg-background hover:bg-muted'
                        )}
                      >
                        {c}
                      </button>
                    ))}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {filteredTemplates.map((tpl, i) => {
                      const Icon = tpl.icon;
                      const style = CATEGORY_STYLES[tpl.category];
                      return (
                        <motion.div
                          key={tpl.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.22, delay: i * 0.04 }}
                          whileHover={{ scale: 1.02 }}
                        >
                          <Card className="flex h-full flex-col shadow-sm">
                            <CardContent className="flex flex-1 flex-col gap-3 p-4">
                              <div
                                className={cn('w-fit rounded-lg p-2', style.bg)}
                              >
                                <Icon className={cn('h-4 w-4', style.fg)} />
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-semibold leading-tight">
                                  {tpl.title}
                                </p>
                                <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                                  {tpl.description}
                                </p>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full"
                                onClick={() => {
                                  toast.success(
                                    `Template "${tpl.title}" carregado.`
                                  );
                                  openNewReport();
                                }}
                              >
                                Usar template
                              </Button>
                            </CardContent>
                          </Card>
                        </motion.div>
                      );
                    })}
                  </div>
                </TabsContent>

                {/* Agendados */}
                <TabsContent value="agendados" className="mt-5 space-y-4">
                  <div className="flex justify-end">
                    <Button
                      onClick={() => setScheduleOpen(true)}
                      className="gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Novo agendamento
                    </Button>
                  </div>
                  <Card className="shadow-sm">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead>Frequência</TableHead>
                          <TableHead>Próxima execução</TableHead>
                          <TableHead>Destinatários</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="w-10" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {MOCK_SCHEDULED.map((s) => (
                          <TableRow key={s.id}>
                            <TableCell className="font-medium">
                              {s.name}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={cn(
                                  s.frequency === 'Diário' &&
                                    'border-blue-500/40 text-blue-600 dark:text-blue-400',
                                  s.frequency === 'Semanal' &&
                                    'border-violet-500/40 text-violet-600 dark:text-violet-400',
                                  s.frequency === 'Mensal' &&
                                    'border-emerald-500/40 text-emerald-600 dark:text-emerald-400'
                                )}
                              >
                                {s.frequency}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {s.nextRun}
                            </TableCell>
                            <TableCell>
                              <div className="flex -space-x-2">
                                {s.recipients.slice(0, 3).map((r) => (
                                  <Tooltip key={r}>
                                    <TooltipTrigger asChild>
                                      <Avatar className="h-7 w-7 border-2 border-background">
                                        <AvatarFallback className="text-[10px]">
                                          {getInitials(r)}
                                        </AvatarFallback>
                                      </Avatar>
                                    </TooltipTrigger>
                                    <TooltipContent>{r}</TooltipContent>
                                  </Tooltip>
                                ))}
                                {s.recipients.length > 3 && (
                                  <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-muted text-[10px] font-medium">
                                    +{s.recipients.length - 3}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  s.status === 'Ativo' ? 'default' : 'secondary'
                                }
                              >
                                {s.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 w-8 p-0"
                                  >
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() =>
                                      toast.success(
                                        s.status === 'Ativo'
                                          ? 'Agendamento pausado.'
                                          : 'Agendamento ativado.'
                                      )
                                    }
                                  >
                                    <Power className="mr-2 h-4 w-4" />
                                    {s.status === 'Ativo'
                                      ? 'Desativar'
                                      : 'Ativar'}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      toast.info('Editar agendamento')
                                    }
                                  >
                                    <Pencil className="mr-2 h-4 w-4" /> Editar
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-destructive focus:text-destructive"
                                    onClick={() =>
                                      toast.success('Agendamento excluído.')
                                    }
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" /> Excluir
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>

            {/* AI Sidebar */}
            <aside className="hidden xl:block">
              <div className="sticky top-20">
                <AiInsightsPanel scope="admin" maxItems={3} compact />
              </div>
            </aside>
          </div>
        </div>

        {/* Sheet: Novo relatório wizard */}
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent className="flex w-full flex-col gap-0 sm:max-w-xl">
            <SheetHeader>
              <SheetTitle>Novo relatório</SheetTitle>
              <SheetDescription>
                Siga os passos para construir seu relatório customizado.
              </SheetDescription>
            </SheetHeader>

            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Passo {wizardStep} de 3</span>
                <span>
                  {wizardStep === 1 && 'Fonte de dados'}
                  {wizardStep === 2 && 'Métricas'}
                  {wizardStep === 3 && 'Filtros e formato'}
                </span>
              </div>
              <Progress value={(wizardStep / 3) * 100} className="h-1.5" />
            </div>

            <Separator className="my-4" />

            <div className="flex-1 overflow-y-auto pr-1">
              {wizardStep === 1 && (
                <div className="space-y-3">
                  <p className="text-sm font-medium">Escolha a fonte</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {DATA_SOURCES.map((ds) => {
                      const Icon = ds.icon;
                      const active = selectedSource === ds.id;
                      return (
                        <button
                          type="button"
                          key={ds.id}
                          onClick={() => setSelectedSource(ds.id)}
                          className={cn(
                            'flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition-all',
                            active
                              ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                              : 'border-border hover:border-primary/50 hover:bg-muted/50'
                          )}
                        >
                          <div
                            className={cn(
                              'rounded-lg p-2',
                              active ? 'bg-primary/15' : 'bg-muted'
                            )}
                          >
                            <Icon
                              className={cn(
                                'h-4 w-4',
                                active
                                  ? 'text-primary'
                                  : 'text-muted-foreground'
                              )}
                            />
                          </div>
                          <div>
                            <p className="text-sm font-semibold">{ds.label}</p>
                            <p className="text-xs text-muted-foreground">
                              {ds.description}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {wizardStep === 2 && (
                <div className="space-y-3">
                  <p className="text-sm font-medium">Selecione métricas</p>
                  {selectedSource ? (
                    <div className="grid gap-2">
                      {METRICS_BY_SOURCE[selectedSource]?.map((m) => {
                        const checked = selectedMetrics.includes(m);
                        return (
                          <label
                            key={m}
                            className={cn(
                              'flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors',
                              checked
                                ? 'border-primary bg-primary/5'
                                : 'border-border hover:bg-muted/50'
                            )}
                          >
                            <div
                              className={cn(
                                'flex h-4 w-4 items-center justify-center rounded border',
                                checked
                                  ? 'border-primary bg-primary text-primary-foreground'
                                  : 'border-muted-foreground/40'
                              )}
                            >
                              {checked && <Check className="h-3 w-3" />}
                            </div>
                            <input
                              type="checkbox"
                              className="sr-only"
                              checked={checked}
                              onChange={() => toggleMetric(m)}
                            />
                            <span className="text-sm">{m}</span>
                          </label>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Selecione uma fonte antes de escolher métricas.
                    </p>
                  )}
                </div>
              )}

              {wizardStep === 3 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Período</Label>
                    <Select value={period} onValueChange={setPeriod}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ultimos-7">
                          Últimos 7 dias
                        </SelectItem>
                        <SelectItem value="ultimos-30">
                          Últimos 30 dias
                        </SelectItem>
                        <SelectItem value="ultimos-90">
                          Últimos 90 dias
                        </SelectItem>
                        <SelectItem value="ano">Este ano</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>UF</Label>
                    <Select value={uf} onValueChange={setUf}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas as UFs</SelectItem>
                        <SelectItem value="SP">São Paulo</SelectItem>
                        <SelectItem value="RJ">Rio de Janeiro</SelectItem>
                        <SelectItem value="MG">Minas Gerais</SelectItem>
                        <SelectItem value="BA">Bahia</SelectItem>
                        <SelectItem value="PR">Paraná</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Formato</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['PDF', 'Excel', 'CSV'] as ExportFormat[]).map((f) => {
                        const Icon = formatIcon(f);
                        const active = format === f;
                        return (
                          <button
                            type="button"
                            key={f}
                            onClick={() => setFormat(f)}
                            className={cn(
                              'flex flex-col items-center gap-1 rounded-lg border p-3 text-xs font-medium transition-colors',
                              active
                                ? 'border-primary bg-primary/5 text-primary'
                                : 'border-border hover:bg-muted/50'
                            )}
                          >
                            <Icon className="h-4 w-4" />
                            {f}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <Separator className="my-4" />

            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                disabled={wizardStep === 1}
                onClick={() => setWizardStep((s) => Math.max(1, s - 1))}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" /> Voltar
              </Button>
              {wizardStep < 3 ? (
                <Button
                  disabled={!canAdvance()}
                  onClick={() => setWizardStep((s) => Math.min(3, s + 1))}
                  className="gap-2"
                >
                  Próximo <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button onClick={handleGenerate} className="gap-2">
                  <Play className="h-4 w-4" /> Gerar relatório
                </Button>
              )}
            </div>
          </SheetContent>
        </Sheet>

        {/* Dialog: Novo agendamento */}
        <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Novo agendamento</DialogTitle>
              <DialogDescription>
                Configure a execução recorrente de um relatório.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input
                  value={scheduleName}
                  onChange={(e) => setScheduleName(e.target.value)}
                  placeholder="Ex: Consolidado semanal"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Frequência</Label>
                  <Select
                    value={scheduleFreq}
                    onValueChange={(v) => setScheduleFreq(v as Frequency)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Diário">Diário</SelectItem>
                      <SelectItem value="Semanal">Semanal</SelectItem>
                      <SelectItem value="Mensal">Mensal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Horário</Label>
                  <Input
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Destinatários</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={recipientDraft}
                      onChange={(e) => setRecipientDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addRecipient();
                        }
                      }}
                      placeholder="email@exemplo.com"
                      className="pl-9"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addRecipient}
                  >
                    Adicionar
                  </Button>
                </div>
                {recipients.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {recipients.map((r) => (
                      <Badge key={r} variant="secondary" className="gap-1 pr-1">
                        {r}
                        <button
                          type="button"
                          onClick={() => removeRecipient(r)}
                          className="rounded-full p-0.5 hover:bg-background/50"
                          aria-label={`Remover ${r}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setScheduleOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateSchedule}>Criar agendamento</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </TooltipProvider>
    </AdminLayout>
  );
};

export default AdminRelatorios;
