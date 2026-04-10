import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DoctorLayout } from '@/components/doctor/DoctorLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Pagination } from '@/components/ui/pagination';
import { getRequests, type MedicalRequest } from '@/services/doctorApi';
import {
  getTypeIcon,
  getTypeLabel,
  getStatusInfo,
  parseApiList,
} from '@/lib/doctor-helpers';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Loader2,
  Search,
  Filter,
  ArrowRight,
  SortDesc,
  X,
  AlertTriangle,
} from 'lucide-react';

type FilterType = 'all' | 'prescription' | 'exam' | 'consultation';
type FilterStatus = 'all' | 'pending' | 'in_review' | 'completed' | 'rejected';

const VALID_STATUS_FILTERS = [
  'all',
  'pending',
  'in_review',
  'completed',
  'rejected',
] as const;

/** Mapeia grupo de filtro → lista de statuses do backend para query server-side. */
const STATUS_GROUP_MAP: Record<string, string> = {
  pending: 'submitted,pending,paid,searching_doctor,approved_pending_payment',
  in_review:
    'in_review,approved,consultation_ready,consultation_accepted,in_consultation,pending_post_consultation',
  completed: 'signed,completed,delivered,consultation_finished',
  rejected: 'rejected,cancelled',
};

const TYPE_FILTERS: { value: FilterType; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'prescription', label: 'Receitas' },
  { value: 'exam', label: 'Exames' },
  { value: 'consultation', label: 'Consultas' },
];

const STATUS_FILTERS: { value: FilterStatus; label: string; color?: string }[] =
  [
    { value: 'all', label: 'Todos' },
    { value: 'pending', label: 'Pendentes', color: 'bg-orange-500' },
    { value: 'in_review', label: 'Em análise', color: 'bg-blue-500' },
    { value: 'completed', label: 'Concluídos', color: 'bg-emerald-500' },
    { value: 'rejected', label: 'Recusados', color: 'bg-red-500' },
  ];

const PAGE_SIZE = 20;

export default function DoctorRequests() {
  useEffect(() => {
    document.title = 'Pedidos — RenoveJá+';
    return () => {
      document.title = 'RenoveJá+';
    };
  }, []);

  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialStatus = searchParams.get('status') as FilterStatus | null;
  const initialPage = Number(searchParams.get('page')) || 1;

  const [statusFilter, setStatusFilter] = useState<FilterStatus>(
    initialStatus &&
      (VALID_STATUS_FILTERS as readonly string[]).includes(initialStatus)
      ? initialStatus
      : 'all'
  );
  const [typeFilter, setTypeFilter] = useState<FilterType>('all');
  const [page, setPage] = useState(initialPage);
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(statusFilter !== 'all');

  const [requests, setRequests] = useState<MedicalRequest[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  const fetchData = useCallback(
    async (p: number, status: FilterStatus, type: FilterType) => {
      setLoading(true);
      try {
        const params: Record<string, string | number> = {
          page: p,
          pageSize: PAGE_SIZE,
        };
        if (status !== 'all') {
          const mapped = STATUS_GROUP_MAP[status];
          // Defensivo: nunca enviar status=undefined ao backend (filtro silenciosamente quebrado)
          if (mapped) params.status = mapped;
        }
        if (type !== 'all') params.type = type;
        const data = await getRequests(
          params as Parameters<typeof getRequests>[0]
        );
        setFetchError(false);
        const parsed = data as
          | { items?: MedicalRequest[]; totalCount?: number }
          | MedicalRequest[];
        if (Array.isArray(parsed)) {
          setRequests(parsed);
          setTotalCount(parsed.length);
        } else {
          setRequests(parsed.items ?? parseApiList<MedicalRequest>(data));
          setTotalCount(parsed.totalCount ?? 0);
        }
      } catch {
        setRequests([]);
        setTotalCount(0);
        setFetchError(true);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchData(page, statusFilter, typeFilter);
  }, [page, statusFilter, typeFilter, fetchData]);

  // Filtro local apenas para busca textual (status e tipo já vão pro server)
  const filtered = search
    ? requests.filter((r) => {
        const q = search.toLowerCase();
        return (
          r.patientName?.toLowerCase().includes(q) ||
          r.symptoms?.toLowerCase().includes(q) ||
          r.notes?.toLowerCase().includes(q)
        );
      })
    : requests;

  const syncUrl = (params: { status?: string; page?: number }) => {
    const next = new URLSearchParams(searchParams);
    if (params.status !== undefined) {
      if (params.status === 'all') next.delete('status');
      else next.set('status', params.status);
    }
    if (params.page !== undefined) {
      if (params.page <= 1) next.delete('page');
      else next.set('page', String(params.page));
    }
    setSearchParams(next, { replace: true });
  };

  const handleStatusFilter = (value: FilterStatus) => {
    setStatusFilter(value);
    setPage(1);
    syncUrl({ status: value, page: 1 });
  };

  const handlePageChange = (p: number) => {
    setPage(p);
    syncUrl({ page: p });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const activeFilterCount =
    (statusFilter !== 'all' ? 1 : 0) + (typeFilter !== 'all' ? 1 : 0);

  return (
    <DoctorLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* ── Header ── */}
        <div className="space-y-3">
          {/* Title row */}
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h1 className="truncate text-xl font-bold tracking-tight sm:text-2xl">
                Pedidos
              </h1>
              <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
                {totalCount} {totalCount === 1 ? 'pedido' : 'pedidos'}
                {statusFilter !== 'all' && (
                  <span className="ml-1">
                    —{' '}
                    {
                      STATUS_FILTERS.find((f) => f.value === statusFilter)
                        ?.label
                    }
                  </span>
                )}
              </p>
            </div>
            {/* Filter toggle + clear — always visible */}
            <div className="flex shrink-0 items-center gap-2">
              {activeFilterCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    handleStatusFilter('all');
                    setTypeFilter('all');
                  }}
                  className="hidden gap-1 text-xs text-muted-foreground sm:inline-flex"
                >
                  <X className="h-3 w-3" /> Limpar
                </Button>
              )}
              <Button
                variant={showFilters ? 'default' : 'outline'}
                size="icon"
                onClick={() => setShowFilters(!showFilters)}
                aria-label="Filtros"
                className="relative h-9 w-9"
              >
                <Filter className="h-4 w-4" />
                {activeFilterCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
            </div>
          </div>

          {/* Search bar — full width, always below title */}
          <div className="relative w-full sm:max-w-sm">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              placeholder="Buscar paciente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 pl-10 text-sm"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                aria-label="Limpar busca"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* ── Filters Panel ── */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <Card className="rounded-xl border-border/50 shadow-sm">
                <CardContent className="space-y-4 p-3 sm:p-4">
                  {/* Type filters */}
                  <div className="space-y-2">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground sm:text-xs">
                      Tipo
                    </p>
                    <div className="flex flex-wrap gap-1.5 sm:gap-2">
                      {TYPE_FILTERS.map((f) => (
                        <button
                          key={f.value}
                          onClick={() => {
                            setTypeFilter(f.value);
                            setPage(1);
                            syncUrl({ page: 1 });
                          }}
                          className={`whitespace-nowrap rounded-full px-2.5 py-1.5 text-xs font-medium transition-all sm:px-3 ${
                            typeFilter === f.value
                              ? 'bg-primary text-primary-foreground shadow-sm'
                              : 'bg-muted text-muted-foreground hover:bg-muted/80'
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Status filters */}
                  <div className="space-y-2">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground sm:text-xs">
                      Status
                    </p>
                    <div className="flex flex-wrap gap-1.5 sm:gap-2">
                      {STATUS_FILTERS.map((f) => (
                        <button
                          key={f.value}
                          onClick={() => handleStatusFilter(f.value)}
                          className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1.5 text-xs font-medium transition-all sm:px-3 ${
                            statusFilter === f.value
                              ? 'bg-primary text-primary-foreground shadow-sm'
                              : 'bg-muted text-muted-foreground hover:bg-muted/80'
                          }`}
                        >
                          {f.color && (
                            <span
                              className={`h-2 w-2 shrink-0 rounded-full ${statusFilter === f.value ? 'bg-primary-foreground/70' : f.color}`}
                            />
                          )}
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Mobile clear button */}
                  {activeFilterCount > 0 && (
                    <div className="pt-1 sm:hidden">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          handleStatusFilter('all');
                          setTypeFilter('all');
                        }}
                        className="w-full justify-center gap-1 text-xs text-muted-foreground"
                      >
                        <X className="h-3 w-3" /> Limpar todos os filtros
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── List ── */}
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 sm:py-20">
            <Loader2
              className="h-7 w-7 animate-spin text-primary sm:h-8 sm:w-8"
              aria-hidden
            />
            <p className="text-xs text-muted-foreground">
              Carregando pedidos...
            </p>
          </div>
        ) : fetchError ? (
          <Card className="rounded-xl border-destructive/30 shadow-sm">
            <CardContent className="px-4 py-12 text-center sm:py-16">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 sm:h-16 sm:w-16">
                <AlertTriangle className="h-7 w-7 text-destructive sm:h-8 sm:w-8" />
              </div>
              <p className="text-sm font-medium text-destructive sm:text-base">
                Erro ao carregar pedidos
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Verifique sua conexão e tente novamente
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => fetchData(page, statusFilter, typeFilter)}
              >
                Tentar novamente
              </Button>
            </CardContent>
          </Card>
        ) : filtered.length === 0 ? (
          <Card className="rounded-xl shadow-sm">
            <CardContent className="px-4 py-12 text-center sm:py-16">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted sm:h-16 sm:w-16">
                <SortDesc className="h-7 w-7 text-muted-foreground sm:h-8 sm:w-8" />
              </div>
              <p className="text-sm font-medium text-muted-foreground sm:text-base">
                Nenhum pedido encontrado
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {search ? 'Tente outra busca' : 'Tente ajustar os filtros'}
              </p>
              {(search || activeFilterCount > 0) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-3 text-xs"
                  onClick={() => {
                    setSearch('');
                    handleStatusFilter('all');
                    setTypeFilter('all');
                  }}
                >
                  <X className="mr-1 h-3 w-3" /> Limpar filtros
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="space-y-2 sm:space-y-3">
              {filtered.map((req, i) => {
                const Icon = getTypeIcon(req.type);
                const statusInfo = getStatusInfo(req.status);

                // Indicador único de prioridade (substitui os 3 sinais
                // independentes — badge de risco, ícone sparkles, alerta de
                // urgência — que brigavam pelo mesmo espaço no card).
                // Ordem: Emergência > Risco alto > Urgente. Só um aparece.
                const riskLevel = req.aiRiskLevel?.toLowerCase() ?? '';
                const urgencyLevel = req.aiUrgency?.toLowerCase() ?? '';
                const isEmergency = urgencyLevel === 'emergency';
                const isHighRisk =
                  riskLevel.includes('high') || riskLevel.includes('alto');
                const isUrgent = urgencyLevel === 'urgent';
                const priority = isEmergency
                  ? {
                      label: 'Emergência',
                      color:
                        'border-red-400 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-950/60 dark:text-red-300',
                    }
                  : isHighRisk
                    ? {
                        label: 'Risco alto',
                        color:
                          'border-red-300 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-950/60 dark:text-red-300',
                      }
                    : isUrgent
                      ? {
                          label: 'Urgente',
                          color:
                            'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
                        }
                      : null;

                const totalItems =
                  (req.medications?.length ?? 0) + (req.exams?.length ?? 0);

                return (
                  <motion.div
                    key={req.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.02, 0.2) }}
                  >
                    <Card
                      className={`group cursor-pointer rounded-xl border-border/50 shadow-sm transition-all duration-200 hover:border-border hover:shadow-md ${
                        priority ? 'border-l-2 border-l-red-400' : ''
                      }`}
                      onClick={() => navigate(`/pedidos/${req.id}`)}
                    >
                      {/* Layout único para mobile e desktop: row compacta.
                          Antes havia 2 layouts duplicados (mobile stacked +
                          desktop horizontal) com 16+ elementos visuais por
                          card. Agora: 5-6 elementos, mesma densidade em
                          todas as larguras. */}
                      <CardContent className="flex items-center gap-3 p-3 sm:gap-4 sm:p-4">
                        {/* Ícone de tipo */}
                        <div className="shrink-0 rounded-xl bg-muted p-2.5 transition-colors group-hover:bg-primary/5 sm:p-3">
                          <Icon
                            className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary sm:h-5 sm:w-5"
                            aria-hidden
                          />
                        </div>

                        {/* Conteúdo principal */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="min-w-0 flex-1 truncate text-sm font-semibold">
                              {req.patientName}
                            </p>
                            {priority && (
                              <span
                                className={`shrink-0 rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase leading-none ${priority.color}`}
                              >
                                {priority.label}
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">
                            {getTypeLabel(req.type)} ·{' '}
                            {formatDate(req.createdAt)}
                            {totalItems > 0
                              ? ` · ${totalItems} ${totalItems === 1 ? 'item' : 'itens'}`
                              : ''}
                          </p>
                        </div>

                        {/* Status + seta */}
                        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                          <Badge
                            variant={statusInfo.variant}
                            className={`whitespace-nowrap text-[10px] ${statusInfo.color} ${statusInfo.bgColor}`}
                          >
                            {statusInfo.label}
                          </Badge>
                          <ArrowRight
                            className="hidden h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 sm:block"
                            aria-hidden
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
            <Pagination
              page={page}
              pageSize={PAGE_SIZE}
              totalCount={totalCount}
              onPageChange={handlePageChange}
            />
          </>
        )}
      </div>
    </DoctorLayout>
  );
}
