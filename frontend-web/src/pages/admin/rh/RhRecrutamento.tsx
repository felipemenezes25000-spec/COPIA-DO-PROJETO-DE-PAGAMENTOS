/**
 * RhRecrutamento — Página principal de Recrutamento & Seleção do Portal RH.
 *
 * Núcleo da experiência: Kanban inteligente de candidatos com drag & drop
 * nativo, triagem por IA, filtros avançados, visualizações alternativas
 * (lista e grid) e drawer lateral rico com análise IA completa.
 *
 * Consome `rhApi` (mock em memória) via TanStack Query — QueryClient local
 * singleton porque não há provider raiz. Zero dependências novas: drag/drop
 * é HTML5 puro, gráficos em SVG, animações em framer-motion.
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
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  Plus,
  FileSpreadsheet,
  Settings2,
  Users,
  Briefcase,
  MessageSquare,
  Mail,
  CheckCircle2,
  Sparkles,
  Inbox,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { RhLayout } from '@/components/admin/rh/RhLayout';
import { AiInsightsPanel } from '@/components/admin/ai/AiInsightsPanel';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
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
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

import {
  listCandidatos,
  listVagas,
  moverCandidatoEtapa,
} from '@/services/rhApi';
import type { Candidato, CandidatoEtapa, Vaga } from '@/types/rh';

import { VagasStrip } from '@/components/admin/rh/recrutamento/VagasStrip';
import {
  FiltrosBar,
  defaultFiltros,
  type RecrutamentoFiltros,
  type ViewMode,
} from '@/components/admin/rh/recrutamento/FiltrosBar';
import {
  KanbanColumn,
  ETAPAS,
} from '@/components/admin/rh/recrutamento/KanbanColumn';
import { CandidatoCard } from '@/components/admin/rh/recrutamento/CandidatoCard';
import { CandidatoDetailSheet } from '@/components/admin/rh/recrutamento/CandidatoDetailSheet';
import { scoreColor } from '@/components/admin/rh/recrutamento/ScoreIaRing';

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
/* Formatação                                                          */
/* ------------------------------------------------------------------ */

const currencyFmt = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
});
const intFmt = new Intl.NumberFormat('pt-BR');

/* ------------------------------------------------------------------ */
/* Debounce hook                                                       */
/* ------------------------------------------------------------------ */

function useDebounced<T>(value: T, delay = 250): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

/* ------------------------------------------------------------------ */
/* KPI card                                                            */
/* ------------------------------------------------------------------ */

interface KpiCardProps {
  label: string;
  value: string;
  icon: ReactNode;
  tone?: string;
  progress?: number;
  delta?: string;
  index: number;
}

const KpiCard = ({
  label,
  value,
  icon,
  tone,
  progress,
  delta,
  index,
}: KpiCardProps) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.04, duration: 0.25 }}
  >
    <Card className="h-full overflow-hidden">
      <CardContent className="p-3">
        <div className="flex items-start justify-between">
          <div
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-lg',
              tone ?? 'bg-primary/10 text-primary'
            )}
          >
            {icon}
          </div>
          {delta && (
            <Badge variant="outline" className="text-[9px]">
              {delta}
            </Badge>
          )}
        </div>
        <p className="mt-2 text-[10px] uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p className="text-2xl font-bold tabular-nums leading-tight">{value}</p>
        {progress !== undefined && (
          <Progress value={progress} className="mt-2 h-1.5" />
        )}
      </CardContent>
    </Card>
  </motion.div>
);

/* ------------------------------------------------------------------ */
/* Inner component                                                     */
/* ------------------------------------------------------------------ */

function RhRecrutamentoInner() {
  const queryClient = useQueryClient();

  const [filtros, setFiltros] = useState<RecrutamentoFiltros>(defaultFiltros);
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [selectedCandidato, setSelectedCandidato] = useState<Candidato | null>(
    null
  );
  const [detailOpen, setDetailOpen] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [novaVagaOpen, setNovaVagaOpen] = useState(false);

  const debouncedSearch = useDebounced(filtros.search);

  // Queries
  const vagasQuery = useQuery({
    queryKey: ['rh', 'vagas'],
    queryFn: () => listVagas(),
  });
  const candidatosQuery = useQuery({
    queryKey: ['rh', 'candidatos'],
    queryFn: () => listCandidatos(),
  });

  // Keyboard shortcut: Ctrl+K foco busca; Escape fecha sheets
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const input = document.querySelector<HTMLInputElement>(
          'input[placeholder^="Buscar"]'
        );
        input?.focus();
      }
      if (e.key === 'Escape') {
        if (detailOpen) setDetailOpen(false);
        if (novaVagaOpen) setNovaVagaOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [detailOpen, novaVagaOpen]);

  const vagas = useMemo(() => vagasQuery.data ?? [], [vagasQuery.data]);
  const candidatos = useMemo(
    () => candidatosQuery.data ?? [],
    [candidatosQuery.data]
  );

  const vagasMap = useMemo(() => {
    const m = new Map<string, Vaga>();
    vagas.forEach((v) => m.set(v.id, v));
    return m;
  }, [vagas]);

  // Opções derivadas para filtros
  const allSkills = useMemo(() => {
    const set = new Set<string>();
    candidatos.forEach((c) => c.skills.forEach((s) => set.add(s)));
    return Array.from(set).sort();
  }, [candidatos]);

  const allDepartamentos = useMemo(() => {
    const set = new Set<string>();
    vagas.forEach((v) => set.add(v.departamento));
    return Array.from(set).sort();
  }, [vagas]);

  const allDisponibilidades = useMemo(() => {
    const set = new Set<string>();
    candidatos.forEach((c) => set.add(c.disponibilidade));
    return Array.from(set).sort();
  }, [candidatos]);

  // Candidatos filtrados + ordenados
  const filtrados = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    const byVaga = new Map<string, Vaga>(vagasMap);

    let items = candidatos.filter((c) => {
      const v = byVaga.get(c.vagaId);
      if (filtros.vagaId && c.vagaId !== filtros.vagaId) return false;
      if (filtros.departamento && v?.departamento !== filtros.departamento)
        return false;
      if (filtros.nivel && v?.nivel !== filtros.nivel) return false;
      if (filtros.modalidade && v?.modalidade !== filtros.modalidade)
        return false;
      if (c.scoreIa < filtros.scoreMin || c.scoreIa > filtros.scoreMax)
        return false;
      if (
        c.experienciaAnos < filtros.expMin ||
        c.experienciaAnos > filtros.expMax
      )
        return false;
      if (
        c.pretensaoSalarial < filtros.pretensaoMin ||
        c.pretensaoSalarial > filtros.pretensaoMax
      )
        return false;
      if (
        filtros.disponibilidade &&
        c.disponibilidade !== filtros.disponibilidade
      )
        return false;
      if (filtros.onlyRecommended && c.scoreIa < 80) return false;
      if (filtros.skills.length > 0) {
        const has = filtros.skills.every((s) => c.skills.includes(s));
        if (!has) return false;
      }
      if (q) {
        const blob = `${c.nome} ${c.email} ${c.skills.join(' ')}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });

    const sorters: Record<string, (a: Candidato, b: Candidato) => number> = {
      score_desc: (a, b) => b.scoreIa - a.scoreIa,
      score_asc: (a, b) => a.scoreIa - b.scoreIa,
      recent: (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      oldest: (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      exp_desc: (a, b) => b.experienciaAnos - a.experienciaAnos,
      pretensao_asc: (a, b) => a.pretensaoSalarial - b.pretensaoSalarial,
    };
    items = [...items].sort(sorters[filtros.sort]!);
    return items;
  }, [candidatos, vagasMap, filtros, debouncedSearch]);

  // Agrupar por etapa
  const porEtapa = useMemo(() => {
    const map = new Map<CandidatoEtapa, Candidato[]>();
    ETAPAS.forEach((e) => map.set(e.key, []));
    filtrados.forEach((c) => {
      const arr = map.get(c.etapa);
      if (arr) arr.push(c);
    });
    return map;
  }, [filtrados]);

  // KPIs
  const kpis = useMemo(() => {
    const ativos = candidatos.filter(
      (c) => c.etapa !== 'contratado' && c.etapa !== 'rejeitado'
    );
    const emEntrevista = candidatos.filter(
      (c) => c.etapa === 'entrevista_rh' || c.etapa === 'entrevista_tecnica'
    );
    const propostas = candidatos.filter((c) => c.etapa === 'proposta');
    const contratados = candidatos.filter((c) => c.etapa === 'contratado');
    const scoreMedio =
      ativos.length > 0
        ? Math.round(
            ativos.reduce((acc, c) => acc + c.scoreIa, 0) / ativos.length
          )
        : 0;
    const vagasAbertas = vagas.filter((v) => v.status === 'aberta').length;
    return {
      vagasAbertas,
      ativos: ativos.length,
      emEntrevista: emEntrevista.length,
      propostas: propostas.length,
      contratados: contratados.length,
      scoreMedio,
    };
  }, [candidatos, vagas]);

  // Mutation: mover etapa com optimistic update
  const moveMutation = useMutation({
    mutationFn: ({ id, etapa }: { id: string; etapa: CandidatoEtapa }) =>
      moverCandidatoEtapa(id, etapa),
    onMutate: async ({ id, etapa }) => {
      await queryClient.cancelQueries({ queryKey: ['rh', 'candidatos'] });
      const previous = queryClient.getQueryData<Candidato[]>([
        'rh',
        'candidatos',
      ]);
      queryClient.setQueryData<Candidato[]>(['rh', 'candidatos'], (old) =>
        old ? old.map((c) => (c.id === id ? { ...c, etapa } : c)) : old
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(['rh', 'candidatos'], ctx.previous);
      }
      toast.error('Não foi possível mover o candidato');
    },
    onSuccess: (updated) => {
      const etapaLabel = ETAPAS.find((e) => e.key === updated.etapa)?.label;
      toast.success(`${updated.nome} movido para ${etapaLabel}`);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['rh', 'candidatos'] });
    },
  });

  const handleDrop = useCallback(
    (id: string, etapa: CandidatoEtapa) => {
      const c = candidatos.find((x) => x.id === id);
      if (!c || c.etapa === etapa) {
        setDraggingId(null);
        return;
      }
      moveMutation.mutate({ id, etapa });
      setDraggingId(null);
    },
    [candidatos, moveMutation]
  );

  const handleOpenDetail = useCallback((c: Candidato) => {
    setSelectedCandidato(c);
    setDetailOpen(true);
  }, []);

  const handleReject = useCallback(
    (id: string) => {
      moveMutation.mutate({ id, etapa: 'rejeitado' });
    },
    [moveMutation]
  );

  const handleExport = useCallback(() => {
    const rows = [
      [
        'Nome',
        'Email',
        'Vaga',
        'Etapa',
        'Score IA',
        'Exp',
        'Pretensão',
        'Skills',
        'Disponibilidade',
      ],
      ...filtrados.map((c) => [
        c.nome,
        c.email,
        vagasMap.get(c.vagaId)?.titulo ?? '',
        c.etapa,
        c.scoreIa.toString(),
        c.experienciaAnos.toString(),
        c.pretensaoSalarial.toString(),
        c.skills.join('; '),
        c.disponibilidade,
      ]),
    ];
    const csv = rows
      .map((r) => r.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `candidatos-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${filtrados.length} candidatos exportados`);
  }, [filtrados, vagasMap]);

  const isLoading = vagasQuery.isLoading || candidatosQuery.isLoading;

  /* ---------------------------------------------------------------- */
  /* Render                                                            */
  /* ---------------------------------------------------------------- */

  return (
    <RhLayout
      title="Recrutamento & Seleção"
      subtitle="Pipeline inteligente de talentos com triagem IA"
      actions={
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="gap-1">
            <FileSpreadsheet className="h-3.5 w-3.5" />
            Relatório
          </Button>
          <Button size="sm" variant="outline" className="gap-1">
            <Settings2 className="h-3.5 w-3.5" />
            Configurar IA
          </Button>
          <Button
            size="sm"
            className="gap-1"
            onClick={() => setNovaVagaOpen(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            Nova vaga
          </Button>
        </div>
      }
    >
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-4">
          {/* KPIs */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))
            ) : (
              <>
                <KpiCard
                  index={0}
                  label="Vagas Abertas"
                  value={intFmt.format(kpis.vagasAbertas)}
                  icon={<Briefcase className="h-4 w-4" />}
                  tone="bg-sky-500/10 text-sky-600 dark:text-sky-400"
                  delta={`${vagas.length} total`}
                />
                <KpiCard
                  index={1}
                  label="Candidatos Ativos"
                  value={intFmt.format(kpis.ativos)}
                  icon={<Users className="h-4 w-4" />}
                  tone="bg-violet-500/10 text-violet-600 dark:text-violet-400"
                />
                <KpiCard
                  index={2}
                  label="Em Entrevista"
                  value={intFmt.format(kpis.emEntrevista)}
                  icon={<MessageSquare className="h-4 w-4" />}
                  tone="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                />
                <KpiCard
                  index={3}
                  label="Propostas Enviadas"
                  value={intFmt.format(kpis.propostas)}
                  icon={<Mail className="h-4 w-4" />}
                  tone="bg-amber-500/10 text-amber-600 dark:text-amber-400"
                />
                <KpiCard
                  index={4}
                  label="Contratados (mês)"
                  value={intFmt.format(kpis.contratados)}
                  icon={<CheckCircle2 className="h-4 w-4" />}
                  tone="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                />
                <KpiCard
                  index={5}
                  label="Score IA Médio"
                  value={`${kpis.scoreMedio}`}
                  icon={<Sparkles className="h-4 w-4" />}
                  tone="bg-primary/10 text-primary"
                  progress={kpis.scoreMedio}
                />
              </>
            )}
          </div>

          {/* Strip de vagas */}
          {isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            <VagasStrip
              vagas={vagas}
              selectedId={filtros.vagaId}
              onSelect={(id) => setFiltros((p) => ({ ...p, vagaId: id }))}
              totalCandidatos={candidatos.length}
            />
          )}

          {/* Filtros */}
          <FiltrosBar
            filtros={filtros}
            setFiltros={setFiltros}
            vagas={vagas}
            allSkills={allSkills}
            allDepartamentos={allDepartamentos}
            allDisponibilidades={allDisponibilidades}
            viewMode={viewMode}
            setViewMode={setViewMode}
            totalFiltrado={filtrados.length}
            totalGeral={candidatos.length}
            onExport={handleExport}
          />

          {/* Main view */}
          {isLoading ? (
            <div className="flex gap-3 overflow-hidden">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-[500px] w-72 shrink-0" />
              ))}
            </div>
          ) : filtrados.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center gap-2 py-16 text-center">
                <Inbox className="h-12 w-12 text-muted-foreground/40" />
                <p className="text-sm font-semibold">
                  Nenhum candidato encontrado
                </p>
                <p className="max-w-md text-xs text-muted-foreground">
                  Ajuste os filtros ou limpe-os para ver todos os candidatos do
                  pipeline.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setFiltros(defaultFiltros)}
                >
                  Limpar filtros
                </Button>
              </CardContent>
            </Card>
          ) : viewMode === 'kanban' ? (
            <div className="flex snap-x gap-3 overflow-x-auto pb-3">
              {ETAPAS.map((etapa) => (
                <div key={etapa.key} className="snap-start">
                  <KanbanColumn
                    etapa={etapa}
                    candidatos={porEtapa.get(etapa.key) ?? []}
                    vagas={vagasMap}
                    onOpen={handleOpenDetail}
                    onDrop={handleDrop}
                    draggingId={draggingId}
                    setDraggingId={setDraggingId}
                  />
                </div>
              ))}
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              {filtrados.map((c, i) => (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02, duration: 0.2 }}
                >
                  <CandidatoCard
                    candidato={c}
                    vaga={vagasMap.get(c.vagaId)}
                    onOpen={handleOpenDetail}
                    variant="grid"
                  />
                </motion.div>
              ))}
            </div>
          ) : (
            <CandidatosListView
              candidatos={filtrados}
              vagasMap={vagasMap}
              onOpen={handleOpenDetail}
              onMoveEtapa={(id, etapa) => moveMutation.mutate({ id, etapa })}
            />
          )}
        </div>

        {/* Sidebar IA */}
        <aside className="hidden xl:block">
          <div className="sticky top-4 space-y-4">
            <AiInsightsPanel scope="rh" maxItems={5} compact />
          </div>
        </aside>
      </div>

      {/* Drawer perfil candidato */}
      <CandidatoDetailSheet
        candidato={selectedCandidato}
        vaga={
          selectedCandidato ? vagasMap.get(selectedCandidato.vagaId) : undefined
        }
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onMoveEtapa={(id, etapa) => moveMutation.mutate({ id, etapa })}
        onReject={handleReject}
      />

      {/* Sheet nova vaga */}
      <NovaVagaSheet open={novaVagaOpen} onOpenChange={setNovaVagaOpen} />
    </RhLayout>
  );
}

/* ------------------------------------------------------------------ */
/* Lista (view alternativa)                                            */
/* ------------------------------------------------------------------ */

interface CandidatosListViewProps {
  candidatos: Candidato[];
  vagasMap: Map<string, Vaga>;
  onOpen: (c: Candidato) => void;
  onMoveEtapa: (id: string, etapa: CandidatoEtapa) => void;
}

function CandidatosListView({
  candidatos,
  vagasMap,
  onOpen,
  onMoveEtapa,
}: CandidatosListViewProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === candidatos.length) setSelected(new Set());
    else setSelected(new Set(candidatos.map((c) => c.id)));
  };

  return (
    <Card>
      {selected.size > 0 && (
        <div className="flex items-center justify-between border-b border-border bg-muted/40 px-3 py-2 text-xs">
          <span className="font-medium">{selected.size} selecionado(s)</span>
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" className="h-7">
                  Mover etapa
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {ETAPAS.map((e) => (
                  <DropdownMenuItem
                    key={e.key}
                    onClick={() => {
                      selected.forEach((id) => onMoveEtapa(id, e.key));
                      setSelected(new Set());
                    }}
                  >
                    {e.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-destructive"
              onClick={() => {
                selected.forEach((id) => onMoveEtapa(id, 'rejeitado'));
                setSelected(new Set());
              }}
            >
              Rejeitar
            </Button>
          </div>
        </div>
      )}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8">
              <input
                type="checkbox"
                checked={
                  selected.size === candidatos.length && candidatos.length > 0
                }
                onChange={toggleAll}
                className="h-3.5 w-3.5"
              />
            </TableHead>
            <TableHead>Candidato</TableHead>
            <TableHead>Vaga</TableHead>
            <TableHead>Etapa</TableHead>
            <TableHead>Score IA</TableHead>
            <TableHead>Exp</TableHead>
            <TableHead>Pretensão</TableHead>
            <TableHead>Skills</TableHead>
            <TableHead>Criado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {candidatos.map((c) => {
            const v = vagasMap.get(c.vagaId);
            const etapaMeta = ETAPAS.find((e) => e.key === c.etapa);
            const colors = scoreColor(c.scoreIa);
            return (
              <TableRow
                key={c.id}
                className="cursor-pointer"
                onClick={() => onOpen(c)}
              >
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selected.has(c.id)}
                    onChange={() => toggle(c.id)}
                    className="h-3.5 w-3.5"
                  />
                </TableCell>
                <TableCell>
                  <div className="font-medium">{c.nome}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {c.email}
                  </div>
                </TableCell>
                <TableCell className="text-xs">{v?.titulo ?? '—'}</TableCell>
                <TableCell>
                  {etapaMeta && (
                    <Badge
                      variant="outline"
                      className={cn('text-[10px]', etapaMeta.color)}
                    >
                      {etapaMeta.label}
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="w-32">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn('h-full rounded-full', colors.bg)}
                        style={{ width: `${c.scoreIa}%` }}
                      />
                    </div>
                    <span
                      className={cn(
                        'text-xs font-bold tabular-nums',
                        colors.text
                      )}
                    >
                      {Math.round(c.scoreIa)}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-xs tabular-nums">
                  {c.experienciaAnos}a
                </TableCell>
                <TableCell className="text-xs tabular-nums">
                  {currencyFmt.format(c.pretensaoSalarial)}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {c.skills.slice(0, 3).map((s) => (
                      <Badge
                        key={s}
                        variant="secondary"
                        className="px-1.5 py-0 text-[9px]"
                      >
                        {s}
                      </Badge>
                    ))}
                    {c.skills.length > 3 && (
                      <Badge
                        variant="outline"
                        className="px-1.5 py-0 text-[9px]"
                      >
                        +{c.skills.length - 3}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-[10px] text-muted-foreground">
                  {formatDistanceToNow(new Date(c.createdAt), {
                    locale: ptBR,
                    addSuffix: true,
                  })}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Nova Vaga Wizard                                                    */
/* ------------------------------------------------------------------ */

interface NovaVagaSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function NovaVagaSheet({ open, onOpenChange }: NovaVagaSheetProps) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    titulo: '',
    departamento: '',
    nivel: 'pleno',
    modalidade: 'hibrido',
    descricao: '',
    requisitos: '',
    salarioMin: 5000,
    salarioMax: 10000,
    beneficios: '',
    triagemAuto: true,
    matchCultural: true,
    rejeitarBaixoScore: false,
  });

  const reset = () => {
    setStep(1);
    setForm({
      titulo: '',
      departamento: '',
      nivel: 'pleno',
      modalidade: 'hibrido',
      descricao: '',
      requisitos: '',
      salarioMin: 5000,
      salarioMax: 10000,
      beneficios: '',
      triagemAuto: true,
      matchCultural: true,
      rejeitarBaixoScore: false,
    });
  };

  const handleCreate = () => {
    toast.success(`Vaga "${form.titulo || 'Sem título'}" publicada!`);
    reset();
    onOpenChange(false);
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <SheetContent className="w-full sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>Nova vaga</SheetTitle>
          <SheetDescription>
            Passo {step} de 4 —{' '}
            {['Básico', 'Descrição', 'Remuneração', 'Triagem IA'][step - 1]}
          </SheetDescription>
        </SheetHeader>

        {/* Progress */}
        <div className="my-4 flex gap-1">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={cn(
                'h-1 flex-1 rounded-full transition',
                s <= step ? 'bg-primary' : 'bg-muted'
              )}
            />
          ))}
        </div>

        <div className="space-y-4">
          {step === 1 && (
            <>
              <div>
                <Label htmlFor="titulo">Título</Label>
                <Input
                  id="titulo"
                  value={form.titulo}
                  onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                  placeholder="Ex: Dev Backend Sênior"
                />
              </div>
              <div>
                <Label htmlFor="depto">Departamento</Label>
                <Input
                  id="depto"
                  value={form.departamento}
                  onChange={(e) =>
                    setForm({ ...form, departamento: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Nível</Label>
                  <Select
                    value={form.nivel}
                    onValueChange={(v) => setForm({ ...form, nivel: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="junior">Júnior</SelectItem>
                      <SelectItem value="pleno">Pleno</SelectItem>
                      <SelectItem value="senior">Sênior</SelectItem>
                      <SelectItem value="lead">Lead</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Modalidade</Label>
                  <Select
                    value={form.modalidade}
                    onValueChange={(v) => setForm({ ...form, modalidade: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="presencial">Presencial</SelectItem>
                      <SelectItem value="hibrido">Híbrido</SelectItem>
                      <SelectItem value="remoto">Remoto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          )}
          {step === 2 && (
            <>
              <div>
                <Label htmlFor="desc">Descrição</Label>
                <Textarea
                  id="desc"
                  rows={4}
                  value={form.descricao}
                  onChange={(e) =>
                    setForm({ ...form, descricao: e.target.value })
                  }
                  placeholder="Descrição geral da vaga…"
                />
              </div>
              <div>
                <Label htmlFor="req">Requisitos</Label>
                <Textarea
                  id="req"
                  rows={4}
                  value={form.requisitos}
                  onChange={(e) =>
                    setForm({ ...form, requisitos: e.target.value })
                  }
                  placeholder="Skills obrigatórias, anos de experiência…"
                />
              </div>
            </>
          )}
          {step === 3 && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Salário mín.</Label>
                  <Input
                    type="number"
                    value={form.salarioMin}
                    onChange={(e) =>
                      setForm({ ...form, salarioMin: Number(e.target.value) })
                    }
                  />
                </div>
                <div>
                  <Label>Salário máx.</Label>
                  <Input
                    type="number"
                    value={form.salarioMax}
                    onChange={(e) =>
                      setForm({ ...form, salarioMax: Number(e.target.value) })
                    }
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="ben">Benefícios</Label>
                <Textarea
                  id="ben"
                  rows={3}
                  value={form.beneficios}
                  onChange={(e) =>
                    setForm({ ...form, beneficios: e.target.value })
                  }
                  placeholder="VR, VA, plano de saúde…"
                />
              </div>
              <p className="rounded-md border border-border bg-muted/30 p-2 text-[11px] text-muted-foreground">
                Faixa: <strong>{currencyFmt.format(form.salarioMin)}</strong> –{' '}
                <strong>{currencyFmt.format(form.salarioMax)}</strong>
              </p>
            </>
          )}
          {step === 4 && (
            <>
              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <p className="text-sm font-medium">
                    Triagem automática por IA
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Gera score IA automaticamente para cada candidato
                  </p>
                </div>
                <Switch
                  checked={form.triagemAuto}
                  onCheckedChange={(v) => setForm({ ...form, triagemAuto: v })}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <p className="text-sm font-medium">Match cultural</p>
                  <p className="text-[11px] text-muted-foreground">
                    Considerar fit cultural além de skills técnicas
                  </p>
                </div>
                <Switch
                  checked={form.matchCultural}
                  onCheckedChange={(v) =>
                    setForm({ ...form, matchCultural: v })
                  }
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <p className="text-sm font-medium">
                    Auto-rejeitar score &lt; 40
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Move automaticamente para rejeitados
                  </p>
                </div>
                <Switch
                  checked={form.rejeitarBaixoScore}
                  onCheckedChange={(v) =>
                    setForm({ ...form, rejeitarBaixoScore: v })
                  }
                />
              </div>
            </>
          )}
        </div>

        <SheetFooter className="mt-6 flex flex-row justify-between gap-2 sm:justify-between">
          <Button
            variant="outline"
            size="sm"
            disabled={step === 1}
            onClick={() => setStep((s) => Math.max(1, s - 1))}
          >
            Voltar
          </Button>
          {step < 4 ? (
            <Button
              size="sm"
              onClick={() => setStep((s) => Math.min(4, s + 1))}
            >
              Próximo
            </Button>
          ) : (
            <Button size="sm" onClick={handleCreate}>
              Publicar vaga
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

/* ------------------------------------------------------------------ */
/* Root                                                                */
/* ------------------------------------------------------------------ */

export default function RhRecrutamento() {
  return (
    <QueryClientProvider client={getLocalQueryClient()}>
      <RhRecrutamentoInner />
    </QueryClientProvider>
  );
}
