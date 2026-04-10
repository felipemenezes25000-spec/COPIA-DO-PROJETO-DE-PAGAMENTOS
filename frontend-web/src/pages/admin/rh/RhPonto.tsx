/**
 * RhPonto — Controle de ponto, banco de horas, horas extras e justificativas.
 *
 * Consome `@/services/rhApi` via TanStack Query (QueryClient singleton local).
 * Stack: Vite + React + TS + Tailwind + shadcn + framer-motion.
 * Gráficos em SVG puro, zero dependências novas.
 */

import { useMemo, useState, type ReactNode, type FormEvent } from 'react';
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Download,
  FileText,
  Clock,
  TrendingUp,
  CalendarX2,
  Wallet,
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  Edit3,
  MessageSquare,
  Sparkles,
  Paperclip,
  AlertTriangle,
} from 'lucide-react';
import {
  addDays,
  differenceInCalendarDays,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isWithinInterval,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

import { RhLayout } from '@/components/admin/rh/RhLayout';
import { AiInsightsPanel } from '@/components/admin/ai/AiInsightsPanel';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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

import { listPontos, listColaboradores } from '@/services/rhApi';
import type { PontoRegistro, PontoStatus, Colaborador } from '@/types/rh';
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
/* Tipos e helpers                                                     */
/* ------------------------------------------------------------------ */

type PeriodoPreset = 'hoje' | 'semana' | 'mes' | 'mes_anterior' | 'custom';

interface Periodo {
  start: Date;
  end: Date;
  preset: PeriodoPreset;
  label: string;
}

const STATUS_LABEL: Record<PontoStatus, string> = {
  ok: 'Normal',
  atraso: 'Atraso',
  falta: 'Falta',
  hora_extra: 'Hora extra',
  justificado: 'Justificado',
};

const STATUS_DOT: Record<PontoStatus, string> = {
  ok: 'bg-emerald-500',
  atraso: 'bg-amber-500',
  falta: 'bg-rose-500',
  hora_extra: 'bg-sky-500',
  justificado: 'bg-zinc-400',
};

const STATUS_SOFT: Record<PontoStatus, string> = {
  ok: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400',
  atraso:
    'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400',
  falta: 'bg-rose-500/10 text-rose-600 border-rose-500/20 dark:text-rose-400',
  hora_extra: 'bg-sky-500/10 text-sky-600 border-sky-500/20 dark:text-sky-400',
  justificado:
    'bg-zinc-500/10 text-zinc-600 border-zinc-500/20 dark:text-zinc-300',
};

const STATUS_FILL: Record<PontoStatus, string> = {
  ok: '#10b981',
  atraso: '#f59e0b',
  falta: '#f43f5e',
  hora_extra: '#0ea5e9',
  justificado: '#a1a1aa',
};

function formatHoras(total: number): string {
  if (!Number.isFinite(total)) return '0h 00min';
  const sign = total < 0 ? '-' : '';
  const abs = Math.abs(total);
  const h = Math.floor(abs);
  const m = Math.round((abs - h) * 60);
  return `${sign}${h}h ${String(m).padStart(2, '0')}min`;
}

function formatSaldoMinutos(min: number): string {
  const sign = min < 0 ? '-' : '+';
  const abs = Math.abs(min);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `${sign}${h}h ${String(m).padStart(2, '0')}min`;
}

function computePeriodo(
  preset: PeriodoPreset,
  customStart?: string,
  customEnd?: string
): Periodo {
  const hoje = new Date('2026-04-08');
  switch (preset) {
    case 'hoje':
      return { preset, start: hoje, end: hoje, label: 'Hoje' };
    case 'semana': {
      const start = startOfWeek(hoje, { weekStartsOn: 1 });
      const end = endOfWeek(hoje, { weekStartsOn: 1 });
      return { preset, start, end, label: 'Esta semana' };
    }
    case 'mes': {
      const start = startOfMonth(hoje);
      const end = endOfMonth(hoje);
      return {
        preset,
        start,
        end,
        label: format(hoje, "MMMM 'de' yyyy", { locale: ptBR }),
      };
    }
    case 'mes_anterior': {
      const prev = subMonths(hoje, 1);
      return {
        preset,
        start: startOfMonth(prev),
        end: endOfMonth(prev),
        label: format(prev, "MMMM 'de' yyyy", { locale: ptBR }),
      };
    }
    case 'custom': {
      const start = customStart ? parseISO(customStart) : startOfMonth(hoje);
      const end = customEnd ? parseISO(customEnd) : endOfMonth(hoje);
      return { preset, start, end, label: 'Personalizado' };
    }
  }
}

/* ------------------------------------------------------------------ */
/* Wrapper                                                             */
/* ------------------------------------------------------------------ */

export default function RhPonto(): JSX.Element {
  return (
    <QueryClientProvider client={getLocalQueryClient()}>
      <RhPontoInner />
    </QueryClientProvider>
  );
}

/* ------------------------------------------------------------------ */
/* Página                                                              */
/* ------------------------------------------------------------------ */

function RhPontoInner(): JSX.Element {
  const [preset, setPreset] = useState<PeriodoPreset>('mes');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  const [colaboradorId, setColaboradorId] = useState<string>('all');
  const [colaboradorSearch, setColaboradorSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<PontoStatus | 'all'>('all');
  const [selectedDay, setSelectedDay] = useState<PontoRegistro | null>(null);
  const [justificativaOpen, setJustificativaOpen] = useState<boolean>(false);
  const [bancoSelectedCol, setBancoSelectedCol] = useState<string | null>(null);
  const [tablePage, setTablePage] = useState<number>(1);
  const pageSize = 10;

  const periodo = useMemo(
    () => computePeriodo(preset, customStart, customEnd),
    [preset, customStart, customEnd]
  );

  const pontosQuery = useQuery<PontoRegistro[]>({
    queryKey: ['rh-pontos', colaboradorId],
    queryFn: () =>
      listPontos(colaboradorId === 'all' ? undefined : colaboradorId),
  });

  const colaboradoresQuery = useQuery<{
    items: Colaborador[];
    totalCount: number;
  }>({
    queryKey: ['rh-colaboradores-ponto', colaboradorSearch],
    queryFn: () =>
      listColaboradores({
        search: colaboradorSearch || undefined,
        pageSize: 100,
      }),
  });

  const colaboradoresMap = useMemo(() => {
    const map = new Map<string, Colaborador>();
    for (const c of colaboradoresQuery.data?.items ?? []) map.set(c.id, c);
    return map;
  }, [colaboradoresQuery.data]);

  const pontosFiltrados = useMemo<PontoRegistro[]>(() => {
    const all = pontosQuery.data ?? [];
    return all.filter((p) => {
      const d = parseISO(p.data);
      return isWithinInterval(d, { start: periodo.start, end: periodo.end });
    });
  }, [pontosQuery.data, periodo]);

  const kpis = useMemo(() => {
    const horasTrab = pontosFiltrados.reduce(
      (acc, p) => acc + p.horasTrabalhadas,
      0
    );
    const horasExtras = pontosFiltrados
      .filter((p) => p.status === 'hora_extra')
      .reduce((acc, p) => acc + Math.max(0, p.horasTrabalhadas - 8), 0);
    const faltas = pontosFiltrados.filter((p) => p.status === 'falta').length;

    const cols = colaboradoresQuery.data?.items ?? [];
    const saldos = cols.slice(0, 10).map((c) => {
      const pontosCol = (pontosQuery.data ?? []).filter(
        (p) => p.colaboradorId === c.id
      );
      return pontosCol.reduce((acc, p) => {
        if (p.status === 'hora_extra')
          return acc + (p.horasTrabalhadas - 8) * 60;
        if (p.status === 'falta') return acc - 8 * 60;
        if (p.status === 'atraso') return acc - 15;
        return acc;
      }, 0);
    });
    const saldoMedio = saldos.length
      ? Math.round(saldos.reduce((a, b) => a + b, 0) / saldos.length)
      : 0;

    return { horasTrab, horasExtras, faltas, saldoMedio };
  }, [pontosFiltrados, colaboradoresQuery.data, pontosQuery.data]);

  const statusDistribution = useMemo(() => {
    const counts: Record<PontoStatus, number> = {
      ok: 0,
      atraso: 0,
      falta: 0,
      hora_extra: 0,
      justificado: 0,
    };
    for (const p of pontosFiltrados) counts[p.status]++;
    const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
    return { counts, total };
  }, [pontosFiltrados]);

  const horasExtrasPorSemana = useMemo(() => {
    const buckets = new Map<string, number>();
    for (const p of pontosFiltrados) {
      if (p.status !== 'hora_extra') continue;
      const d = parseISO(p.data);
      const weekStart = startOfWeek(d, { weekStartsOn: 1 });
      const key = format(weekStart, 'yyyy-MM-dd');
      buckets.set(
        key,
        (buckets.get(key) ?? 0) + Math.max(0, p.horasTrabalhadas - 8)
      );
    }
    return Array.from(buckets.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([key, val]) => ({
        label: format(parseISO(key), 'dd/MM', { locale: ptBR }),
        value: Math.round(val * 10) / 10,
      }));
  }, [pontosFiltrados]);

  const pontualidadeTop = useMemo(() => {
    const byCol = new Map<string, { ok: number; total: number }>();
    for (const p of pontosFiltrados) {
      const cur = byCol.get(p.colaboradorId) ?? { ok: 0, total: 0 };
      cur.total++;
      if (p.status === 'ok' || p.status === 'hora_extra') cur.ok++;
      byCol.set(p.colaboradorId, cur);
    }
    return Array.from(byCol.entries())
      .map(([id, v]) => ({
        id,
        nome: colaboradoresMap.get(id)?.nome ?? id,
        pct: v.total ? Math.round((v.ok / v.total) * 100) : 0,
      }))
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 10);
  }, [pontosFiltrados, colaboradoresMap]);

  const tabelaFiltrada = useMemo(() => {
    const items =
      statusFilter === 'all'
        ? pontosFiltrados
        : pontosFiltrados.filter((p) => p.status === statusFilter);
    return [...items].sort((a, b) => b.data.localeCompare(a.data));
  }, [pontosFiltrados, statusFilter]);

  const tabelaPaginada = useMemo(() => {
    const start = (tablePage - 1) * pageSize;
    return tabelaFiltrada.slice(start, start + pageSize);
  }, [tabelaFiltrada, tablePage]);

  const totalPages = Math.max(1, Math.ceil(tabelaFiltrada.length / pageSize));

  const headerActions: ReactNode = (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => toast.success('Folha exportada (mock)')}
      >
        <Download className="mr-2 h-4 w-4" /> Exportar folha
      </Button>
      <Button size="sm" onClick={() => setJustificativaOpen(true)}>
        <FileText className="mr-2 h-4 w-4" /> Nova justificativa
      </Button>
    </div>
  );

  return (
    <RhLayout
      title="Ponto & Horas"
      subtitle="Controle de jornada e banco de horas"
      actions={headerActions}
    >
      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-6">
          {/* Filtros */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            <Card>
              <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="flex flex-wrap items-end gap-3">
                  <div className="min-w-[160px]">
                    <Label className="text-xs text-muted-foreground">
                      Período
                    </Label>
                    <Select
                      value={preset}
                      onValueChange={(v) => {
                        setPreset(v as PeriodoPreset);
                        setTablePage(1);
                      }}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hoje">Hoje</SelectItem>
                        <SelectItem value="semana">Semana</SelectItem>
                        <SelectItem value="mes">Mês atual</SelectItem>
                        <SelectItem value="mes_anterior">
                          Mês anterior
                        </SelectItem>
                        <SelectItem value="custom">Personalizado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {preset === 'custom' && (
                    <>
                      <div>
                        <Label className="text-xs text-muted-foreground">
                          Início
                        </Label>
                        <Input
                          type="date"
                          className="h-9"
                          value={customStart}
                          onChange={(e) => setCustomStart(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">
                          Fim
                        </Label>
                        <Input
                          type="date"
                          className="h-9"
                          value={customEnd}
                          onChange={(e) => setCustomEnd(e.target.value)}
                        />
                      </div>
                    </>
                  )}
                  <div className="min-w-[240px]">
                    <Label className="text-xs text-muted-foreground">
                      Colaborador
                    </Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Buscar..."
                          className="h-9 pl-8"
                          value={colaboradorSearch}
                          onChange={(e) => setColaboradorSearch(e.target.value)}
                        />
                      </div>
                      <Select
                        value={colaboradorId}
                        onValueChange={setColaboradorId}
                      >
                        <SelectTrigger className="h-9 w-[180px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          {(colaboradoresQuery.data?.items ?? []).map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {periodo.label}
                  </span>
                  <span className="mx-2">·</span>
                  {format(periodo.start, 'dd/MM/yyyy', { locale: ptBR })} –{' '}
                  {format(periodo.end, 'dd/MM/yyyy', { locale: ptBR })}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* KPIs */}
          <motion.div
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
            initial="hidden"
            animate="show"
            variants={{
              hidden: {},
              show: { transition: { staggerChildren: 0.06 } },
            }}
          >
            <KpiCard
              icon={<Clock className="h-4 w-4" />}
              label="Horas trabalhadas"
              value={formatHoras(kpis.horasTrab)}
              hint="no período"
              accent="text-primary"
              loading={pontosQuery.isLoading}
            />
            <KpiCard
              icon={<TrendingUp className="h-4 w-4" />}
              label="Horas extras"
              value={formatHoras(kpis.horasExtras)}
              hint="no período"
              accent="text-sky-500"
              loading={pontosQuery.isLoading}
            />
            <KpiCard
              icon={<CalendarX2 className="h-4 w-4" />}
              label="Faltas"
              value={String(kpis.faltas)}
              hint="registros"
              accent="text-rose-500"
              loading={pontosQuery.isLoading}
            />
            <KpiCard
              icon={<Wallet className="h-4 w-4" />}
              label="Saldo médio B. Horas"
              value={formatSaldoMinutos(kpis.saldoMedio)}
              hint="equipe"
              accent={
                kpis.saldoMedio >= 0 ? 'text-emerald-500' : 'text-rose-500'
              }
              loading={pontosQuery.isLoading || colaboradoresQuery.isLoading}
            />
          </motion.div>

          {/* Tabs principais */}
          <Tabs defaultValue="calendario">
            <TabsList>
              <TabsTrigger value="calendario">Calendário</TabsTrigger>
              <TabsTrigger value="tabela">Tabela</TabsTrigger>
              <TabsTrigger value="banco">Banco de horas</TabsTrigger>
            </TabsList>

            {/* CALENDÁRIO */}
            <TabsContent value="calendario" className="mt-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">
                    {format(periodo.start, "MMMM 'de' yyyy", { locale: ptBR })}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {pontosQuery.isLoading ? (
                    <Skeleton className="h-80 w-full" />
                  ) : (
                    <CalendarioPonto
                      pontos={pontosFiltrados}
                      referencia={periodo.start}
                      onSelectDay={(p) => setSelectedDay(p)}
                    />
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* TABELA */}
            <TabsContent value="tabela" className="mt-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-base">
                    Registros detalhados
                  </CardTitle>
                  <Select
                    value={statusFilter}
                    onValueChange={(v) => {
                      setStatusFilter(v as PontoStatus | 'all');
                      setTablePage(1);
                    }}
                  >
                    <SelectTrigger className="h-8 w-[170px] text-xs">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os status</SelectItem>
                      <SelectItem value="ok">Normal</SelectItem>
                      <SelectItem value="atraso">Atraso</SelectItem>
                      <SelectItem value="falta">Falta</SelectItem>
                      <SelectItem value="hora_extra">Hora extra</SelectItem>
                      <SelectItem value="justificado">Justificado</SelectItem>
                    </SelectContent>
                  </Select>
                </CardHeader>
                <CardContent>
                  {pontosQuery.isLoading ? (
                    <Skeleton className="h-64 w-full" />
                  ) : tabelaFiltrada.length === 0 ? (
                    <EmptyState text="Nenhum registro no período." />
                  ) : (
                    <>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Data</TableHead>
                              <TableHead>Colaborador</TableHead>
                              <TableHead>Entrada</TableHead>
                              <TableHead>S. Almoço</TableHead>
                              <TableHead>Volta</TableHead>
                              <TableHead>Saída</TableHead>
                              <TableHead>Horas</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead className="text-right">
                                Ações
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {tabelaPaginada.map((p) => (
                              <TableRow key={p.id}>
                                <TableCell className="whitespace-nowrap text-xs">
                                  {format(parseISO(p.data), 'dd/MM/yyyy', {
                                    locale: ptBR,
                                  })}
                                </TableCell>
                                <TableCell className="text-xs">
                                  {colaboradoresMap.get(p.colaboradorId)
                                    ?.nome ?? p.colaboradorId}
                                </TableCell>
                                <TableCell className="text-xs tabular-nums">
                                  {p.entrada}
                                </TableCell>
                                <TableCell className="text-xs tabular-nums">
                                  {p.saidaAlmoco}
                                </TableCell>
                                <TableCell className="text-xs tabular-nums">
                                  {p.voltaAlmoco}
                                </TableCell>
                                <TableCell className="text-xs tabular-nums">
                                  {p.saida}
                                </TableCell>
                                <TableCell className="text-xs tabular-nums">
                                  {formatHoras(p.horasTrabalhadas)}
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      'border text-[10px]',
                                      STATUS_SOFT[p.status]
                                    )}
                                  >
                                    {STATUS_LABEL[p.status]}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex justify-end gap-1">
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-7 w-7"
                                      onClick={() => setSelectedDay(p)}
                                      title="Ver detalhes"
                                    >
                                      <Eye className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-7 w-7"
                                      onClick={() => setJustificativaOpen(true)}
                                      title="Justificar"
                                    >
                                      <MessageSquare className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-7 w-7"
                                      onClick={() =>
                                        toast.info('Edição em breve')
                                      }
                                      title="Editar"
                                    >
                                      <Edit3 className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                        <span>
                          {tabelaFiltrada.length} registros · página {tablePage}{' '}
                          de {totalPages}
                        </span>
                        <div className="flex gap-1">
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-7 w-7"
                            disabled={tablePage === 1}
                            onClick={() =>
                              setTablePage((p) => Math.max(1, p - 1))
                            }
                          >
                            <ChevronLeft className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-7 w-7"
                            disabled={tablePage >= totalPages}
                            onClick={() =>
                              setTablePage((p) => Math.min(totalPages, p + 1))
                            }
                          >
                            <ChevronRight className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* BANCO DE HORAS */}
            <TabsContent value="banco" className="mt-4">
              <BancoHorasView
                colaboradores={colaboradoresQuery.data?.items ?? []}
                pontos={pontosQuery.data ?? []}
                selectedId={bancoSelectedCol}
                onSelect={setBancoSelectedCol}
                loading={colaboradoresQuery.isLoading || pontosQuery.isLoading}
              />
            </TabsContent>
          </Tabs>

          {/* Gráficos */}
          <div className="grid gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">
                  Distribuição de status
                </CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-center">
                <DonutStatus distribution={statusDistribution} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">
                  Horas extras por semana
                </CardTitle>
              </CardHeader>
              <CardContent>
                <BarsHorasExtras data={horasExtrasPorSemana} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Pontualidade (top 10)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {pontualidadeTop.length === 0 ? (
                  <EmptyState text="Sem dados." />
                ) : (
                  pontualidadeTop.map((p) => (
                    <div key={p.id} className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="truncate">{p.nome}</span>
                        <span className="tabular-nums text-muted-foreground">
                          {p.pct}%
                        </span>
                      </div>
                      <Progress value={p.pct} className="h-1.5" />
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* IA sidebar */}
        <aside className="hidden xl:block">
          <div className="sticky top-6 space-y-3">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" /> Insights de IA
            </div>
            <AiInsightsPanel scope="rh" maxItems={3} compact />
          </div>
        </aside>
      </div>

      {/* Dialog de detalhes do dia */}
      <Dialog
        open={selectedDay !== null}
        onOpenChange={(o) => !o && setSelectedDay(null)}
      >
        <DialogContent>
          {selectedDay && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {format(parseISO(selectedDay.data), "EEEE, dd 'de' MMMM", {
                    locale: ptBR,
                  })}
                </DialogTitle>
                <DialogDescription>
                  {colaboradoresMap.get(selectedDay.colaboradorId)?.nome ??
                    selectedDay.colaboradorId}
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-3 py-2 text-sm">
                <InfoRow label="Entrada" value={selectedDay.entrada} />
                <InfoRow label="Saída almoço" value={selectedDay.saidaAlmoco} />
                <InfoRow label="Volta almoço" value={selectedDay.voltaAlmoco} />
                <InfoRow label="Saída" value={selectedDay.saida} />
                <InfoRow
                  label="Horas trabalhadas"
                  value={formatHoras(selectedDay.horasTrabalhadas)}
                />
                <div>
                  <div className="text-xs text-muted-foreground">Status</div>
                  <Badge
                    variant="outline"
                    className={cn(
                      'mt-1 border text-[11px]',
                      STATUS_SOFT[selectedDay.status]
                    )}
                  >
                    {STATUS_LABEL[selectedDay.status]}
                  </Badge>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedDay(null);
                    setJustificativaOpen(true);
                  }}
                >
                  Justificar
                </Button>
                <Button onClick={() => setSelectedDay(null)}>Fechar</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de justificativa */}
      <JustificativaDialog
        open={justificativaOpen}
        onOpenChange={setJustificativaOpen}
        colaboradores={colaboradoresQuery.data?.items ?? []}
      />
    </RhLayout>
  );
}

/* ------------------------------------------------------------------ */
/* Subcomponentes                                                      */
/* ------------------------------------------------------------------ */

interface KpiCardProps {
  icon: ReactNode;
  label: string;
  value: string;
  hint: string;
  accent: string;
  loading: boolean;
}

function KpiCard({
  icon,
  label,
  value,
  hint,
  accent,
  loading,
}: KpiCardProps): JSX.Element {
  return (
    <motion.div
      variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}
    >
      <Card className="overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{label}</span>
            <span className={cn('rounded-md bg-muted/60 p-1.5', accent)}>
              {icon}
            </span>
          </div>
          {loading ? (
            <Skeleton className="mt-2 h-7 w-28" />
          ) : (
            <div
              className={cn('mt-1 text-2xl font-semibold tabular-nums', accent)}
            >
              {value}
            </div>
          )}
          <div className="text-[11px] text-muted-foreground">{hint}</div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}): JSX.Element {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium tabular-nums">{value}</div>
    </div>
  );
}

function EmptyState({ text }: { text: string }): JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-muted-foreground">
      <AlertTriangle className="h-5 w-5" />
      <span className="text-xs">{text}</span>
    </div>
  );
}

/* ----------------- Calendário --------------------------------------- */

interface CalendarioPontoProps {
  pontos: PontoRegistro[];
  referencia: Date;
  onSelectDay: (p: PontoRegistro) => void;
}

function CalendarioPonto({
  pontos,
  referencia,
  onSelectDay,
}: CalendarioPontoProps): JSX.Element {
  const monthStart = startOfMonth(referencia);
  const monthEnd = endOfMonth(referencia);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const totalDays = differenceInCalendarDays(gridEnd, gridStart) + 1;

  const byDate = useMemo(() => {
    const map = new Map<string, PontoRegistro[]>();
    for (const p of pontos) {
      const arr = map.get(p.data) ?? [];
      arr.push(p);
      map.set(p.data, arr);
    }
    return map;
  }, [pontos]);

  const weekdays = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-7 gap-2 text-center text-[10px] font-medium uppercase text-muted-foreground">
        {weekdays.map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: totalDays }).map((_, i) => {
          const day = addDays(gridStart, i);
          const key = format(day, 'yyyy-MM-dd');
          const dayPontos = byDate.get(key) ?? [];
          const inMonth = isSameMonth(day, monthStart);
          const firstPonto = dayPontos[0];
          return (
            <motion.button
              key={key}
              whileHover={{ y: -2, boxShadow: '0 4px 14px rgba(0,0,0,0.08)' }}
              onClick={() => firstPonto && onSelectDay(firstPonto)}
              disabled={!firstPonto}
              className={cn(
                'flex min-h-[68px] flex-col items-start rounded-md border bg-card p-1.5 text-left transition-colors',
                !inMonth && 'opacity-40',
                firstPonto
                  ? 'cursor-pointer hover:border-primary/40'
                  : 'cursor-default'
              )}
            >
              <span className="text-[11px] font-medium text-muted-foreground">
                {format(day, 'd')}
              </span>
              <div className="mt-1 flex flex-wrap gap-1">
                {dayPontos.slice(0, 5).map((p) => (
                  <span
                    key={p.id}
                    className={cn(
                      'h-1.5 w-1.5 rounded-full',
                      STATUS_DOT[p.status]
                    )}
                    title={STATUS_LABEL[p.status]}
                  />
                ))}
              </div>
            </motion.button>
          );
        })}
      </div>
      <Separator className="my-2" />
      <div className="flex flex-wrap gap-3 text-[10px] text-muted-foreground">
        {(Object.keys(STATUS_LABEL) as PontoStatus[]).map((s) => (
          <div key={s} className="flex items-center gap-1">
            <span className={cn('h-2 w-2 rounded-full', STATUS_DOT[s])} />
            {STATUS_LABEL[s]}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ----------------- Banco de Horas ----------------------------------- */

interface BancoHorasViewProps {
  colaboradores: Colaborador[];
  pontos: PontoRegistro[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  loading: boolean;
}

function BancoHorasView({
  colaboradores,
  pontos,
  selectedId,
  onSelect,
  loading,
}: BancoHorasViewProps): JSX.Element {
  const saldos = useMemo(() => {
    return colaboradores.map((c) => {
      const pontosCol = pontos.filter((p) => p.colaboradorId === c.id);
      const saldoMin = pontosCol.reduce((acc, p) => {
        if (p.status === 'hora_extra')
          return acc + (p.horasTrabalhadas - 8) * 60;
        if (p.status === 'falta') return acc - 8 * 60;
        if (p.status === 'atraso') return acc - 15;
        return acc;
      }, 0);
      return { colaborador: c, saldoMin: Math.round(saldoMin) };
    });
  }, [colaboradores, pontos]);

  const maxAbs = Math.max(60, ...saldos.map((s) => Math.abs(s.saldoMin)));

  const historico = useMemo(() => {
    if (!selectedId) return [];
    const pts = pontos
      .filter((p) => p.colaboradorId === selectedId)
      .sort((a, b) => a.data.localeCompare(b.data));
    let acc = 0;
    return pts.map((p) => {
      if (p.status === 'hora_extra') acc += (p.horasTrabalhadas - 8) * 60;
      else if (p.status === 'falta') acc -= 8 * 60;
      else if (p.status === 'atraso') acc -= 15;
      return { data: p.data, saldo: acc };
    });
  }, [selectedId, pontos]);

  if (loading) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Saldos da equipe</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {saldos.length === 0 && <EmptyState text="Sem colaboradores." />}
          {saldos.map(({ colaborador, saldoMin }) => {
            const positive = saldoMin >= 0;
            const pct = Math.min(100, (Math.abs(saldoMin) / maxAbs) * 50);
            const isSelected = selectedId === colaborador.id;
            return (
              <button
                key={colaborador.id}
                onClick={() => onSelect(colaborador.id)}
                className={cn(
                  'w-full rounded-md border p-2.5 text-left transition-colors hover:border-primary/40',
                  isSelected && 'border-primary/60 bg-muted/40'
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">
                    {colaborador.nome}
                  </span>
                  <span
                    className={cn(
                      'text-xs font-semibold tabular-nums',
                      positive ? 'text-emerald-500' : 'text-rose-500'
                    )}
                  >
                    {formatSaldoMinutos(saldoMin)}
                  </span>
                </div>
                {/* Bar centrada em 0 */}
                <div className="relative mt-1.5 h-1.5 w-full rounded-full bg-muted">
                  <div className="absolute left-1/2 top-0 h-full w-px bg-border" />
                  <div
                    className={cn(
                      'absolute top-0 h-full rounded-full',
                      positive ? 'bg-emerald-500' : 'bg-rose-500'
                    )}
                    style={{
                      left: positive ? '50%' : `${50 - pct}%`,
                      width: `${pct}%`,
                    }}
                  />
                </div>
              </button>
            );
          })}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">
            Histórico{' '}
            {selectedId
              ? `· ${saldos.find((s) => s.colaborador.id === selectedId)?.colaborador.nome ?? ''}`
              : ''}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!selectedId ? (
            <EmptyState text="Selecione um colaborador." />
          ) : historico.length === 0 ? (
            <EmptyState text="Sem histórico." />
          ) : (
            <LineChartHistorico data={historico} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ----------------- Gráficos SVG ------------------------------------- */

function DonutStatus({
  distribution,
}: {
  distribution: { counts: Record<PontoStatus, number>; total: number };
}): JSX.Element {
  const { counts, total } = distribution;
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  const entries = (Object.keys(counts) as PontoStatus[]).filter(
    (k) => counts[k] > 0
  );

  if (entries.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-xs text-muted-foreground">
        Sem dados
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width="140" height="140" viewBox="0 0 140 140">
        <g transform="translate(70,70) rotate(-90)">
          <circle
            r={radius}
            fill="none"
            stroke="currentColor"
            className="text-muted/30"
            strokeWidth="14"
          />
          {entries.map((k) => {
            const portion = counts[k] / total;
            const length = portion * circumference;
            const dasharray = `${length} ${circumference - length}`;
            const el = (
              <circle
                key={k}
                r={radius}
                fill="none"
                stroke={STATUS_FILL[k]}
                strokeWidth="14"
                strokeDasharray={dasharray}
                strokeDashoffset={-offset}
              />
            );
            offset += length;
            return el;
          })}
        </g>
        <text
          x="70"
          y="68"
          textAnchor="middle"
          className="fill-foreground text-xl font-semibold"
        >
          {total}
        </text>
        <text
          x="70"
          y="86"
          textAnchor="middle"
          className="fill-muted-foreground text-[10px]"
        >
          registros
        </text>
      </svg>
      <div className="flex flex-wrap justify-center gap-2 text-[10px]">
        {entries.map((k) => (
          <div key={k} className="flex items-center gap-1">
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: STATUS_FILL[k] }}
            />
            <span className="text-muted-foreground">
              {STATUS_LABEL[k]} ({counts[k]})
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BarsHorasExtras({
  data,
}: {
  data: { label: string; value: number }[];
}): JSX.Element {
  if (data.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-xs text-muted-foreground">
        Sem dados
      </div>
    );
  }
  const max = Math.max(...data.map((d) => d.value), 1);
  const width = 280;
  const height = 140;
  const pad = 24;
  const barW = (width - pad * 2) / data.length - 8;
  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="overflow-visible"
    >
      {data.map((d, i) => {
        const h = ((height - pad * 2) * d.value) / max;
        const x = pad + i * ((width - pad * 2) / data.length) + 4;
        const y = height - pad - h;
        return (
          <g key={d.label}>
            <rect
              x={x}
              y={y}
              width={barW}
              height={h}
              rx={3}
              fill="#0ea5e9"
              className="opacity-80"
            />
            <text
              x={x + barW / 2}
              y={y - 4}
              textAnchor="middle"
              className="fill-foreground text-[9px] tabular-nums"
            >
              {d.value}h
            </text>
            <text
              x={x + barW / 2}
              y={height - 8}
              textAnchor="middle"
              className="fill-muted-foreground text-[9px]"
            >
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function LineChartHistorico({
  data,
}: {
  data: { data: string; saldo: number }[];
}): JSX.Element {
  const width = 320;
  const height = 180;
  const pad = 24;
  const values = data.map((d) => d.saldo);
  const max = Math.max(...values, 0);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const stepX = (width - pad * 2) / Math.max(1, data.length - 1);
  const yFor = (v: number) => pad + ((max - v) / range) * (height - pad * 2);
  const zeroY = yFor(0);

  const points = data
    .map((d, i) => `${pad + i * stepX},${yFor(d.saldo)}`)
    .join(' ');

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
      <line
        x1={pad}
        x2={width - pad}
        y1={zeroY}
        y2={zeroY}
        stroke="currentColor"
        className="text-border"
        strokeDasharray="2 3"
      />
      <polyline fill="none" stroke="#6366f1" strokeWidth="2" points={points} />
      {data.map((d, i) => (
        <circle
          key={d.data}
          cx={pad + i * stepX}
          cy={yFor(d.saldo)}
          r={2.5}
          fill="#6366f1"
        />
      ))}
      <text x={pad} y={pad - 6} className="fill-muted-foreground text-[9px]">
        {formatSaldoMinutos(max)}
      </text>
      <text x={pad} y={height - 6} className="fill-muted-foreground text-[9px]">
        {formatSaldoMinutos(min)}
      </text>
    </svg>
  );
}

/* ----------------- Dialog Justificativa ----------------------------- */

interface JustificativaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  colaboradores: Colaborador[];
}

function JustificativaDialog({
  open,
  onOpenChange,
  colaboradores,
}: JustificativaDialogProps): JSX.Element {
  const [colId, setColId] = useState<string>('');
  const [data, setData] = useState<string>('');
  const [motivo, setMotivo] = useState<string>('Atestado');
  const [observacao, setObservacao] = useState<string>('');

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!colId || !data) {
      toast.error('Preencha colaborador e data');
      return;
    }
    toast.success('Justificativa enviada');
    onOpenChange(false);
    setColId('');
    setData('');
    setMotivo('Atestado');
    setObservacao('');
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova justificativa</DialogTitle>
          <DialogDescription>
            Registre atestados, consultas e demais ocorrências.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 py-2">
          <div>
            <Label className="text-xs">Colaborador</Label>
            <Select value={colId} onValueChange={setColId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
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
          <div>
            <Label className="text-xs">Data</Label>
            <Input
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs">Motivo</Label>
            <Select value={motivo} onValueChange={setMotivo}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Atestado">Atestado</SelectItem>
                <SelectItem value="Consulta">Consulta</SelectItem>
                <SelectItem value="Luto">Luto</SelectItem>
                <SelectItem value="Outros">Outros</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Anexo</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full justify-start"
            >
              <Paperclip className="mr-2 h-3.5 w-3.5" /> Anexar arquivo (em
              breve)
            </Button>
          </div>
          <div>
            <Label className="text-xs">Observação</Label>
            <Textarea
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              rows={3}
              placeholder="Detalhes adicionais..."
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit">Enviar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
