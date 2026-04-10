/**
 * RhFerias — Gestão de Férias & Ausências (Portal RH).
 *
 * Aprovação de solicitações, calendário mensal, timeline/Gantt 6 meses e
 * analytics com SVG puro. Tudo sobre `@/services/rhApi` (mock) via TanStack
 * Query singleton local. Zero deps novas — alinhado com RhColaboradores.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  QueryClient,
  QueryClientProvider,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowUpDown,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  FileText,
  Filter,
  LayoutGrid,
  List as ListIcon,
  Plus,
  Search,
  Send,
  Sparkles,
  Table2,
  TrendingUp,
  X,
  XCircle,
} from 'lucide-react';
import {
  addMonths,
  differenceInDays,
  eachDayOfInterval,
  endOfMonth,
  format,
  formatDistanceToNow,
  isSameDay,
  isWeekend,
  isWithinInterval,
  parseISO,
  startOfMonth,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

import { RhLayout } from '@/components/admin/rh/RhLayout';
import { AiInsightsPanel } from '@/components/admin/ai/AiInsightsPanel';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

import {
  aprovarFerias,
  listColaboradores,
  listDepartamentos,
  listFerias,
  rejeitarFerias,
} from '@/services/rhApi';
import type {
  Colaborador,
  Departamento,
  FeriasStatus,
  SolicitacaoFerias,
} from '@/types/rh';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/* QueryClient singleton local                                         */
/* ------------------------------------------------------------------ */

let localQueryClient: QueryClient | null = null;
function getLocalQueryClient(): QueryClient {
  if (!localQueryClient) {
    localQueryClient = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 60 * 1000,
          refetchOnWindowFocus: false,
          retry: 1,
        },
      },
    });
  }
  return localQueryClient;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function safeParse(iso: string): Date | null {
  try {
    const d = parseISO(iso);
    if (Number.isNaN(d.getTime())) return null;
    return d;
  } catch {
    return null;
  }
}

function fmtDate(iso: string): string {
  const d = safeParse(iso);
  return d ? format(d, 'dd MMM yyyy', { locale: ptBR }) : iso;
}

function fmtRelative(iso: string): string {
  const d = safeParse(iso);
  if (!d) return '—';
  try {
    return formatDistanceToNow(d, { locale: ptBR, addSuffix: true });
  } catch {
    return '—';
  }
}

function getInitials(nome: string): string {
  const parts = nome.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase();
}

/** Calcula dias úteis (seg-sex) entre dois ISOs, inclusive. */
function calcDiasUteis(inicioIso: string, fimIso: string): number {
  const inicio = safeParse(inicioIso);
  const fim = safeParse(fimIso);
  if (!inicio || !fim || fim < inicio) return 0;
  const dias = eachDayOfInterval({ start: inicio, end: fim });
  return dias.filter((d) => !isWeekend(d)).length;
}

const statusMeta: Record<
  FeriasStatus,
  { label: string; cls: string; dot: string }
> = {
  pendente: {
    label: 'Pendente',
    cls: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
    dot: 'bg-amber-500',
  },
  aprovada: {
    label: 'Aprovada',
    cls: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    dot: 'bg-emerald-500',
  },
  rejeitada: {
    label: 'Rejeitada',
    cls: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30',
    dot: 'bg-rose-500',
  },
  em_andamento: {
    label: 'Em andamento',
    cls: 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30',
    dot: 'bg-sky-500',
  },
  concluida: {
    label: 'Concluída',
    cls: 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30',
    dot: 'bg-slate-500',
  },
};

type ViewMode = 'lista' | 'calendario' | 'timeline';
type SortKey = 'recente' | 'dias' | 'status';

interface Filtros {
  search: string;
  status: 'todos' | FeriasStatus;
  departamento: string;
  de: string;
  ate: string;
  sort: SortKey;
}

const defaultFiltros: Filtros = {
  search: '',
  status: 'todos',
  departamento: 'todos',
  de: '',
  ate: '',
  sort: 'recente',
};

function useDebounced<T>(value: T, delay = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setV(value), delay);
    return () => window.clearTimeout(id);
  }, [value, delay]);
  return v;
}

/* ------------------------------------------------------------------ */
/* Página                                                              */
/* ------------------------------------------------------------------ */

export function RhFerias(): JSX.Element {
  return (
    <QueryClientProvider client={getLocalQueryClient()}>
      <RhFeriasInner />
    </QueryClientProvider>
  );
}

export default RhFerias;

function RhFeriasInner(): JSX.Element {
  const qc = useQueryClient();

  const [filtros, setFiltros] = useState<Filtros>(defaultFiltros);
  const debouncedSearch = useDebounced(filtros.search, 300);
  const [view, setView] = useState<ViewMode>('lista');
  const [tab, setTab] = useState<
    'solicitacoes' | 'calendario' | 'timeline' | 'analytics'
  >('solicitacoes');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [detalheId, setDetalheId] = useState<string | null>(null);
  const [rejeitarAlvo, setRejeitarAlvo] = useState<string | null>(null);
  const [rejeitarMotivo, setRejeitarMotivo] = useState('');
  const [novoOpen, setNovoOpen] = useState(false);
  const [calMonth, setCalMonth] = useState<Date>(startOfMonth(new Date()));
  const [calDia, setCalDia] = useState<Date | null>(null);

  // Sincroniza view ↔ tab principal (toggle Lista/Calendário/Timeline).
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (view === 'lista') setTab('solicitacoes');
    if (view === 'calendario') setTab('calendario');
    if (view === 'timeline') setTab('timeline');
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [view]);

  /* Queries */
  const feriasQuery = useQuery({
    queryKey: ['rh-ferias'],
    queryFn: () => listFerias(),
  });
  const colQuery = useQuery({
    queryKey: ['rh-colaboradores-all'],
    queryFn: () => listColaboradores({ page: 1, pageSize: 500 }),
  });
  const deptQuery = useQuery({
    queryKey: ['rh-departamentos'],
    queryFn: listDepartamentos,
  });

  const allFerias = useMemo<SolicitacaoFerias[]>(
    () => feriasQuery.data ?? [],
    [feriasQuery.data]
  );
  const colaboradores = useMemo<Colaborador[]>(
    () => colQuery.data?.items ?? [],
    [colQuery.data]
  );
  const departamentos = useMemo<Departamento[]>(
    () => deptQuery.data ?? [],
    [deptQuery.data]
  );

  const colById = useMemo(() => {
    const map = new Map<string, Colaborador>();
    colaboradores.forEach((c) => map.set(c.id, c));
    return map;
  }, [colaboradores]);

  /* Mutations */
  const aprovarMut = useMutation({
    mutationFn: (id: string) => aprovarFerias(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['rh-ferias'] });
      const prev = qc.getQueryData<SolicitacaoFerias[]>(['rh-ferias']);
      if (prev) {
        qc.setQueryData<SolicitacaoFerias[]>(
          ['rh-ferias'],
          prev.map((f) => (f.id === id ? { ...f, status: 'aprovada' } : f))
        );
      }
      return { prev };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(['rh-ferias'], ctx.prev);
      toast.error('Falha ao aprovar solicitação');
    },
    onSuccess: () => toast.success('Solicitação aprovada'),
    onSettled: () => qc.invalidateQueries({ queryKey: ['rh-ferias'] }),
  });

  const rejeitarMut = useMutation({
    mutationFn: ({ id, motivo }: { id: string; motivo: string }) =>
      rejeitarFerias(id, motivo),
    onMutate: async ({ id, motivo }) => {
      await qc.cancelQueries({ queryKey: ['rh-ferias'] });
      const prev = qc.getQueryData<SolicitacaoFerias[]>(['rh-ferias']);
      if (prev) {
        qc.setQueryData<SolicitacaoFerias[]>(
          ['rh-ferias'],
          prev.map((f) =>
            f.id === id
              ? { ...f, status: 'rejeitada', motivoRejeicao: motivo }
              : f
          )
        );
      }
      return { prev };
    },
    onError: (_err, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(['rh-ferias'], ctx.prev);
      toast.error('Falha ao rejeitar solicitação');
    },
    onSuccess: () => toast.success('Solicitação rejeitada'),
    onSettled: () => qc.invalidateQueries({ queryKey: ['rh-ferias'] }),
  });

  /* Filtro client-side */
  const filtradas = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    const de = filtros.de ? safeParse(filtros.de) : null;
    const ate = filtros.ate ? safeParse(filtros.ate) : null;
    let arr = allFerias.filter((f) => {
      if (filtros.status !== 'todos' && f.status !== filtros.status)
        return false;
      const col = colById.get(f.colaboradorId);
      if (q) {
        const nome = col?.nome.toLowerCase() ?? '';
        const email = col?.email.toLowerCase() ?? '';
        if (!nome.includes(q) && !email.includes(q)) return false;
      }
      if (filtros.departamento !== 'todos') {
        if (!col || col.departamento !== filtros.departamento) return false;
      }
      const inicio = safeParse(f.dataInicio);
      if (de && inicio && inicio < de) return false;
      if (ate && inicio && inicio > ate) return false;
      return true;
    });
    arr = [...arr].sort((a, b) => {
      if (filtros.sort === 'dias') return b.diasUteis - a.diasUteis;
      if (filtros.sort === 'status') return a.status.localeCompare(b.status);
      return (
        (safeParse(b.createdAt)?.getTime() ?? 0) -
        (safeParse(a.createdAt)?.getTime() ?? 0)
      );
    });
    return arr;
  }, [allFerias, colById, debouncedSearch, filtros]);

  /* KPIs */
  const kpis = useMemo(() => {
    const pendentes = allFerias.filter((f) => f.status === 'pendente').length;
    const emAndamento = allFerias.filter(
      (f) => f.status === 'em_andamento'
    ).length;
    const now = new Date();
    const mesRef = now.getMonth();
    const aprovadasMes = allFerias.filter((f) => {
      if (f.status !== 'aprovada') return false;
      const d = safeParse(f.createdAt);
      return (
        d && d.getMonth() === mesRef && d.getFullYear() === now.getFullYear()
      );
    }).length;
    const anoAtual = now.getFullYear();
    const diasYtd = allFerias
      .filter((f) => {
        const d = safeParse(f.dataInicio);
        return (
          d &&
          d.getFullYear() === anoAtual &&
          (f.status === 'aprovada' ||
            f.status === 'em_andamento' ||
            f.status === 'concluida')
        );
      })
      .reduce((acc, f) => acc + f.diasUteis, 0);
    const saldoMedio = colaboradores.length
      ? Math.round(
          colaboradores.reduce((acc, c) => {
            const usados = allFerias
              .filter(
                (f) =>
                  f.colaboradorId === c.id &&
                  (f.status === 'aprovada' || f.status === 'concluida')
              )
              .reduce((s, f) => s + f.diasUteis, 0);
            return acc + Math.max(0, 30 - usados);
          }, 0) / colaboradores.length
        )
      : 0;
    return { pendentes, emAndamento, aprovadasMes, diasYtd, saldoMedio };
  }, [allFerias, colaboradores]);

  /* Handlers */
  const toggleSelected = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const bulkAprovar = () => {
    selected.forEach((id) => aprovarMut.mutate(id));
    setSelected(new Set());
  };
  const bulkRejeitar = () => {
    const motivo = 'Rejeição em lote';
    selected.forEach((id) => rejeitarMut.mutate({ id, motivo }));
    setSelected(new Set());
  };

  const limparFiltros = () => setFiltros(defaultFiltros);

  const activeFiltersCount =
    (filtros.search ? 1 : 0) +
    (filtros.status !== 'todos' ? 1 : 0) +
    (filtros.departamento !== 'todos' ? 1 : 0) +
    (filtros.de ? 1 : 0) +
    (filtros.ate ? 1 : 0);

  const loading =
    feriasQuery.isLoading || colQuery.isLoading || deptQuery.isLoading;

  const detalhe =
    detalheId != null
      ? (allFerias.find((f) => f.id === detalheId) ?? null)
      : null;
  const detalheCol = detalhe
    ? (colById.get(detalhe.colaboradorId) ?? null)
    : null;

  return (
    <RhLayout
      title="Férias & Ausências"
      subtitle="Gestão de ausências e aprovações"
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm">
            <FileText className="mr-2 h-4 w-4" />
            Política de férias
          </Button>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
          <Button size="sm" onClick={() => setNovoOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nova solicitação
          </Button>
        </div>
      }
    >
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-6">
          {/* IA destaque */}
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="border-violet-500/30 bg-gradient-to-r from-violet-500/10 via-fuchsia-500/5 to-transparent">
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-violet-500/15 p-2 text-violet-600 dark:text-violet-300">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      IA detectou que 78% das solicitações são para dezembro
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Considere política de escalonamento para evitar sobrecarga
                      operacional no fim de ano.
                    </p>
                  </div>
                </div>
                <Button size="sm" variant="secondary">
                  Ver análise
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* KPIs */}
          <KpiGrid kpis={kpis} loading={loading} />

          {/* Filtros */}
          <Card>
            <CardContent className="space-y-3 p-4">
              <div className="flex flex-wrap items-end gap-3">
                <div className="min-w-[220px] flex-1">
                  <Label className="text-xs text-muted-foreground">
                    Buscar
                  </Label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={filtros.search}
                      onChange={(e) =>
                        setFiltros((f) => ({ ...f, search: e.target.value }))
                      }
                      placeholder="Colaborador, e-mail…"
                      className="pl-8"
                    />
                  </div>
                </div>
                <div className="min-w-[160px]">
                  <Label className="text-xs text-muted-foreground">
                    Status
                  </Label>
                  <Select
                    value={filtros.status}
                    onValueChange={(v) =>
                      setFiltros((f) => ({
                        ...f,
                        status: v as Filtros['status'],
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todas</SelectItem>
                      <SelectItem value="pendente">Pendente</SelectItem>
                      <SelectItem value="aprovada">Aprovada</SelectItem>
                      <SelectItem value="rejeitada">Rejeitada</SelectItem>
                      <SelectItem value="em_andamento">Em andamento</SelectItem>
                      <SelectItem value="concluida">Concluída</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="min-w-[180px]">
                  <Label className="text-xs text-muted-foreground">
                    Departamento
                  </Label>
                  <Select
                    value={filtros.departamento}
                    onValueChange={(v) =>
                      setFiltros((f) => ({ ...f, departamento: v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      {departamentos.map((d) => (
                        <SelectItem key={d.id} value={d.nome}>
                          {d.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">De</Label>
                  <Input
                    type="date"
                    value={filtros.de}
                    onChange={(e) =>
                      setFiltros((f) => ({ ...f, de: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Até</Label>
                  <Input
                    type="date"
                    value={filtros.ate}
                    onChange={(e) =>
                      setFiltros((f) => ({ ...f, ate: e.target.value }))
                    }
                  />
                </div>
                <div className="min-w-[170px]">
                  <Label className="text-xs text-muted-foreground">
                    Ordenar
                  </Label>
                  <Select
                    value={filtros.sort}
                    onValueChange={(v) =>
                      setFiltros((f) => ({ ...f, sort: v as SortKey }))
                    }
                  >
                    <SelectTrigger>
                      <ArrowUpDown className="mr-2 h-3.5 w-3.5" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="recente">Mais recente</SelectItem>
                      <SelectItem value="dias">Mais dias</SelectItem>
                      <SelectItem value="status">Status</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="inline-flex items-center rounded-md border border-border p-0.5">
                  <ViewToggle
                    active={view === 'lista'}
                    onClick={() => setView('lista')}
                    icon={<ListIcon className="h-3.5 w-3.5" />}
                    label="Lista"
                  />
                  <ViewToggle
                    active={view === 'calendario'}
                    onClick={() => setView('calendario')}
                    icon={<CalendarDays className="h-3.5 w-3.5" />}
                    label="Calendário"
                  />
                  <ViewToggle
                    active={view === 'timeline'}
                    onClick={() => setView('timeline')}
                    icon={<Table2 className="h-3.5 w-3.5" />}
                    label="Timeline"
                  />
                </div>
                <div className="flex items-center gap-2">
                  {activeFiltersCount > 0 && (
                    <Badge variant="secondary" className="gap-1">
                      <Filter className="h-3 w-3" />
                      {activeFiltersCount} filtro(s)
                    </Badge>
                  )}
                  <Button variant="ghost" size="sm" onClick={limparFiltros}>
                    <X className="mr-1 h-3.5 w-3.5" />
                    Limpar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabs */}
          <Tabs
            value={tab}
            onValueChange={(v) => setTab(v as typeof tab)}
            className="w-full"
          >
            <TabsList>
              <TabsTrigger value="solicitacoes">
                <ListIcon className="mr-2 h-4 w-4" />
                Solicitações
              </TabsTrigger>
              <TabsTrigger value="calendario">
                <CalendarDays className="mr-2 h-4 w-4" />
                Calendário
              </TabsTrigger>
              <TabsTrigger value="timeline">
                <Table2 className="mr-2 h-4 w-4" />
                Timeline
              </TabsTrigger>
              <TabsTrigger value="analytics">
                <BarChart3 className="mr-2 h-4 w-4" />
                Analytics
              </TabsTrigger>
            </TabsList>

            <TabsContent value="solicitacoes" className="mt-4 space-y-4">
              {selected.size > 0 && (
                <div className="flex items-center justify-between rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
                  <span>{selected.size} selecionada(s)</span>
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary" onClick={bulkAprovar}>
                      <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                      Aprovar
                    </Button>
                    <Button size="sm" variant="outline" onClick={bulkRejeitar}>
                      <XCircle className="mr-1 h-3.5 w-3.5" />
                      Rejeitar
                    </Button>
                  </div>
                </div>
              )}

              {loading ? (
                <TableSkeleton />
              ) : filtradas.length === 0 ? (
                <EmptyState />
              ) : (
                <>
                  <Card className="overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-8" />
                          <TableHead>Colaborador</TableHead>
                          <TableHead>Período</TableHead>
                          <TableHead className="text-right">
                            Dias úteis
                          </TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Solicitado</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <AnimatePresence initial={false}>
                          {filtradas.map((f, i) => {
                            const col = colById.get(f.colaboradorId);
                            const meta = statusMeta[f.status];
                            return (
                              <motion.tr
                                key={f.id}
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                transition={{
                                  duration: 0.2,
                                  delay: Math.min(i * 0.02, 0.2),
                                }}
                                className="border-b border-border/60"
                              >
                                <TableCell>
                                  <Checkbox
                                    checked={selected.has(f.id)}
                                    onCheckedChange={() => toggleSelected(f.id)}
                                    aria-label="Selecionar"
                                  />
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <Avatar className="h-8 w-8">
                                      <AvatarImage src={col?.avatarUrl} />
                                      <AvatarFallback>
                                        {col ? getInitials(col.nome) : '??'}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0">
                                      <p className="truncate text-sm font-medium">
                                        {col?.nome ?? f.colaboradorId}
                                      </p>
                                      <p className="truncate text-xs text-muted-foreground">
                                        {col?.departamento ?? '—'}
                                      </p>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="text-sm">
                                    {fmtDate(f.dataInicio)}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    até {fmtDate(f.dataFim)}
                                  </div>
                                </TableCell>
                                <TableCell className="text-right font-medium">
                                  {f.diasUteis}
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant="outline"
                                    className={cn('gap-1.5', meta.cls)}
                                  >
                                    <span
                                      className={cn(
                                        'h-1.5 w-1.5 rounded-full',
                                        meta.dot,
                                        f.status === 'pendente' &&
                                          'animate-pulse'
                                      )}
                                    />
                                    {meta.label}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground">
                                  {fmtRelative(f.createdAt)}
                                </TableCell>
                                <TableCell>
                                  <div className="flex justify-end gap-1">
                                    {f.status === 'pendente' && (
                                      <>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() =>
                                            aprovarMut.mutate(f.id)
                                          }
                                          disabled={aprovarMut.isPending}
                                        >
                                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => {
                                            setRejeitarAlvo(f.id);
                                            setRejeitarMotivo('');
                                          }}
                                        >
                                          <XCircle className="h-4 w-4 text-rose-500" />
                                        </Button>
                                      </>
                                    )}
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => setDetalheId(f.id)}
                                    >
                                      <FileText className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </motion.tr>
                            );
                          })}
                        </AnimatePresence>
                      </TableBody>
                    </Table>
                  </Card>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {filtradas.slice(0, 6).map((f) => {
                      const col = colById.get(f.colaboradorId);
                      const meta = statusMeta[f.status];
                      return (
                        <motion.div
                          key={`card-${f.id}`}
                          whileHover={{ y: -2 }}
                          className="cursor-pointer"
                          onClick={() => setDetalheId(f.id)}
                        >
                          <Card>
                            <CardContent className="flex items-center justify-between gap-3 p-4">
                              <div className="flex min-w-0 items-center gap-3">
                                <Avatar className="h-10 w-10">
                                  <AvatarImage src={col?.avatarUrl} />
                                  <AvatarFallback>
                                    {col ? getInitials(col.nome) : '??'}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-medium">
                                    {col?.nome}
                                  </p>
                                  <p className="truncate text-xs text-muted-foreground">
                                    {fmtDate(f.dataInicio)} –{' '}
                                    {fmtDate(f.dataFim)}
                                  </p>
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                <Badge
                                  variant="outline"
                                  className={cn('text-[10px]', meta.cls)}
                                >
                                  {meta.label}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {f.diasUteis} dias
                                </span>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      );
                    })}
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="calendario" className="mt-4">
              <CalendarioMes
                month={calMonth}
                ferias={filtradas}
                colById={colById}
                onPrev={() => setCalMonth((m) => addMonths(m, -1))}
                onNext={() => setCalMonth((m) => addMonths(m, 1))}
                onDayClick={(d) => setCalDia(d)}
              />
            </TabsContent>

            <TabsContent value="timeline" className="mt-4">
              <TimelineGantt ferias={filtradas} colaboradores={colaboradores} />
            </TabsContent>

            <TabsContent value="analytics" className="mt-4">
              <AnalyticsPanel ferias={allFerias} colById={colById} />
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar IA */}
        <aside className="hidden xl:block">
          <div className="sticky top-4">
            <AiInsightsPanel scope="rh" maxItems={3} compact />
          </div>
        </aside>
      </div>

      {/* Dialog detalhes */}
      <Dialog
        open={detalhe != null}
        onOpenChange={(o) => !o && setDetalheId(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Solicitação de férias</DialogTitle>
            <DialogDescription>
              Detalhes completos e histórico
            </DialogDescription>
          </DialogHeader>
          {detalhe && (
            <div className="space-y-4 text-sm">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={detalheCol?.avatarUrl} />
                  <AvatarFallback>
                    {detalheCol ? getInitials(detalheCol.nome) : '??'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{detalheCol?.nome}</p>
                  <p className="text-xs text-muted-foreground">
                    {detalheCol?.cargo} · {detalheCol?.departamento}
                  </p>
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Início
                  </Label>
                  <p>{fmtDate(detalhe.dataInicio)}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Fim</Label>
                  <p>{fmtDate(detalhe.dataFim)}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Dias úteis
                  </Label>
                  <p className="font-semibold">{detalhe.diasUteis}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Status
                  </Label>
                  <Badge
                    variant="outline"
                    className={cn(statusMeta[detalhe.status].cls)}
                  >
                    {statusMeta[detalhe.status].label}
                  </Badge>
                </div>
              </div>
              {detalhe.motivoRejeicao && (
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Motivo da rejeição
                  </Label>
                  <p className="rounded-md bg-rose-500/10 p-2 text-rose-600 dark:text-rose-400">
                    {detalhe.motivoRejeicao}
                  </p>
                </div>
              )}
              <div>
                <Label className="text-xs text-muted-foreground">
                  Histórico
                </Label>
                <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
                  <li>• Criada {fmtRelative(detalhe.createdAt)}</li>
                  {detalhe.aprovadorId && (
                    <li>• Processada por {detalhe.aprovadorId}</li>
                  )}
                </ul>
              </div>
            </div>
          )}
          <DialogFooter>
            {detalhe?.status === 'pendente' && (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setRejeitarAlvo(detalhe.id);
                    setRejeitarMotivo('');
                    setDetalheId(null);
                  }}
                >
                  Rejeitar
                </Button>
                <Button
                  onClick={() => {
                    aprovarMut.mutate(detalhe.id);
                    setDetalheId(null);
                  }}
                >
                  Aprovar
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog motivo rejeição */}
      <Dialog
        open={rejeitarAlvo != null}
        onOpenChange={(o) => !o && setRejeitarAlvo(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Rejeitar solicitação</DialogTitle>
            <DialogDescription>
              Informe um motivo — será visível ao colaborador.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={rejeitarMotivo}
            onChange={(e) => setRejeitarMotivo(e.target.value)}
            placeholder="Ex.: conflito com fechamento de projeto crítico…"
            rows={4}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRejeitarAlvo(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={!rejeitarMotivo.trim()}
              onClick={() => {
                if (rejeitarAlvo) {
                  rejeitarMut.mutate({
                    id: rejeitarAlvo,
                    motivo: rejeitarMotivo.trim(),
                  });
                }
                setRejeitarAlvo(null);
              }}
            >
              Confirmar rejeição
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog dia do calendário */}
      <Dialog open={calDia != null} onOpenChange={(o) => !o && setCalDia(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {calDia
                ? format(calDia, "dd 'de' MMMM yyyy", { locale: ptBR })
                : ''}
            </DialogTitle>
            <DialogDescription>
              Colaboradores de folga neste dia
            </DialogDescription>
          </DialogHeader>
          {calDia && (
            <ul className="space-y-2">
              {filtradas
                .filter((f) => {
                  const i = safeParse(f.dataInicio);
                  const fim = safeParse(f.dataFim);
                  return (
                    i && fim && isWithinInterval(calDia, { start: i, end: fim })
                  );
                })
                .map((f) => {
                  const col = colById.get(f.colaboradorId);
                  return (
                    <li
                      key={f.id}
                      className="flex items-center gap-2 rounded-md border border-border p-2"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={col?.avatarUrl} />
                        <AvatarFallback>
                          {col ? getInitials(col.nome) : '??'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 text-sm">
                        <p className="truncate font-medium">{col?.nome}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {col?.departamento}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn('ml-auto', statusMeta[f.status].cls)}
                      >
                        {statusMeta[f.status].label}
                      </Badge>
                    </li>
                  );
                })}
            </ul>
          )}
        </DialogContent>
      </Dialog>

      {/* Sheet Nova solicitação */}
      <NovaSolicitacaoSheet
        open={novoOpen}
        onOpenChange={setNovoOpen}
        colaboradores={colaboradores}
      />
    </RhLayout>
  );
}

/* ------------------------------------------------------------------ */
/* Subcomponents                                                       */
/* ------------------------------------------------------------------ */

function ViewToggle({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
}): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1 text-xs transition',
        active
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:text-foreground'
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function KpiGrid({
  kpis,
  loading,
}: {
  kpis: {
    pendentes: number;
    emAndamento: number;
    aprovadasMes: number;
    diasYtd: number;
    saldoMedio: number;
  };
  loading: boolean;
}): JSX.Element {
  const items = [
    {
      label: 'Pendentes',
      value: kpis.pendentes,
      icon: <Clock className="h-4 w-4" />,
      cls: 'border-amber-500/30 bg-amber-500/5',
      pulse: kpis.pendentes > 0,
    },
    {
      label: 'Em andamento',
      value: kpis.emAndamento,
      icon: <LayoutGrid className="h-4 w-4" />,
      cls: 'border-sky-500/30 bg-sky-500/5',
      pulse: false,
    },
    {
      label: 'Aprovadas (mês)',
      value: kpis.aprovadasMes,
      icon: <CheckCircle2 className="h-4 w-4" />,
      cls: 'border-emerald-500/30 bg-emerald-500/5',
      pulse: false,
    },
    {
      label: 'Dias consumidos YTD',
      value: kpis.diasYtd,
      icon: <TrendingUp className="h-4 w-4" />,
      cls: 'border-violet-500/30 bg-violet-500/5',
      pulse: false,
    },
    {
      label: 'Saldo médio (dias)',
      value: kpis.saldoMedio,
      icon: <CalendarDays className="h-4 w-4" />,
      cls: 'border-slate-500/30 bg-slate-500/5',
      pulse: false,
    },
  ];
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: 0.05 } },
      }}
      className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5"
    >
      {items.map((it) => (
        <motion.div
          key={it.label}
          variants={{
            hidden: { opacity: 0, y: 8 },
            visible: { opacity: 1, y: 0 },
          }}
        >
          <Card className={cn('relative overflow-hidden', it.cls)}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {it.label}
                </span>
                <span className="text-muted-foreground">{it.icon}</span>
              </div>
              <div className="mt-1 text-2xl font-semibold">
                {loading ? <Skeleton className="h-7 w-12" /> : it.value}
              </div>
              {it.pulse && (
                <span className="absolute right-3 top-3 flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-500/70" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
                </span>
              )}
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </motion.div>
  );
}

function TableSkeleton(): JSX.Element {
  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function EmptyState(): JSX.Element {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center gap-2 p-10 text-center">
        <CalendarDays className="h-10 w-10 text-muted-foreground" />
        <p className="text-sm font-medium">Nenhuma solicitação encontrada</p>
        <p className="text-xs text-muted-foreground">
          Ajuste os filtros ou crie uma nova solicitação.
        </p>
      </CardContent>
    </Card>
  );
}

function CalendarioMes({
  month,
  ferias,
  colById,
  onPrev,
  onNext,
  onDayClick,
}: {
  month: Date;
  ferias: SolicitacaoFerias[];
  colById: Map<string, Colaborador>;
  onPrev: () => void;
  onNext: () => void;
  onDayClick: (d: Date) => void;
}): JSX.Element {
  const start = startOfMonth(month);
  const end = endOfMonth(month);
  const dias = eachDayOfInterval({ start, end });
  const leadingBlanks = (start.getDay() + 7) % 7;

  const feriasDoDia = (d: Date) =>
    ferias.filter((f) => {
      const i = safeParse(f.dataInicio);
      const fm = safeParse(f.dataFim);
      return i && fm && isWithinInterval(d, { start: i, end: fm });
    });

  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onPrev}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h3 className="text-sm font-semibold capitalize">
              {format(month, 'MMMM yyyy', { locale: ptBR })}
            </h3>
            <Button variant="ghost" size="sm" onClick={onNext}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            {(
              [
                'pendente',
                'aprovada',
                'em_andamento',
                'concluida',
              ] as FeriasStatus[]
            ).map((s) => (
              <span key={s} className="inline-flex items-center gap-1">
                <span
                  className={cn('h-2 w-2 rounded-full', statusMeta[s].dot)}
                />
                {statusMeta[s].label}
              </span>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-muted-foreground">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((d) => (
            <div key={d} className="py-1">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: leadingBlanks }).map((_, i) => (
            <div key={`b-${i}`} />
          ))}
          {dias.map((d) => {
            const items = feriasDoDia(d);
            const isToday = isSameDay(d, new Date());
            return (
              <button
                key={d.toISOString()}
                type="button"
                onClick={() => items.length > 0 && onDayClick(d)}
                className={cn(
                  'group relative flex h-20 flex-col items-start justify-start rounded-md border border-border/60 p-1 text-left text-xs transition',
                  items.length > 0 && 'bg-primary/5 hover:bg-primary/10',
                  isToday && 'ring-1 ring-primary'
                )}
              >
                <span
                  className={cn(
                    'text-[11px] font-medium',
                    isWeekend(d) && 'text-muted-foreground'
                  )}
                >
                  {format(d, 'd')}
                </span>
                {items.length > 0 && (
                  <div className="mt-auto flex -space-x-1">
                    {items.slice(0, 3).map((f) => {
                      const col = colById.get(f.colaboradorId);
                      return (
                        <Avatar
                          key={f.id}
                          className="h-5 w-5 border border-background"
                        >
                          <AvatarImage src={col?.avatarUrl} />
                          <AvatarFallback className="text-[8px]">
                            {col ? getInitials(col.nome) : '?'}
                          </AvatarFallback>
                        </Avatar>
                      );
                    })}
                    {items.length > 3 && (
                      <span className="ml-1 text-[9px] text-muted-foreground">
                        +{items.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function TimelineGantt({
  ferias,
  colaboradores,
}: {
  ferias: SolicitacaoFerias[];
  colaboradores: Colaborador[];
}): JSX.Element {
  const MESES = 6;
  const start = startOfMonth(new Date());
  const end = endOfMonth(addMonths(start, MESES - 1));
  const totalDias = differenceInDays(end, start) + 1;
  const linhas = useMemo(() => {
    const map = new Map<string, SolicitacaoFerias[]>();
    ferias.forEach((f) => {
      const arr = map.get(f.colaboradorId) ?? [];
      arr.push(f);
      map.set(f.colaboradorId, arr);
    });
    return Array.from(map.entries()).slice(0, 20);
  }, [ferias]);

  const meses = Array.from({ length: MESES }, (_, i) => addMonths(start, i));

  return (
    <Card>
      <CardContent className="p-4">
        <div className="overflow-x-auto">
          <div className="min-w-[720px]">
            <div className="mb-2 grid grid-cols-[180px_1fr] items-center gap-2 text-xs text-muted-foreground">
              <div>Colaborador</div>
              <div
                className="grid"
                style={{ gridTemplateColumns: `repeat(${MESES}, 1fr)` }}
              >
                {meses.map((m) => (
                  <div key={m.toISOString()} className="text-center capitalize">
                    {format(m, 'MMM/yy', { locale: ptBR })}
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              {linhas.length === 0 && (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  Nenhum dado para exibir
                </div>
              )}
              {linhas.map(([colId, fs]) => {
                const col = colaboradores.find((c) => c.id === colId);
                return (
                  <div
                    key={colId}
                    className="grid grid-cols-[180px_1fr] items-center gap-2"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={col?.avatarUrl} />
                        <AvatarFallback className="text-[9px]">
                          {col ? getInitials(col.nome) : '?'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="truncate text-xs">
                        {col?.nome ?? colId}
                      </span>
                    </div>
                    <div className="relative h-6 rounded bg-muted/50">
                      {fs.map((f) => {
                        const i = safeParse(f.dataInicio);
                        const fm = safeParse(f.dataFim);
                        if (!i || !fm) return null;
                        const startDiff = Math.max(
                          0,
                          differenceInDays(i, start)
                        );
                        const endDiff = Math.min(
                          totalDias,
                          differenceInDays(fm, start) + 1
                        );
                        if (endDiff <= 0 || startDiff >= totalDias) return null;
                        const leftPct = (startDiff / totalDias) * 100;
                        const widthPct =
                          ((endDiff - startDiff) / totalDias) * 100;
                        const meta = statusMeta[f.status];
                        return (
                          <div
                            key={f.id}
                            className={cn(
                              'absolute top-0.5 h-5 rounded text-[9px] text-white',
                              meta.dot
                            )}
                            style={{
                              left: `${leftPct}%`,
                              width: `${Math.max(1, widthPct)}%`,
                            }}
                            title={`${fmtDate(f.dataInicio)} → ${fmtDate(f.dataFim)}`}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AnalyticsPanel({
  ferias,
  colById,
}: {
  ferias: SolicitacaoFerias[];
  colById: Map<string, Colaborador>;
}): JSX.Element {
  const porStatus = useMemo(() => {
    const counts: Record<FeriasStatus, number> = {
      pendente: 0,
      aprovada: 0,
      rejeitada: 0,
      em_andamento: 0,
      concluida: 0,
    };
    ferias.forEach((f) => (counts[f.status] += 1));
    const total = ferias.length || 1;
    return (Object.keys(counts) as FeriasStatus[]).map((k) => ({
      status: k,
      value: counts[k],
      pct: counts[k] / total,
    }));
  }, [ferias]);

  const porMes = useMemo(() => {
    const now = new Date();
    const ano = now.getFullYear();
    const arr = Array.from({ length: 12 }, (_, i) => ({ mes: i, count: 0 }));
    ferias.forEach((f) => {
      const d = safeParse(f.dataInicio);
      if (d && d.getFullYear() === ano) arr[d.getMonth()]!.count += 1;
    });
    return arr;
  }, [ferias]);

  const porDepartamento = useMemo(() => {
    const map = new Map<string, number>();
    ferias.forEach((f) => {
      const col = colById.get(f.colaboradorId);
      if (!col) return;
      map.set(col.departamento, (map.get(col.departamento) ?? 0) + 1);
    });
    return Array.from(map.entries())
      .map(([nome, count]) => ({ nome, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [ferias, colById]);

  const maxMes = Math.max(1, ...porMes.map((m) => m.count));
  const maxDept = Math.max(1, ...porDepartamento.map((d) => d.count));

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {/* Donut status */}
      <Card>
        <CardContent className="p-4">
          <h4 className="mb-3 text-sm font-semibold">
            Distribuição por status
          </h4>
          <div className="flex items-center gap-4">
            <DonutSvg data={porStatus} />
            <ul className="flex-1 space-y-1 text-xs">
              {porStatus.map((d) => (
                <li key={d.status} className="flex items-center gap-2">
                  <span
                    className={cn(
                      'h-2 w-2 rounded-full',
                      statusMeta[d.status].dot
                    )}
                  />
                  <span className="flex-1">{statusMeta[d.status].label}</span>
                  <span className="font-medium">{d.value}</span>
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Barras mês */}
      <Card>
        <CardContent className="p-4">
          <h4 className="mb-3 text-sm font-semibold">Férias por mês</h4>
          <svg viewBox="0 0 360 140" className="h-32 w-full">
            {porMes.map((m, i) => {
              const barW = 360 / 12 - 4;
              const x = i * (360 / 12) + 2;
              const h = (m.count / maxMes) * 110;
              return (
                <g key={i}>
                  <rect
                    x={x}
                    y={120 - h}
                    width={barW}
                    height={h}
                    rx={2}
                    className="fill-primary/70"
                  />
                  <text
                    x={x + barW / 2}
                    y={135}
                    textAnchor="middle"
                    className="fill-muted-foreground text-[8px]"
                  >
                    {format(new Date(2024, i, 1), 'MMM', { locale: ptBR })}
                  </text>
                </g>
              );
            })}
          </svg>
        </CardContent>
      </Card>

      {/* Top departamentos */}
      <Card>
        <CardContent className="p-4">
          <h4 className="mb-3 text-sm font-semibold">
            Top departamentos com mais ausências
          </h4>
          <ul className="space-y-2">
            {porDepartamento.length === 0 && (
              <li className="text-xs text-muted-foreground">Sem dados</li>
            )}
            {porDepartamento.map((d) => (
              <li key={d.nome} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span>{d.nome}</span>
                  <span className="font-medium">{d.count}</span>
                </div>
                <div className="h-2 overflow-hidden rounded bg-muted">
                  <div
                    className="h-full bg-violet-500"
                    style={{ width: `${(d.count / maxDept) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Destaques */}
      <div className="space-y-4">
        <Card className="border-violet-500/30 bg-violet-500/5">
          <CardContent className="flex items-start gap-3 p-4">
            <TrendingUp className="mt-0.5 h-5 w-5 text-violet-500" />
            <div>
              <p className="text-sm font-medium">
                Próximo mês de pico: Dezembro
              </p>
              <p className="text-xs text-muted-foreground">
                18 solicitações previstas. Avalie escalonamento antecipado.
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="flex items-start gap-3 p-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-500" />
            <div>
              <p className="text-sm font-medium">
                3 colaboradores com mais de 30 dias acumulados
              </p>
              <p className="text-xs text-muted-foreground">
                Risco de perda de saldo — priorize aprovações.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DonutSvg({
  data,
}: {
  data: { status: FeriasStatus; value: number; pct: number }[];
}): JSX.Element {
  const size = 120;
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  const colors: Record<FeriasStatus, string> = {
    pendente: '#f59e0b',
    aprovada: '#10b981',
    rejeitada: '#f43f5e',
    em_andamento: '#0ea5e9',
    concluida: '#64748b',
  };
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="h-32 w-32">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        className="stroke-muted"
        strokeWidth={14}
      />
      {total > 0 &&
        data.map((d) => {
          if (d.value === 0) return null;
          const dash = d.pct * circumference;
          const seg = (
            <circle
              key={d.status}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={colors[d.status]}
              strokeWidth={14}
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-offset}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          );
          offset += dash;
          return seg;
        })}
      <text
        x={size / 2}
        y={size / 2 + 4}
        textAnchor="middle"
        className="fill-foreground text-sm font-semibold"
      >
        {total}
      </text>
    </svg>
  );
}

function NovaSolicitacaoSheet({
  open,
  onOpenChange,
  colaboradores,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  colaboradores: Colaborador[];
}): JSX.Element {
  const [colId, setColId] = useState<string>('');
  const [inicio, setInicio] = useState<string>('');
  const [fim, setFim] = useState<string>('');
  const [motivo, setMotivo] = useState<string>('');
  const [obs, setObs] = useState<string>('');

  const diasUteis = useMemo(
    () => (inicio && fim ? calcDiasUteis(inicio, fim) : 0),
    [inicio, fim]
  );

  const canSubmit = colId && inicio && fim && diasUteis > 0;

  const onSubmit = () => {
    toast.success('Solicitação enviada para aprovação');
    onOpenChange(false);
    setColId('');
    setInicio('');
    setFim('');
    setMotivo('');
    setObs('');
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Nova solicitação de férias</SheetTitle>
          <SheetDescription>
            Os dias úteis são calculados automaticamente (seg-sex).
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          <div>
            <Label>Colaborador</Label>
            <Select value={colId} onValueChange={setColId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione…" />
              </SelectTrigger>
              <SelectContent>
                {colaboradores.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Início</Label>
              <Input
                type="date"
                value={inicio}
                onChange={(e) => setInicio(e.target.value)}
              />
            </div>
            <div>
              <Label>Fim</Label>
              <Input
                type="date"
                value={fim}
                onChange={(e) => setFim(e.target.value)}
              />
            </div>
          </div>
          <div className="rounded-md border border-border bg-muted/30 p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Dias úteis</span>
              <span className="text-lg font-semibold">{diasUteis}</span>
            </div>
          </div>
          <div>
            <Label>Motivo (opcional)</Label>
            <Input
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ex.: férias anuais"
            />
          </div>
          <div>
            <Label>Observações</Label>
            <Textarea
              value={obs}
              onChange={(e) => setObs(e.target.value)}
              rows={3}
              placeholder="Detalhes adicionais…"
            />
          </div>
          <Button className="w-full" disabled={!canSubmit} onClick={onSubmit}>
            <Send className="mr-2 h-4 w-4" />
            Enviar solicitação
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
