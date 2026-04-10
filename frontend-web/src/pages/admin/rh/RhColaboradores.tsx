/**
 * RhColaboradores — Gestão completa do quadro de funcionários.
 *
 * Lista com filtros avançados (busca, depto, status, contrato, gênero,
 * salário, data admissão, ordenação), visualizações tabela/grid/organograma,
 * seleção em lote, perfil em Sheet com tabs e formulário de novo colaborador
 * em 3 steps. Consome `@/services/rhApi` via TanStack Query singleton local.
 *
 * Stack: Vite + React + TS + Tailwind + shadcn + framer-motion.
 * Zero dependências novas.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type ReactNode,
} from 'react';
import {
  QueryClient,
  QueryClientProvider,
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowUpDown,
  Briefcase,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock,
  Download,
  Edit3,
  FileSpreadsheet,
  FileText,
  Filter,
  Grid3x3,
  LayoutGrid,
  Mail,
  MapPin,
  MessageSquare,
  MoreHorizontal,
  Phone,
  Plus,
  Search,
  Send,
  Sparkles,
  Table2,
  Trash2,
  TrendingUp,
  Upload,
  UserCog,
  UserMinus,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { differenceInDays, format, parseISO } from 'date-fns';
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
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Pagination } from '@/components/ui/pagination';
import { Textarea } from '@/components/ui/textarea';

import {
  createColaborador,
  deleteColaborador,
  listColaboradores,
  listDepartamentos,
  updateColaborador,
} from '@/services/rhApi';
import type {
  Colaborador,
  ColaboradorStatus,
  ContratoTipo,
  Departamento,
  Genero,
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

const brl = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
});

function formatDatePtBR(iso: string): string {
  try {
    return format(parseISO(iso), 'dd/MM/yyyy', { locale: ptBR });
  } catch {
    return iso;
  }
}

function tempoDeCasa(iso: string): string {
  try {
    const dias = differenceInDays(new Date(), parseISO(iso));
    if (dias < 30) return `${dias}d`;
    if (dias < 365) return `${Math.floor(dias / 30)}m`;
    const anos = Math.floor(dias / 365);
    const meses = Math.floor((dias % 365) / 30);
    return meses > 0 ? `${anos}a ${meses}m` : `${anos}a`;
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

type SortKey =
  | 'nome-asc'
  | 'nome-desc'
  | 'admissao-desc'
  | 'admissao-asc'
  | 'salario-desc'
  | 'salario-asc';

type ViewMode = 'tabela' | 'grid' | 'organograma';

interface Filtros {
  search: string;
  departamento: string;
  status: 'todos' | ColaboradorStatus;
  contrato: 'todos' | ContratoTipo;
  genero: 'todos' | Genero;
  salarioMin: string;
  salarioMax: string;
  admissaoDe: string;
  admissaoAte: string;
  sort: SortKey;
}

const defaultFiltros: Filtros = {
  search: '',
  departamento: 'todos',
  status: 'todos',
  contrato: 'todos',
  genero: 'todos',
  salarioMin: '',
  salarioMax: '',
  admissaoDe: '',
  admissaoAte: '',
  sort: 'nome-asc',
};

function countActiveFilters(f: Filtros): number {
  let n = 0;
  if (f.search) n++;
  if (f.departamento !== 'todos') n++;
  if (f.status !== 'todos') n++;
  if (f.contrato !== 'todos') n++;
  if (f.genero !== 'todos') n++;
  if (f.salarioMin) n++;
  if (f.salarioMax) n++;
  if (f.admissaoDe) n++;
  if (f.admissaoAte) n++;
  return n;
}

const statusBadgeStyles: Record<
  ColaboradorStatus,
  { label: string; cls: string }
> = {
  ativo: {
    label: 'Ativo',
    cls: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
  },
  ferias: {
    label: 'Férias',
    cls: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
  },
  afastado: {
    label: 'Afastado',
    cls: 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30',
  },
  desligado: {
    label: 'Desligado',
    cls: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30',
  },
};

const contratoBadgeStyles: Record<ContratoTipo, string> = {
  CLT: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
  PJ: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30',
  Estagio: 'bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-500/30',
};

/* ------------------------------------------------------------------ */
/* Debounce hook                                                       */
/* ------------------------------------------------------------------ */

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

const PAGE_SIZE = 12;

export function RhColaboradores(): JSX.Element {
  return (
    <QueryClientProvider client={getLocalQueryClient()}>
      <RhColaboradoresInner />
    </QueryClientProvider>
  );
}

export default RhColaboradores;

function RhColaboradoresInner(): JSX.Element {
  const qc = useQueryClient();

  const [filtros, setFiltros] = useState<Filtros>(defaultFiltros);
  const debouncedSearch = useDebounced(filtros.search, 300);

  const [page, setPage] = useState(1);
  const [view, setView] = useState<ViewMode>('tabela');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [perfilId, setPerfilId] = useState<string | null>(null);
  const [novoOpen, setNovoOpen] = useState(false);

  // Reset da página 1 quando filtros mudam — reset legítimo pós-filtro,
  // não cascading render.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(1);
  }, [
    debouncedSearch,
    filtros.departamento,
    filtros.status,
    filtros.contrato,
    filtros.genero,
    filtros.salarioMin,
    filtros.salarioMax,
    filtros.admissaoDe,
    filtros.admissaoAte,
    filtros.sort,
  ]);

  // Buscamos TODOS (pageSize grande) para aplicar filtros client-side avançados e KPIs.
  const listQuery = useQuery({
    queryKey: [
      'rh-colaboradores',
      debouncedSearch,
      filtros.departamento,
      filtros.status,
    ],
    queryFn: () =>
      listColaboradores({
        search: debouncedSearch || undefined,
        departamento:
          filtros.departamento !== 'todos' ? filtros.departamento : undefined,
        status: filtros.status !== 'todos' ? filtros.status : undefined,
        page: 1,
        pageSize: 500,
      }),
    placeholderData: keepPreviousData,
  });

  const deptosQuery = useQuery({
    queryKey: ['rh-departamentos'],
    queryFn: listDepartamentos,
  });

  const allItems = useMemo(() => listQuery.data?.items ?? [], [listQuery.data]);

  const filtradosEOrdenados = useMemo(() => {
    let items = [...allItems];
    if (filtros.contrato !== 'todos')
      items = items.filter((c) => c.contratoTipo === filtros.contrato);
    if (filtros.genero !== 'todos')
      items = items.filter((c) => c.genero === filtros.genero);
    const sMin = Number(filtros.salarioMin);
    const sMax = Number(filtros.salarioMax);
    if (filtros.salarioMin && !Number.isNaN(sMin))
      items = items.filter((c) => c.salario >= sMin);
    if (filtros.salarioMax && !Number.isNaN(sMax))
      items = items.filter((c) => c.salario <= sMax);
    if (filtros.admissaoDe)
      items = items.filter((c) => c.dataAdmissao >= filtros.admissaoDe);
    if (filtros.admissaoAte)
      items = items.filter((c) => c.dataAdmissao <= filtros.admissaoAte);

    items.sort((a, b) => {
      switch (filtros.sort) {
        case 'nome-asc':
          return a.nome.localeCompare(b.nome, 'pt-BR');
        case 'nome-desc':
          return b.nome.localeCompare(a.nome, 'pt-BR');
        case 'admissao-desc':
          return b.dataAdmissao.localeCompare(a.dataAdmissao);
        case 'admissao-asc':
          return a.dataAdmissao.localeCompare(b.dataAdmissao);
        case 'salario-desc':
          return b.salario - a.salario;
        case 'salario-asc':
          return a.salario - b.salario;
        default:
          return 0;
      }
    });
    return items;
  }, [allItems, filtros]);

  const totalFiltrados = filtradosEOrdenados.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltrados / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const pageItems = filtradosEOrdenados.slice(
    (pageSafe - 1) * PAGE_SIZE,
    pageSafe * PAGE_SIZE
  );

  // KPIs baseados no conjunto completo (sem filtros client-side)
  const kpis = useMemo(() => {
    const items = allItems;
    const total = items.length;
    const ativos = items.filter((c) => c.status === 'ativo').length;
    const ferias = items.filter((c) => c.status === 'ferias').length;
    const afastados = items.filter((c) => c.status === 'afastado').length;
    const hoje = new Date();
    const desligados30d = items.filter((c) => {
      if (c.status !== 'desligado') return false;
      try {
        return differenceInDays(hoje, parseISO(c.dataAdmissao)) <= 30;
      } catch {
        return false;
      }
    }).length;
    return { total, ativos, ferias, afastados, desligados30d };
  }, [allItems]);

  /* ---------------- Mutations ---------------- */

  const invalidate = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['rh-colaboradores'] });
  }, [qc]);

  const createMut = useMutation({
    mutationFn: (data: Omit<Colaborador, 'id'>) => createColaborador(data),
    onSuccess: () => {
      toast.success('Colaborador criado com sucesso');
      invalidate();
      setNovoOpen(false);
    },
    onError: (e: Error) => toast.error(e.message ?? 'Erro ao criar'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Colaborador> }) =>
      updateColaborador(id, data),
    onSuccess: () => {
      toast.success('Colaborador atualizado');
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message ?? 'Erro ao atualizar'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteColaborador(id),
    onSuccess: () => {
      toast.success('Colaborador removido');
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message ?? 'Erro ao remover'),
  });

  /* ---------------- Handlers ---------------- */

  const setF = useCallback(<K extends keyof Filtros>(k: K, v: Filtros[K]) => {
    setFiltros((prev) => ({ ...prev, [k]: v }));
  }, []);

  const limparFiltros = () => {
    setFiltros(defaultFiltros);
    toast.info('Filtros limpos');
  };

  const toggleSel = (id: string) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const togglePageSel = () => {
    setSelected((prev) => {
      const n = new Set(prev);
      const allOn = pageItems.every((c) => n.has(c.id));
      if (allOn) pageItems.forEach((c) => n.delete(c.id));
      else pageItems.forEach((c) => n.add(c.id));
      return n;
    });
  };

  const clearSel = () => setSelected(new Set());

  const handleDesligar = (id: string) => {
    updateMut.mutate({ id, data: { status: 'desligado' } });
  };

  const handleBulkDesligar = () => {
    selected.forEach((id) =>
      updateMut.mutate({ id, data: { status: 'desligado' } })
    );
    clearSel();
  };

  const handleExport = (format: 'csv' | 'excel') => {
    toast.success(`Exportação ${format.toUpperCase()} iniciada`);
  };

  const perfilColaborador = useMemo(
    () => (perfilId ? (allItems.find((c) => c.id === perfilId) ?? null) : null),
    [allItems, perfilId]
  );

  /* ---------------- Render ---------------- */

  const activeFilterCount = countActiveFilters(filtros);

  return (
    <RhLayout
      title="Colaboradores"
      subtitle="Gestão completa do quadro de funcionários"
      actions={
        <Button onClick={() => setNovoOpen(true)} className="gap-2" size="sm">
          <Plus className="h-4 w-4" />
          Novo colaborador
        </Button>
      }
    >
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-5">
          {/* KPIs */}
          <KpiStrip
            loading={listQuery.isLoading}
            total={kpis.total}
            ativos={kpis.ativos}
            ferias={kpis.ferias}
            afastados={kpis.afastados}
            desligados30d={kpis.desligados30d}
          />

          {/* Filtros sticky */}
          <FiltrosBar
            filtros={filtros}
            setF={setF}
            limparFiltros={limparFiltros}
            activeFilterCount={activeFilterCount}
            departamentos={deptosQuery.data ?? []}
            view={view}
            setView={setView}
            onExport={handleExport}
          />

          {/* Conteúdo principal */}
          <div className="relative">
            {listQuery.isLoading ? (
              <LoadingSkeleton view={view} />
            ) : totalFiltrados === 0 ? (
              <EmptyState onClear={limparFiltros} />
            ) : view === 'tabela' ? (
              <TabelaView
                items={pageItems}
                selected={selected}
                toggleSel={toggleSel}
                togglePageSel={togglePageSel}
                onPerfil={setPerfilId}
                onDesligar={handleDesligar}
                onDelete={(id) => deleteMut.mutate(id)}
              />
            ) : view === 'grid' ? (
              <GridView items={pageItems} onPerfil={setPerfilId} />
            ) : (
              <OrganogramaView items={filtradosEOrdenados} />
            )}

            {view !== 'organograma' && totalFiltrados > 0 && (
              <Pagination
                page={pageSafe}
                pageSize={PAGE_SIZE}
                totalCount={totalFiltrados}
                onPageChange={setPage}
              />
            )}
          </div>
        </div>

        {/* Sidebar AI */}
        <aside className="hidden xl:block">
          <div className="sticky top-4">
            <AiInsightsPanel scope="rh" maxItems={4} compact />
          </div>
        </aside>
      </div>

      {/* Ações bulk flutuante */}
      <AnimatePresence>
        {selected.size > 0 && (
          <BulkBar
            count={selected.size}
            onClear={clearSel}
            onDesligar={handleBulkDesligar}
            onExport={() => handleExport('csv')}
          />
        )}
      </AnimatePresence>

      {/* Sheet perfil */}
      <PerfilSheet
        colaborador={perfilColaborador}
        open={!!perfilId}
        onOpenChange={(o) => !o && setPerfilId(null)}
      />

      {/* Sheet novo colaborador */}
      <NovoColaboradorSheet
        open={novoOpen}
        onOpenChange={setNovoOpen}
        departamentos={deptosQuery.data ?? []}
        onSubmit={(data) => createMut.mutate(data)}
        submitting={createMut.isPending}
      />
    </RhLayout>
  );
}

/* ================================================================== */
/* KPI STRIP                                                            */
/* ================================================================== */

interface KpiStripProps {
  loading: boolean;
  total: number;
  ativos: number;
  ferias: number;
  afastados: number;
  desligados30d: number;
}

function KpiStrip({
  loading,
  total,
  ativos,
  ferias,
  afastados,
  desligados30d,
}: KpiStripProps): JSX.Element {
  const cards: {
    label: string;
    value: number;
    icon: ReactNode;
    tint: string;
    iconCls: string;
  }[] = [
    {
      label: 'Total',
      value: total,
      icon: <Users className="h-4 w-4" />,
      tint: 'from-sky-500/10 to-sky-500/0 border-sky-500/20',
      iconCls: 'text-sky-500 bg-sky-500/10',
    },
    {
      label: 'Ativos',
      value: ativos,
      icon: <CheckCircle2 className="h-4 w-4" />,
      tint: 'from-emerald-500/10 to-emerald-500/0 border-emerald-500/20',
      iconCls: 'text-emerald-500 bg-emerald-500/10',
    },
    {
      label: 'Em férias',
      value: ferias,
      icon: <CalendarDays className="h-4 w-4" />,
      tint: 'from-amber-500/10 to-amber-500/0 border-amber-500/20',
      iconCls: 'text-amber-500 bg-amber-500/10',
    },
    {
      label: 'Afastados',
      value: afastados,
      icon: <AlertTriangle className="h-4 w-4" />,
      tint: 'from-orange-500/10 to-orange-500/0 border-orange-500/20',
      iconCls: 'text-orange-500 bg-orange-500/10',
    },
    {
      label: 'Desligados 30d',
      value: desligados30d,
      icon: <UserMinus className="h-4 w-4" />,
      tint: 'from-rose-500/10 to-rose-500/0 border-rose-500/20',
      iconCls: 'text-rose-500 bg-rose-500/10',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {cards.map((c, i) => (
        <motion.div
          key={c.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: i * 0.05 }}
        >
          <Card
            className={cn('overflow-hidden border bg-gradient-to-br', c.tint)}
          >
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  {c.label}
                </span>
                <span className={cn('rounded-md p-1.5', c.iconCls)}>
                  {c.icon}
                </span>
              </div>
              <div className="mt-1 text-2xl font-bold tabular-nums">
                {loading ? <Skeleton className="h-7 w-12" /> : c.value}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}

/* ================================================================== */
/* FILTROS BAR                                                          */
/* ================================================================== */

interface FiltrosBarProps {
  filtros: Filtros;
  setF: <K extends keyof Filtros>(k: K, v: Filtros[K]) => void;
  limparFiltros: () => void;
  activeFilterCount: number;
  departamentos: Departamento[];
  view: ViewMode;
  setView: (v: ViewMode) => void;
  onExport: (format: 'csv' | 'excel') => void;
}

function FiltrosBar({
  filtros,
  setF,
  limparFiltros,
  activeFilterCount,
  departamentos,
  view,
  setView,
  onExport,
}: FiltrosBarProps): JSX.Element {
  return (
    <div className="sticky top-0 z-20 rounded-xl border bg-card shadow-sm">
      <div className="space-y-3 p-3">
        {/* Linha 1: busca + view toggle + export */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, e-mail ou CPF..."
              value={filtros.search}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setF('search', e.target.value)
              }
              className="h-9 pl-8"
            />
          </div>

          <div className="flex items-center rounded-md border bg-background p-0.5">
            {(
              [
                { k: 'tabela', icon: Table2, label: 'Tabela' },
                { k: 'grid', icon: LayoutGrid, label: 'Grid' },
                { k: 'organograma', icon: Grid3x3, label: 'Organograma' },
              ] as const
            ).map((v) => (
              <button
                key={v.k}
                type="button"
                onClick={() => setView(v.k)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors',
                  view === v.k
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
                aria-label={v.label}
              >
                <v.icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{v.label}</span>
              </button>
            ))}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-1.5">
                <Download className="h-4 w-4" />
                Exportar
                <ChevronDown className="h-3 w-3 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Formato</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onExport('csv')}>
                <FileText className="h-4 w-4" />
                CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onExport('excel')}>
                <FileSpreadsheet className="h-4 w-4" />
                Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Linha 2: selects */}
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4 lg:grid-cols-5">
          <Select
            value={filtros.departamento}
            onValueChange={(v) => setF('departamento', v)}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Departamento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos departamentos</SelectItem>
              {departamentos.map((d) => (
                <SelectItem key={d.id} value={d.nome}>
                  {d.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filtros.status}
            onValueChange={(v) => setF('status', v as Filtros['status'])}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos status</SelectItem>
              <SelectItem value="ativo">Ativo</SelectItem>
              <SelectItem value="ferias">Férias</SelectItem>
              <SelectItem value="afastado">Afastado</SelectItem>
              <SelectItem value="desligado">Desligado</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filtros.contrato}
            onValueChange={(v) => setF('contrato', v as Filtros['contrato'])}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Contrato" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos contratos</SelectItem>
              <SelectItem value="CLT">CLT</SelectItem>
              <SelectItem value="PJ">PJ</SelectItem>
              <SelectItem value="Estagio">Estágio</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filtros.genero}
            onValueChange={(v) => setF('genero', v as Filtros['genero'])}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Gênero" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos gêneros</SelectItem>
              <SelectItem value="masculino">Masculino</SelectItem>
              <SelectItem value="feminino">Feminino</SelectItem>
              <SelectItem value="outro">Outro</SelectItem>
              <SelectItem value="nao_informado">Não informado</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filtros.sort}
            onValueChange={(v) => setF('sort', v as SortKey)}
          >
            <SelectTrigger className="h-9">
              <ArrowUpDown className="mr-1 h-3.5 w-3.5 opacity-60" />
              <SelectValue placeholder="Ordenação" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="nome-asc">Nome A-Z</SelectItem>
              <SelectItem value="nome-desc">Nome Z-A</SelectItem>
              <SelectItem value="admissao-desc">Mais recente</SelectItem>
              <SelectItem value="admissao-asc">Mais antigo</SelectItem>
              <SelectItem value="salario-desc">Maior salário</SelectItem>
              <SelectItem value="salario-asc">Menor salário</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Linha 3: ranges + limpar */}
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">
              Salário (R$)
            </Label>
            <div className="flex items-center gap-1.5">
              <Input
                type="number"
                placeholder="Mín"
                value={filtros.salarioMin}
                onChange={(e) => setF('salarioMin', e.target.value)}
                className="h-8 w-24 text-xs"
                min={0}
              />
              <span className="text-xs text-muted-foreground">—</span>
              <Input
                type="number"
                placeholder="Máx"
                value={filtros.salarioMax}
                onChange={(e) => setF('salarioMax', e.target.value)}
                className="h-8 w-24 text-xs"
                min={0}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">
              Admissão
            </Label>
            <div className="flex items-center gap-1.5">
              <Input
                type="date"
                value={filtros.admissaoDe}
                onChange={(e) => setF('admissaoDe', e.target.value)}
                className="h-8 w-36 text-xs"
              />
              <span className="text-xs text-muted-foreground">—</span>
              <Input
                type="date"
                value={filtros.admissaoAte}
                onChange={(e) => setF('admissaoAte', e.target.value)}
                className="h-8 w-36 text-xs"
              />
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            {activeFilterCount > 0 && (
              <Badge
                variant="outline"
                className="gap-1 border-primary/30 bg-primary/10 text-primary"
              >
                <Filter className="h-3 w-3" />
                {activeFilterCount} filtro
                {activeFilterCount > 1 ? 's' : ''}
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={limparFiltros}
              disabled={activeFilterCount === 0}
              className="h-8 gap-1"
            >
              <X className="h-3.5 w-3.5" />
              Limpar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/* LOADING / EMPTY                                                      */
/* ================================================================== */

function LoadingSkeleton({ view }: { view: ViewMode }): JSX.Element {
  if (view === 'grid') {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-44 rounded-xl" />
        ))}
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 border-b p-3 last:border-b-0"
        >
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-2.5 w-1/4" />
          </div>
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ onClear }: { onClear: () => void }): JSX.Element {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-card/50 p-12 text-center"
    >
      <svg
        className="mb-4 h-24 w-24 text-muted-foreground/40"
        viewBox="0 0 200 160"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <rect
          x="30"
          y="40"
          width="140"
          height="90"
          rx="8"
          stroke="currentColor"
          strokeWidth="3"
          strokeDasharray="6 4"
        />
        <circle cx="70" cy="80" r="14" stroke="currentColor" strokeWidth="3" />
        <path
          d="M52 108c3-10 12-14 18-14s15 4 18 14"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <line
          x1="100"
          y1="72"
          x2="150"
          y2="72"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <line
          x1="100"
          y1="88"
          x2="140"
          y2="88"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
      <h3 className="text-lg font-semibold">Nenhum colaborador encontrado</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        Ajuste os filtros ou limpe a busca para ver mais resultados.
      </p>
      <Button
        variant="outline"
        size="sm"
        className="mt-4 gap-1"
        onClick={onClear}
      >
        <X className="h-3.5 w-3.5" /> Limpar filtros
      </Button>
    </motion.div>
  );
}

/* ================================================================== */
/* TABELA VIEW                                                          */
/* ================================================================== */

interface TabelaViewProps {
  items: Colaborador[];
  selected: Set<string>;
  toggleSel: (id: string) => void;
  togglePageSel: () => void;
  onPerfil: (id: string) => void;
  onDesligar: (id: string) => void;
  onDelete: (id: string) => void;
}

function TabelaView({
  items,
  selected,
  toggleSel,
  togglePageSel,
  onPerfil,
  onDesligar,
  onDelete,
}: TabelaViewProps): JSX.Element {
  const allPageSelected =
    items.length > 0 && items.every((c) => selected.has(c.id));
  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <input
                type="checkbox"
                checked={allPageSelected}
                onChange={togglePageSel}
                aria-label="Selecionar todos"
                className="h-4 w-4 rounded border-input accent-primary"
              />
            </TableHead>
            <TableHead>Colaborador</TableHead>
            <TableHead>Departamento</TableHead>
            <TableHead>Contrato</TableHead>
            <TableHead>Admissão</TableHead>
            <TableHead className="text-right">Salário</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((c, i) => (
            <motion.tr
              key={c.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2, delay: i * 0.015 }}
              className={cn(
                'border-b transition-colors hover:bg-muted/60',
                i % 2 === 1 && 'bg-muted/20',
                selected.has(c.id) && 'bg-primary/5'
              )}
            >
              <TableCell>
                <input
                  type="checkbox"
                  checked={selected.has(c.id)}
                  onChange={() => toggleSel(c.id)}
                  aria-label={`Selecionar ${c.nome}`}
                  className="h-4 w-4 rounded border-input accent-primary"
                />
              </TableCell>
              <TableCell>
                <button
                  type="button"
                  onClick={() => onPerfil(c.id)}
                  className="group flex items-center gap-2.5 text-left"
                >
                  <Avatar className="h-9 w-9">
                    {c.avatarUrl && (
                      <AvatarImage src={c.avatarUrl} alt={c.nome} />
                    )}
                    <AvatarFallback className="text-xs">
                      {getInitials(c.nome)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium transition-colors group-hover:text-primary">
                      {c.nome}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {c.cargo}
                    </div>
                  </div>
                </button>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="font-normal">
                  {c.departamento}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={cn(
                    'font-normal',
                    contratoBadgeStyles[c.contratoTipo]
                  )}
                >
                  {c.contratoTipo}
                </Badge>
              </TableCell>
              <TableCell className="text-xs">
                <div>{formatDatePtBR(c.dataAdmissao)}</div>
                <div className="text-[11px] text-muted-foreground">
                  {tempoDeCasa(c.dataAdmissao)} de casa
                </div>
              </TableCell>
              <TableCell className="text-right text-sm tabular-nums">
                {brl.format(c.salario)}
              </TableCell>
              <TableCell>
                <motion.div
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                >
                  <Badge
                    variant="outline"
                    className={cn(
                      'font-normal',
                      statusBadgeStyles[c.status].cls
                    )}
                  >
                    {statusBadgeStyles[c.status].label}
                  </Badge>
                </motion.div>
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      aria-label="Ações"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onPerfil(c.id)}>
                      <Users className="h-4 w-4" />
                      Ver perfil
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onPerfil(c.id)}>
                      <Edit3 className="h-4 w-4" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => toast.info('Mensagem enviada (mock)')}
                    >
                      <MessageSquare className="h-4 w-4" />
                      Mensagem
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => toast.info('Promoção registrada (mock)')}
                    >
                      <TrendingUp className="h-4 w-4" />
                      Promover
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onDesligar(c.id)}>
                      <UserMinus className="h-4 w-4" />
                      Desligar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onDelete(c.id)}>
                      <Trash2 className="h-4 w-4" />
                      Remover
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </motion.tr>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/* ================================================================== */
/* GRID VIEW                                                            */
/* ================================================================== */

function GridView({
  items,
  onPerfil,
}: {
  items: Colaborador[];
  onPerfil: (id: string) => void;
}): JSX.Element {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((c, i) => (
        <motion.div
          key={c.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: i * 0.03 }}
          whileHover={{ scale: 1.02 }}
        >
          <Card className="h-full transition-shadow hover:shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Avatar className="h-14 w-14">
                  {c.avatarUrl && (
                    <AvatarImage src={c.avatarUrl} alt={c.nome} />
                  )}
                  <AvatarFallback>{getInitials(c.nome)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <h4 className="truncate font-semibold">{c.nome}</h4>
                  <p className="truncate text-xs text-muted-foreground">
                    {c.cargo}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    <Badge
                      variant="outline"
                      className="text-[10px] font-normal"
                    >
                      {c.departamento}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-[10px] font-normal',
                        statusBadgeStyles[c.status].cls
                      )}
                    >
                      {statusBadgeStyles[c.status].label}
                    </Badge>
                  </div>
                </div>
              </div>
              <Separator className="my-3" />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Briefcase className="h-3 w-3" />
                  {c.contratoTipo}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {tempoDeCasa(c.dataAdmissao)}
                </span>
              </div>
              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 flex-1 text-xs"
                  onClick={() => onPerfil(c.id)}
                >
                  Ver perfil
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 px-2"
                  onClick={() => toast.info('Mensagem enviada (mock)')}
                  aria-label="Mensagem"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}

/* ================================================================== */
/* ORGANOGRAMA VIEW                                                     */
/* ================================================================== */

function OrganogramaView({ items }: { items: Colaborador[] }): JSX.Element {
  const grupos = useMemo(() => {
    const map = new Map<string, Colaborador[]>();
    items.forEach((c) => {
      const arr = map.get(c.departamento) ?? [];
      arr.push(c);
      map.set(c.departamento, arr);
    });
    return Array.from(map.entries()).sort((a, b) =>
      a[0].localeCompare(b[0], 'pt-BR')
    );
  }, [items]);

  return (
    <div className="overflow-x-auto rounded-xl border bg-card p-4">
      <div className="flex min-w-max gap-4">
        {grupos.map(([depto, cols], i) => (
          <motion.div
            key={depto}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: i * 0.05 }}
            className="flex min-w-[240px] flex-col gap-2 rounded-lg border bg-background/50 p-3"
          >
            <div className="flex items-center justify-between border-b pb-2">
              <h4 className="text-sm font-semibold">{depto}</h4>
              <Badge variant="outline" className="text-[10px]">
                {cols.length}
              </Badge>
            </div>
            <div className="space-y-1.5">
              {cols.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-2 rounded-md border bg-card p-1.5 transition-shadow hover:shadow-sm"
                >
                  <Avatar className="h-7 w-7">
                    {c.avatarUrl && (
                      <AvatarImage src={c.avatarUrl} alt={c.nome} />
                    )}
                    <AvatarFallback className="text-[10px]">
                      {getInitials(c.nome)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-medium">{c.nome}</div>
                    <div className="truncate text-[10px] text-muted-foreground">
                      {c.cargo}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ================================================================== */
/* BULK BAR                                                             */
/* ================================================================== */

interface BulkBarProps {
  count: number;
  onClear: () => void;
  onDesligar: () => void;
  onExport: () => void;
}

function BulkBar({
  count,
  onClear,
  onDesligar,
  onExport,
}: BulkBarProps): JSX.Element {
  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 80, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2"
    >
      <div className="flex items-center gap-2 rounded-full border bg-card px-3 py-2 shadow-2xl">
        <Badge className="bg-primary text-primary-foreground">{count}</Badge>
        <span className="text-sm">selecionados</span>
        <Separator orientation="vertical" className="mx-1 h-5" />
        <Button
          size="sm"
          variant="ghost"
          className="h-7 gap-1 text-xs"
          onClick={() => toast.info('Mensagens enviadas (mock)')}
        >
          <Send className="h-3.5 w-3.5" />
          Mensagem
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 gap-1 text-xs"
          onClick={() => toast.info('Depto alterado (mock)')}
        >
          <UserCog className="h-3.5 w-3.5" />
          Alterar depto
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 gap-1 text-xs"
          onClick={() => toast.info('Promovidos (mock)')}
        >
          <TrendingUp className="h-3.5 w-3.5" />
          Promover
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 gap-1 text-xs text-rose-500 hover:text-rose-500"
          onClick={onDesligar}
        >
          <UserMinus className="h-3.5 w-3.5" />
          Desligar
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 gap-1 text-xs"
          onClick={onExport}
        >
          <Download className="h-3.5 w-3.5" />
          Exportar
        </Button>
        <Separator orientation="vertical" className="mx-1 h-5" />
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          onClick={onClear}
          aria-label="Limpar seleção"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  );
}

/* ================================================================== */
/* PERFIL SHEET                                                         */
/* ================================================================== */

interface PerfilSheetProps {
  colaborador: Colaborador | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function PerfilSheet({
  colaborador,
  open,
  onOpenChange,
}: PerfilSheetProps): JSX.Element {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto sm:max-w-2xl"
      >
        {colaborador ? (
          <>
            <SheetHeader className="pb-4">
              <div className="flex items-start gap-4">
                <Avatar className="h-16 w-16">
                  {colaborador.avatarUrl && (
                    <AvatarImage
                      src={colaborador.avatarUrl}
                      alt={colaborador.nome}
                    />
                  )}
                  <AvatarFallback className="text-lg">
                    {getInitials(colaborador.nome)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <SheetTitle className="text-xl">
                    {colaborador.nome}
                  </SheetTitle>
                  <SheetDescription>{colaborador.cargo}</SheetDescription>
                  <div className="mt-2 flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={cn(
                        'font-normal',
                        statusBadgeStyles[colaborador.status].cls
                      )}
                    >
                      {statusBadgeStyles[colaborador.status].label}
                    </Badge>
                    <Badge variant="outline">{colaborador.departamento}</Badge>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Button size="sm" variant="outline" className="gap-1.5">
                    <Edit3 className="h-3.5 w-3.5" />
                    Editar
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1.5">
                    <MessageSquare className="h-3.5 w-3.5" />
                    Mensagem
                  </Button>
                </div>
              </div>
            </SheetHeader>

            <Tabs defaultValue="visao" className="mt-2">
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="visao">Visão</TabsTrigger>
                <TabsTrigger value="docs">Docs</TabsTrigger>
                <TabsTrigger value="hist">Histórico</TabsTrigger>
                <TabsTrigger value="ponto">Ponto</TabsTrigger>
                <TabsTrigger value="ferias">Férias</TabsTrigger>
                <TabsTrigger value="aval">Avaliações</TabsTrigger>
              </TabsList>

              <TabsContent value="visao" className="mt-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Card>
                    <CardContent className="space-y-2 p-4">
                      <h5 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Dados pessoais
                      </h5>
                      <InfoRow label="CPF" value={colaborador.cpfMask} />
                      <InfoRow
                        label="Nascimento"
                        value={formatDatePtBR(colaborador.dataNascimento)}
                      />
                      <InfoRow label="Gênero" value={colaborador.genero} />
                      <InfoRow
                        label={
                          <span className="inline-flex items-center gap-1">
                            <Mail className="h-3 w-3" /> E-mail
                          </span>
                        }
                        value={colaborador.email}
                      />
                      <InfoRow
                        label={
                          <span className="inline-flex items-center gap-1">
                            <Phone className="h-3 w-3" /> Telefone
                          </span>
                        }
                        value={colaborador.telefone}
                      />
                      <InfoRow
                        label={
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> Endereço
                          </span>
                        }
                        value={colaborador.endereco}
                      />
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="space-y-2 p-4">
                      <h5 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Dados profissionais
                      </h5>
                      <InfoRow
                        label="Departamento"
                        value={colaborador.departamento}
                      />
                      <InfoRow label="Cargo" value={colaborador.cargo} />
                      <InfoRow
                        label="Contrato"
                        value={colaborador.contratoTipo}
                      />
                      <InfoRow
                        label="Admissão"
                        value={`${formatDatePtBR(colaborador.dataAdmissao)} (${tempoDeCasa(colaborador.dataAdmissao)})`}
                      />
                      <InfoRow
                        label="Salário"
                        value={brl.format(colaborador.salario)}
                      />
                      <InfoRow
                        label="Gestor"
                        value={colaborador.gestorId ?? '—'}
                      />
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="docs" className="mt-4">
                <DocsTab />
              </TabsContent>

              <TabsContent value="hist" className="mt-4">
                <HistoricoTab nome={colaborador.nome} />
              </TabsContent>

              <TabsContent value="ponto" className="mt-4">
                <PlaceholderTab
                  title="Controle de ponto"
                  desc="Consulte os registros detalhados na seção Ponto do Portal RH."
                />
              </TabsContent>

              <TabsContent value="ferias" className="mt-4">
                <PlaceholderTab
                  title="Férias"
                  desc="Solicitações e saldo aparecem na seção Férias."
                />
              </TabsContent>

              <TabsContent value="aval" className="mt-4">
                <PlaceholderTab
                  title="Avaliações"
                  desc="Avaliações de desempenho na seção Avaliações."
                />
              </TabsContent>
            </Tabs>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: ReactNode;
  value: ReactNode;
}): JSX.Element {
  return (
    <div className="flex items-start justify-between gap-3 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

function DocsTab(): JSX.Element {
  const docs = [
    { nome: 'RG', status: 'ok' },
    { nome: 'CPF', status: 'ok' },
    { nome: 'CTPS', status: 'ok' },
    { nome: 'Comprovante de residência', status: 'pendente' },
  ];
  return (
    <div className="space-y-2">
      {docs.map((d) => (
        <div
          key={d.nome}
          className="flex items-center justify-between rounded-lg border bg-card p-3"
        >
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{d.nome}</span>
            {d.status === 'pendente' && (
              <Badge
                variant="outline"
                className="border-amber-500/30 bg-amber-500/15 text-[10px] text-amber-600"
              >
                Pendente
              </Badge>
            )}
          </div>
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs">
              <Upload className="h-3 w-3" />
            </Button>
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs">
              Ver
            </Button>
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs">
              Baixar
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function HistoricoTab({ nome }: { nome: string }): JSX.Element {
  const eventos = [
    {
      data: '2022-03-15',
      titulo: 'Admissão',
      desc: `${nome} ingressou na empresa.`,
      cor: 'bg-emerald-500',
    },
    {
      data: '2023-02-01',
      titulo: 'Aumento salarial',
      desc: 'Reajuste anual de 8%.',
      cor: 'bg-sky-500',
    },
    {
      data: '2024-06-10',
      titulo: 'Promoção',
      desc: 'Promovido para nível sênior.',
      cor: 'bg-purple-500',
    },
    {
      data: '2025-08-22',
      titulo: 'Mudança de departamento',
      desc: 'Transferido para novo time.',
      cor: 'bg-amber-500',
    },
  ];
  return (
    <div className="relative space-y-3 pl-6">
      <div className="absolute bottom-2 left-[11px] top-2 w-px bg-border" />
      {eventos.map((e) => (
        <div key={e.data} className="relative">
          <span
            className={cn(
              'absolute -left-[19px] top-2 h-3 w-3 rounded-full ring-4 ring-background',
              e.cor
            )}
          />
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <h6 className="text-sm font-semibold">{e.titulo}</h6>
                <span className="text-[11px] text-muted-foreground">
                  {formatDatePtBR(e.data)}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">{e.desc}</p>
            </CardContent>
          </Card>
        </div>
      ))}
    </div>
  );
}

function PlaceholderTab({
  title,
  desc,
}: {
  title: string;
  desc: string;
}): JSX.Element {
  return (
    <Card>
      <CardContent className="p-6 text-center">
        <Sparkles className="mx-auto h-8 w-8 text-muted-foreground/40" />
        <h5 className="mt-2 font-semibold">{title}</h5>
        <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
      </CardContent>
    </Card>
  );
}

/* ================================================================== */
/* NOVO COLABORADOR SHEET (3 steps)                                     */
/* ================================================================== */

interface NovoColaboradorSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  departamentos: Departamento[];
  onSubmit: (data: Omit<Colaborador, 'id'>) => void;
  submitting: boolean;
}

interface NovoFormState {
  nome: string;
  email: string;
  cpfMask: string;
  telefone: string;
  endereco: string;
  dataNascimento: string;
  genero: Genero;
  cargo: string;
  departamento: string;
  contratoTipo: ContratoTipo;
  dataAdmissao: string;
  salario: string;
}

const initialForm: NovoFormState = {
  nome: '',
  email: '',
  cpfMask: '',
  telefone: '',
  endereco: '',
  dataNascimento: '',
  genero: 'nao_informado',
  cargo: '',
  departamento: '',
  contratoTipo: 'CLT',
  dataAdmissao: '',
  salario: '',
};

function NovoColaboradorSheet({
  open,
  onOpenChange,
  departamentos,
  onSubmit,
  submitting,
}: NovoColaboradorSheetProps): JSX.Element {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [form, setForm] = useState<NovoFormState>(initialForm);

  // Reset do wizard ao fechar o Sheet — reset legítimo.
  // Reset do wizard ao fechar o Sheet — reset legítimo.
  useEffect(() => {
    if (!open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStep(1);
      setForm(initialForm);
    }
  }, [open]);

  const setField = <K extends keyof NovoFormState>(k: K, v: NovoFormState[K]) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const step1Valid =
    !!form.nome && !!form.email && !!form.cpfMask && !!form.dataNascimento;
  const step2Valid =
    !!form.cargo &&
    !!form.departamento &&
    !!form.dataAdmissao &&
    !!form.salario;

  const handleSubmit = () => {
    const salarioNum = Number(form.salario);
    if (Number.isNaN(salarioNum) || salarioNum <= 0) {
      toast.error('Salário inválido');
      return;
    }
    onSubmit({
      nome: form.nome.trim(),
      email: form.email.trim(),
      cpfMask: form.cpfMask,
      telefone: form.telefone,
      endereco: form.endereco,
      dataNascimento: form.dataNascimento,
      genero: form.genero,
      cargo: form.cargo.trim(),
      departamento: form.departamento,
      contratoTipo: form.contratoTipo,
      dataAdmissao: form.dataAdmissao,
      salario: salarioNum,
      status: 'ativo',
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Novo colaborador
          </SheetTitle>
          <SheetDescription>
            Etapa {step} de 3 —{' '}
            {step === 1
              ? 'Dados pessoais'
              : step === 2
                ? 'Contrato'
                : 'Revisão'}
          </SheetDescription>
        </SheetHeader>

        <Progress value={(step / 3) * 100} className="mt-4" />

        <div className="mt-5 space-y-4">
          {step === 1 && (
            <div className="space-y-3">
              <Field label="Nome completo" required>
                <Input
                  value={form.nome}
                  onChange={(e) => setField('nome', e.target.value)}
                  placeholder="Ex: Maria Silva"
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="E-mail" required>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setField('email', e.target.value)}
                    placeholder="email@empresa.com"
                  />
                </Field>
                <Field label="CPF" required>
                  <Input
                    value={form.cpfMask}
                    onChange={(e) => setField('cpfMask', e.target.value)}
                    placeholder="000.000.000-00"
                  />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Telefone">
                  <Input
                    value={form.telefone}
                    onChange={(e) => setField('telefone', e.target.value)}
                    placeholder="(11) 99999-0000"
                  />
                </Field>
                <Field label="Nascimento" required>
                  <Input
                    type="date"
                    value={form.dataNascimento}
                    onChange={(e) => setField('dataNascimento', e.target.value)}
                  />
                </Field>
              </div>
              <Field label="Endereço">
                <Textarea
                  value={form.endereco}
                  onChange={(e) => setField('endereco', e.target.value)}
                  placeholder="Rua, número, cidade, UF"
                  rows={2}
                />
              </Field>
              <Field label="Gênero">
                <Select
                  value={form.genero}
                  onValueChange={(v) => setField('genero', v as Genero)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="masculino">Masculino</SelectItem>
                    <SelectItem value="feminino">Feminino</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                    <SelectItem value="nao_informado">Não informado</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <Field label="Cargo" required>
                <Input
                  value={form.cargo}
                  onChange={(e) => setField('cargo', e.target.value)}
                  placeholder="Ex: Desenvolvedor Pleno"
                />
              </Field>
              <Field label="Departamento" required>
                <Select
                  value={form.departamento}
                  onValueChange={(v) => setField('departamento', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {departamentos.map((d) => (
                      <SelectItem key={d.id} value={d.nome}>
                        {d.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Tipo de contrato" required>
                  <Select
                    value={form.contratoTipo}
                    onValueChange={(v) =>
                      setField('contratoTipo', v as ContratoTipo)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CLT">CLT</SelectItem>
                      <SelectItem value="PJ">PJ</SelectItem>
                      <SelectItem value="Estagio">Estágio</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Data de admissão" required>
                  <Input
                    type="date"
                    value={form.dataAdmissao}
                    onChange={(e) => setField('dataAdmissao', e.target.value)}
                  />
                </Field>
              </div>
              <Field label="Salário (R$)" required>
                <Input
                  type="number"
                  value={form.salario}
                  onChange={(e) => setField('salario', e.target.value)}
                  placeholder="0"
                  min={0}
                />
              </Field>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <Card>
                <CardContent className="space-y-2 p-4">
                  <h5 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Resumo
                  </h5>
                  <InfoRow label="Nome" value={form.nome || '—'} />
                  <InfoRow label="E-mail" value={form.email || '—'} />
                  <InfoRow label="CPF" value={form.cpfMask || '—'} />
                  <InfoRow label="Cargo" value={form.cargo || '—'} />
                  <InfoRow
                    label="Departamento"
                    value={form.departamento || '—'}
                  />
                  <InfoRow label="Contrato" value={form.contratoTipo} />
                  <InfoRow
                    label="Admissão"
                    value={
                      form.dataAdmissao
                        ? formatDatePtBR(form.dataAdmissao)
                        : '—'
                    }
                  />
                  <InfoRow
                    label="Salário"
                    value={
                      form.salario ? brl.format(Number(form.salario)) : '—'
                    }
                  />
                </CardContent>
              </Card>
              <p className="text-xs text-muted-foreground">
                Confirme os dados antes de salvar. Você poderá editar depois.
              </p>
            </div>
          )}
        </div>

        <div className="mt-6 flex items-center justify-between gap-2 border-t pt-4">
          <Button
            variant="ghost"
            onClick={() =>
              step === 1
                ? onOpenChange(false)
                : setStep((s) => (s - 1) as 1 | 2 | 3)
            }
            disabled={submitting}
          >
            {step === 1 ? 'Cancelar' : 'Voltar'}
          </Button>
          {step < 3 ? (
            <Button
              onClick={() => setStep((s) => (s + 1) as 1 | 2 | 3)}
              disabled={
                (step === 1 && !step1Valid) || (step === 2 && !step2Valid)
              }
            >
              Avançar
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Salvando...' : 'Criar colaborador'}
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}): JSX.Element {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">
        {label}
        {required && <span className="ml-0.5 text-rose-500">*</span>}
      </Label>
      {children}
    </div>
  );
}
