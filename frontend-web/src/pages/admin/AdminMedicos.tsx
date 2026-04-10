import { useMemo, useState } from 'react';
import {
  QueryClient,
  QueryClientProvider,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  Search,
  Eye,
  CheckCircle,
  XCircle,
  Copy,
  MoreHorizontal,
  Users,
  Clock,
  ShieldCheck,
  ShieldX,
  Download,
  LayoutGrid,
  Rows3,
  Filter,
  X,
  FileSpreadsheet,
  FileText,
} from 'lucide-react';

import { AdminLayout } from '@/components/admin/AdminLayout';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { DoctorDetailDialog } from '@/components/admin/DoctorDetailDialog';
import { RejectReasonDialog } from '@/components/admin/RejectReasonDialog';
import { AiInsightsPanel } from '@/components/admin/ai/AiInsightsPanel';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Pagination } from '@/components/ui/pagination';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

import { ApiDoctor, DoctorStatus } from '@/types/doctor';
import { approveDoctor, getDoctors, rejectDoctor } from '@/services/adminApi';

const PAGE_SIZE = 12;

type StatusFilter = 'all' | DoctorStatus;
type SortOrder = 'recent' | 'name_asc' | 'name_desc';
type ViewMode = 'table' | 'grid';

interface DoctorsResponse {
  items: ApiDoctor[];
  totalCount: number;
}

/* ----------------------------- helpers ----------------------------- */

const UF_OPTIONS: string[] = ['all', 'SP', 'RJ', 'MG', 'BA', 'RS'];
const SPECIALTY_OPTIONS: string[] = [
  'all',
  'Clínica Geral',
  'Cardiologia',
  'Pediatria',
  'Dermatologia',
  'Ortopedia',
];

const getInitials = (name: string): string =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? '')
    .join('');

const normalize = (value: string): string =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const compareName = (a: ApiDoctor, b: ApiDoctor): number =>
  normalize(a.name).localeCompare(normalize(b.name));

/* ----------------------------- KPI card ----------------------------- */

interface KpiCardProps {
  label: string;
  value: number;
  icon: React.ElementType;
  tone: 'primary' | 'warning' | 'success' | 'destructive';
  active: boolean;
  pulse?: boolean;
  onClick: () => void;
  index: number;
}

const toneClasses: Record<KpiCardProps['tone'], string> = {
  primary: 'text-primary bg-primary/10',
  warning: 'text-warning bg-warning/10',
  success: 'text-success bg-success/10',
  destructive: 'text-destructive bg-destructive/10',
};

const KpiCard = ({
  label,
  value,
  icon: Icon,
  tone,
  active,
  pulse,
  onClick,
  index,
}: KpiCardProps) => (
  <motion.button
    type="button"
    onClick={onClick}
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.06, duration: 0.3, ease: 'easeOut' }}
    whileHover={{ y: -2 }}
    className={`group relative flex items-center justify-between gap-3 rounded-xl border bg-card p-4 text-left shadow-sm transition-colors ${
      active
        ? 'border-primary ring-2 ring-primary/20'
        : 'border-border hover:border-primary/40'
    }`}
    aria-pressed={active}
  >
    <div className="min-w-0">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
    </div>
    <div
      className={`relative flex h-11 w-11 items-center justify-center rounded-lg ${toneClasses[tone]}`}
    >
      <Icon className="h-5 w-5" aria-hidden />
      {pulse && value > 0 && (
        <span className="absolute inline-flex h-full w-full animate-ping rounded-lg bg-warning/30" />
      )}
    </div>
  </motion.button>
);

/* ----------------------------- page ----------------------------- */

const AdminMedicosInner = () => {
  const qc = useQueryClient();

  // filters
  const [page, setPage] = useState<number>(1);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');
  const [search, setSearch] = useState<string>('');
  const [uf, setUf] = useState<string>('all');
  const [specialty, setSpecialty] = useState<string>('all');
  const [sort, setSort] = useState<SortOrder>('recent');
  const [view, setView] = useState<ViewMode>('table');

  // selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // dialogs
  const [detailDoctor, setDetailDoctor] = useState<ApiDoctor | null>(null);
  const [detailOpen, setDetailOpen] = useState<boolean>(false);
  const [rejectTarget, setRejectTarget] = useState<ApiDoctor | null>(null);
  const [rejectOpen, setRejectOpen] = useState<boolean>(false);

  /* ---------- data ---------- */

  const query = useQuery<DoctorsResponse>({
    queryKey: ['admin', 'doctors', { status: statusFilter, page }],
    queryFn: async () => {
      const data = await getDoctors({
        status: statusFilter === 'all' ? undefined : statusFilter,
        page,
        pageSize: PAGE_SIZE,
      });
      if (data && typeof data === 'object' && 'items' in data) {
        return {
          items: (data as DoctorsResponse).items ?? [],
          totalCount: (data as DoctorsResponse).totalCount ?? 0,
        };
      }
      const arr = Array.isArray(data) ? (data as ApiDoctor[]) : [];
      return { items: arr, totalCount: arr.length };
    },
    placeholderData: (prev) => prev,
  });

  // KPI counts — load all statuses separately for accurate totals
  const kpiQuery = useQuery<{
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  }>({
    queryKey: ['admin', 'doctors', 'kpi'],
    queryFn: async () => {
      const [pending, approved, rejected] = await Promise.all([
        getDoctors({ status: 'pending', page: 1, pageSize: 1 }),
        getDoctors({ status: 'approved', page: 1, pageSize: 1 }),
        getDoctors({ status: 'rejected', page: 1, pageSize: 1 }),
      ]);
      const count = (r: unknown): number => {
        if (r && typeof r === 'object' && 'totalCount' in r) {
          const n = (r as { totalCount?: number }).totalCount;
          return typeof n === 'number' ? n : 0;
        }
        return Array.isArray(r) ? r.length : 0;
      };
      const p = count(pending);
      const a = count(approved);
      const rj = count(rejected);
      return { total: p + a + rj, pending: p, approved: a, rejected: rj };
    },
    staleTime: 30_000,
  });

  const doctors = useMemo<ApiDoctor[]>(
    () => query.data?.items ?? [],
    [query.data]
  );
  const totalCount: number = query.data?.totalCount ?? 0;
  const loading = query.isLoading;

  /* ---------- mutations ---------- */

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['admin', 'doctors'] });
  };

  const approveMutation = useMutation({
    mutationFn: (id: string) => approveDoctor(id),
    onSuccess: () => {
      toast.success('Médico aprovado com sucesso!');
      invalidate();
    },
    onError: () => {
      toast.error('Erro ao aprovar médico.');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      rejectDoctor(id, reason),
    onSuccess: () => {
      toast.success('Médico recusado.');
      invalidate();
    },
    onError: () => {
      toast.error('Erro ao recusar médico.');
    },
  });

  /* ---------- filtering (client-side over current page) ---------- */

  const visibleDoctors = useMemo<ApiDoctor[]>(() => {
    let list = [...doctors];
    if (search.trim()) {
      const term = normalize(search.trim());
      list = list.filter(
        (d) =>
          normalize(d.name).includes(term) ||
          d.crm.toLowerCase().includes(term) ||
          (d.email ?? '').toLowerCase().includes(term)
      );
    }
    if (uf !== 'all') {
      list = list.filter((d) => d.crmState === uf || d.state === uf);
    }
    if (specialty !== 'all') {
      list = list.filter((d) => d.specialty === specialty);
    }
    if (sort === 'name_asc') list.sort(compareName);
    else if (sort === 'name_desc') list.sort((a, b) => compareName(b, a));
    // 'recent' keeps server order
    return list;
  }, [doctors, search, uf, specialty, sort]);

  const allVisibleSelected =
    visibleDoctors.length > 0 &&
    visibleDoctors.every((d) => selectedIds.has(d.id));

  const hasActiveFilters =
    search !== '' ||
    uf !== 'all' ||
    specialty !== 'all' ||
    sort !== 'recent' ||
    statusFilter !== 'pending';

  const clearFilters = () => {
    setSearch('');
    setUf('all');
    setSpecialty('all');
    setSort('recent');
    setStatusFilter('pending');
    setPage(1);
  };

  /* ---------- selection ---------- */

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelectedIds((prev) => {
      if (allVisibleSelected) {
        const next = new Set(prev);
        visibleDoctors.forEach((d) => next.delete(d.id));
        return next;
      }
      const next = new Set(prev);
      visibleDoctors.forEach((d) => next.add(d.id));
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  /* ---------- bulk actions ---------- */

  const runBulk = async (
    action: 'approve' | 'reject',
    reason?: string
  ): Promise<void> => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    const verb = action === 'approve' ? 'Aprovando' : 'Recusando';
    const toastId = toast.loading(`${verb} 0/${ids.length}...`);
    let done = 0;
    let failed = 0;
    for (const id of ids) {
      try {
        if (action === 'approve') await approveDoctor(id);
        else await rejectDoctor(id, reason ?? '');
        done += 1;
      } catch {
        failed += 1;
      }
      toast.loading(`${verb} ${done + failed}/${ids.length}...`, {
        id: toastId,
      });
    }
    if (failed === 0) {
      toast.success(`${done} médico(s) processado(s).`, { id: toastId });
    } else {
      toast.error(`${done} concluído(s), ${failed} com erro.`, {
        id: toastId,
      });
    }
    clearSelection();
    invalidate();
  };

  /* ---------- handlers ---------- */

  const openDetail = (doctor: ApiDoctor) => {
    setDetailDoctor(doctor);
    setDetailOpen(true);
  };

  const openReject = (doctor: ApiDoctor) => {
    setRejectTarget(doctor);
    setRejectOpen(true);
  };

  const handleRejectConfirm = (reason: string) => {
    if (!rejectTarget) return;
    rejectMutation.mutate(
      { id: rejectTarget.id, reason },
      {
        onSettled: () => {
          setRejectOpen(false);
          setDetailOpen(false);
          setRejectTarget(null);
        },
      }
    );
  };

  const handleCopyEmail = (email: string) => {
    void navigator.clipboard
      .writeText(email)
      .then(() => toast.success('E-mail copiado.'))
      .catch(() => toast.error('Não foi possível copiar.'));
  };

  const handleStatusKpiClick = (next: StatusFilter) => {
    setStatusFilter(next);
    setPage(1);
    clearSelection();
  };

  const handleExport = (format: 'csv' | 'xlsx') => {
    toast.info(
      `Exportação ${format.toUpperCase()} será disponibilizada em breve.`
    );
  };

  const subtitle = 'Gestão e aprovação de cadastros médicos';

  const kpi = kpiQuery.data ?? {
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  };

  /* ----------------------------- render ----------------------------- */

  return (
    <AdminLayout>
      <div className="relative">
        <div className="space-y-6 xl:pr-80">
          {/* Header */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Médicos</h1>
              <p className="text-muted-foreground">{subtitle}</p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="gap-2">
                  <Download className="h-4 w-4" aria-hidden />
                  Exportar lista
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => handleExport('csv')}>
                  <FileText className="mr-2 h-4 w-4" aria-hidden />
                  Exportar CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('xlsx')}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" aria-hidden />
                  Exportar Excel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* KPI strip */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <KpiCard
              index={0}
              label="Total"
              value={kpi.total}
              icon={Users}
              tone="primary"
              active={statusFilter === 'all'}
              onClick={() => handleStatusKpiClick('all')}
            />
            <KpiCard
              index={1}
              label="Pendentes"
              value={kpi.pending}
              icon={Clock}
              tone="warning"
              pulse
              active={statusFilter === 'pending'}
              onClick={() => handleStatusKpiClick('pending')}
            />
            <KpiCard
              index={2}
              label="Aprovados"
              value={kpi.approved}
              icon={ShieldCheck}
              tone="success"
              active={statusFilter === 'approved'}
              onClick={() => handleStatusKpiClick('approved')}
            />
            <KpiCard
              index={3}
              label="Recusados"
              value={kpi.rejected}
              icon={ShieldX}
              tone="destructive"
              active={statusFilter === 'rejected'}
              onClick={() => handleStatusKpiClick('rejected')}
            />
          </div>

          {/* Filter bar */}
          <div className="sticky top-16 z-20 rounded-xl border bg-background/95 p-3 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/75">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="relative min-w-0 flex-1">
                <Search
                  className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por nome, CRM ou e-mail..."
                  className="pl-9"
                  aria-label="Buscar médicos"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Select
                  value={statusFilter}
                  onValueChange={(v) => {
                    setStatusFilter(v as StatusFilter);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="pending">Pendentes</SelectItem>
                    <SelectItem value="approved">Aprovados</SelectItem>
                    <SelectItem value="rejected">Recusados</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={uf} onValueChange={setUf}>
                  <SelectTrigger className="w-28">
                    <SelectValue placeholder="UF" />
                  </SelectTrigger>
                  <SelectContent>
                    {UF_OPTIONS.map((u) => (
                      <SelectItem key={u} value={u}>
                        {u === 'all' ? 'Todas UFs' : u}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={specialty} onValueChange={setSpecialty}>
                  <SelectTrigger className="w-44">
                    <SelectValue placeholder="Especialidade" />
                  </SelectTrigger>
                  <SelectContent>
                    {SPECIALTY_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s === 'all' ? 'Todas especialidades' : s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={sort}
                  onValueChange={(v) => setSort(v as SortOrder)}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recent">Mais recentes</SelectItem>
                    <SelectItem value="name_asc">Nome A-Z</SelectItem>
                    <SelectItem value="name_desc">Nome Z-A</SelectItem>
                  </SelectContent>
                </Select>

                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="gap-1 text-muted-foreground"
                  >
                    <Filter className="h-4 w-4" aria-hidden />
                    Limpar
                  </Button>
                )}

                <Separator orientation="vertical" className="h-6" />

                <div className="flex rounded-md border p-0.5">
                  <button
                    type="button"
                    onClick={() => setView('table')}
                    aria-label="Visualização em tabela"
                    aria-pressed={view === 'table'}
                    className={`flex h-7 w-7 items-center justify-center rounded-sm transition-colors ${
                      view === 'table'
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    <Rows3 className="h-4 w-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => setView('grid')}
                    aria-label="Visualização em grid"
                    aria-pressed={view === 'grid'}
                    className={`flex h-7 w-7 items-center justify-center rounded-sm transition-colors ${
                      view === 'grid'
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    <LayoutGrid className="h-4 w-4" aria-hidden />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Bulk actions */}
          <AnimatePresence>
            {selectedIds.size > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/5 p-3"
              >
                <p className="text-sm font-medium">
                  {selectedIds.size} selecionado
                  {selectedIds.size > 1 ? 's' : ''}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    className="bg-success text-success-foreground hover:bg-success/90"
                    onClick={() => runBulk('approve')}
                  >
                    <CheckCircle className="mr-1 h-4 w-4" aria-hidden />
                    Aprovar todos
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => runBulk('reject')}
                  >
                    <XCircle className="mr-1 h-4 w-4" aria-hidden />
                    Recusar todos
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleExport('csv')}
                  >
                    <Download className="mr-1 h-4 w-4" aria-hidden />
                    Exportar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={clearSelection}>
                    <X className="mr-1 h-4 w-4" aria-hidden />
                    Cancelar
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Content */}
          <Card className="shadow-sm">
            <CardContent className="p-0">
              {view === 'table' ? (
                <TableView
                  loading={loading}
                  doctors={visibleDoctors}
                  selectedIds={selectedIds}
                  allSelected={allVisibleSelected}
                  onToggleAll={toggleAll}
                  onToggleOne={toggleOne}
                  onOpenDetail={openDetail}
                  onApprove={(d) => approveMutation.mutate(d.id)}
                  onReject={openReject}
                  onCopyEmail={handleCopyEmail}
                />
              ) : (
                <GridView
                  loading={loading}
                  doctors={visibleDoctors}
                  onOpenDetail={openDetail}
                  onApprove={(d) => approveMutation.mutate(d.id)}
                  onReject={openReject}
                />
              )}

              <div className="px-4 pb-4">
                <Pagination
                  page={page}
                  pageSize={PAGE_SIZE}
                  totalCount={totalCount}
                  onPageChange={(p) => {
                    setPage(p);
                    clearSelection();
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Floating AI panel */}
        <aside className="pointer-events-none fixed right-6 top-24 hidden w-72 xl:block">
          <div className="pointer-events-auto">
            <AiInsightsPanel scope="admin" maxItems={3} compact />
          </div>
        </aside>
      </div>

      {/* Detail dialog */}
      <DoctorDetailDialog
        doctor={detailDoctor}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onApprove={(id) => approveMutation.mutate(id)}
        onReject={(id) => {
          const doc = doctors.find((d) => d.id === id);
          if (doc) openReject(doc);
        }}
      />

      {/* Reject dialog */}
      {rejectTarget && (
        <RejectReasonDialog
          open={rejectOpen}
          onOpenChange={setRejectOpen}
          onConfirm={handleRejectConfirm}
          doctorName={rejectTarget.name}
        />
      )}
    </AdminLayout>
  );
};

/* ----------------------------- Table view ----------------------------- */

interface TableViewProps {
  loading: boolean;
  doctors: ApiDoctor[];
  selectedIds: Set<string>;
  allSelected: boolean;
  onToggleAll: () => void;
  onToggleOne: (id: string) => void;
  onOpenDetail: (d: ApiDoctor) => void;
  onApprove: (d: ApiDoctor) => void;
  onReject: (d: ApiDoctor) => void;
  onCopyEmail: (email: string) => void;
}

const TableView = ({
  loading,
  doctors,
  selectedIds,
  allSelected,
  onToggleAll,
  onToggleOne,
  onOpenDetail,
  onApprove,
  onReject,
  onCopyEmail,
}: TableViewProps) => {
  if (loading) {
    return (
      <div className="p-4">
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-md border p-3"
            >
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-1/3" />
                <Skeleton className="h-3 w-1/4" />
              </div>
              <Skeleton className="h-6 w-20" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (doctors.length === 0) {
    return <EmptyState />;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={onToggleAll}
              aria-label="Selecionar todos"
              className="h-4 w-4 cursor-pointer rounded border-border accent-primary"
            />
          </TableHead>
          <TableHead>Médico</TableHead>
          <TableHead className="hidden md:table-cell">E-mail</TableHead>
          <TableHead className="hidden lg:table-cell">UF</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="hidden md:table-cell">Cadastro</TableHead>
          <TableHead className="text-right">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {doctors.map((doctor, i) => {
          const checked = selectedIds.has(doctor.id);
          return (
            <motion.tr
              key={doctor.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.02, 0.2), duration: 0.2 }}
              className="border-b transition-all hover:bg-muted/50 hover:shadow-sm data-[state=selected]:bg-muted"
              data-state={checked ? 'selected' : undefined}
            >
              <TableCell>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggleOne(doctor.id)}
                  aria-label={`Selecionar ${doctor.name}`}
                  className="h-4 w-4 cursor-pointer rounded border-border accent-primary"
                />
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    {doctor.avatarUrl && (
                      <AvatarImage src={doctor.avatarUrl} alt={doctor.name} />
                    )}
                    <AvatarFallback>{getInitials(doctor.name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{doctor.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      CRM {doctor.crm}/{doctor.crmState}
                    </p>
                  </div>
                </div>
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <span className="truncate text-sm text-muted-foreground">
                  {doctor.email}
                </span>
              </TableCell>
              <TableCell className="hidden lg:table-cell">
                <Badge variant="outline">{doctor.crmState}</Badge>
              </TableCell>
              <TableCell>
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  <StatusBadge status={doctor.approvalStatus} />
                </motion.div>
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <span className="text-xs text-muted-foreground">—</span>
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Ações de ${doctor.name}`}
                    >
                      <MoreHorizontal className="h-4 w-4" aria-hidden />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => onOpenDetail(doctor)}>
                      <Eye className="mr-2 h-4 w-4" aria-hidden />
                      Ver detalhes
                    </DropdownMenuItem>
                    {doctor.approvalStatus === 'pending' && (
                      <>
                        <DropdownMenuItem onClick={() => onApprove(doctor)}>
                          <CheckCircle
                            className="mr-2 h-4 w-4 text-success"
                            aria-hidden
                          />
                          Aprovar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onReject(doctor)}>
                          <XCircle
                            className="mr-2 h-4 w-4 text-destructive"
                            aria-hidden
                          />
                          Recusar
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onCopyEmail(doctor.email)}>
                      <Copy className="mr-2 h-4 w-4" aria-hidden />
                      Copiar e-mail
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </motion.tr>
          );
        })}
      </TableBody>
    </Table>
  );
};

/* ----------------------------- Grid view ----------------------------- */

interface GridViewProps {
  loading: boolean;
  doctors: ApiDoctor[];
  onOpenDetail: (d: ApiDoctor) => void;
  onApprove: (d: ApiDoctor) => void;
  onReject: (d: ApiDoctor) => void;
}

const GridView = ({
  loading,
  doctors,
  onOpenDetail,
  onApprove,
  onReject,
}: GridViewProps) => {
  if (loading) {
    return (
      <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl border p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-14 w-14 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
            <Skeleton className="mt-4 h-3 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (doctors.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
      {doctors.map((doctor, i) => (
        <motion.div
          key={doctor.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: Math.min(i * 0.03, 0.2), duration: 0.25 }}
          className="group relative flex flex-col overflow-hidden rounded-xl border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg"
        >
          <div className="flex items-start gap-3">
            <Avatar className="h-14 w-14">
              {doctor.avatarUrl && (
                <AvatarImage src={doctor.avatarUrl} alt={doctor.name} />
              )}
              <AvatarFallback className="text-base">
                {getInitials(doctor.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <p className="truncate font-semibold leading-tight">
                  {doctor.name}
                </p>
              </div>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                CRM {doctor.crm}/{doctor.crmState}
              </p>
              <div className="mt-2">
                <StatusBadge status={doctor.approvalStatus} />
              </div>
            </div>
          </div>

          <Separator className="my-3" />

          <dl className="space-y-1 text-xs">
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Especialidade</dt>
              <dd className="truncate font-medium">{doctor.specialty}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">UF</dt>
              <dd className="font-medium">{doctor.crmState}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">E-mail</dt>
              <dd className="truncate font-medium">{doctor.email}</dd>
            </div>
          </dl>

          <div className="mt-4 flex gap-2 opacity-100 transition-opacity lg:opacity-0 lg:group-hover:opacity-100">
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenDetail(doctor)}
            >
              <Eye className="mr-1 h-4 w-4" aria-hidden />
              Detalhes
            </Button>
            {doctor.approvalStatus === 'pending' && (
              <>
                <Button
                  size="sm"
                  className="bg-success text-success-foreground hover:bg-success/90"
                  onClick={() => onApprove(doctor)}
                  aria-label={`Aprovar ${doctor.name}`}
                >
                  <CheckCircle className="h-4 w-4" aria-hidden />
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => onReject(doctor)}
                  aria-label={`Recusar ${doctor.name}`}
                >
                  <XCircle className="h-4 w-4" aria-hidden />
                </Button>
              </>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
};

/* ----------------------------- Empty state ----------------------------- */

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center gap-3 px-4 py-16 text-center">
    <svg
      width="96"
      height="96"
      viewBox="0 0 96 96"
      fill="none"
      aria-hidden
      className="text-muted-foreground/40"
    >
      <circle cx="48" cy="40" r="16" stroke="currentColor" strokeWidth="3" />
      <path
        d="M20 80c4-14 16-22 28-22s24 8 28 22"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M72 20l12 12M84 20L72 32"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
    <div>
      <p className="font-medium">Nenhum médico encontrado</p>
      <p className="text-sm text-muted-foreground">
        Ajuste os filtros ou limpe a busca para ver mais resultados.
      </p>
    </div>
  </div>
);

/* ----------------------------- Provider wrapper ----------------------------- */

let localQueryClient: QueryClient | null = null;
const getLocalQueryClient = (): QueryClient => {
  if (!localQueryClient) {
    localQueryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: 1,
          refetchOnWindowFocus: false,
          staleTime: 15_000,
        },
      },
    });
  }
  return localQueryClient;
};

const AdminMedicos = () => (
  <QueryClientProvider client={getLocalQueryClient()}>
    <AdminMedicosInner />
  </QueryClientProvider>
);

export default AdminMedicos;
