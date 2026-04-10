/**
 * FiltrosBar — Barra sticky de filtros super avançados de recrutamento.
 */
import { type Dispatch, type SetStateAction } from 'react';
import {
  Search,
  Filter,
  X,
  Download,
  LayoutGrid,
  LayoutList,
  Columns3,
  Sparkles,
  ArrowUpDown,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { Vaga } from '@/types/rh';

export type ViewMode = 'kanban' | 'list' | 'grid';
export type SortKey =
  | 'score_desc'
  | 'score_asc'
  | 'recent'
  | 'oldest'
  | 'exp_desc'
  | 'pretensao_asc';

export interface RecrutamentoFiltros {
  search: string;
  vagaId: string | null;
  departamento: string | null;
  nivel: string | null;
  modalidade: string | null;
  scoreMin: number;
  scoreMax: number;
  expMin: number;
  expMax: number;
  pretensaoMin: number;
  pretensaoMax: number;
  skills: string[];
  disponibilidade: string | null;
  onlyRecommended: boolean;
  sort: SortKey;
}

// eslint-disable-next-line react-refresh/only-export-components
export const defaultFiltros: RecrutamentoFiltros = {
  search: '',
  vagaId: null,
  departamento: null,
  nivel: null,
  modalidade: null,
  scoreMin: 0,
  scoreMax: 100,
  expMin: 0,
  expMax: 25,
  pretensaoMin: 0,
  pretensaoMax: 50000,
  skills: [],
  disponibilidade: null,
  onlyRecommended: false,
  sort: 'score_desc',
};

// eslint-disable-next-line react-refresh/only-export-components
export function countActiveFilters(f: RecrutamentoFiltros): number {
  let n = 0;
  if (f.search) n++;
  if (f.vagaId) n++;
  if (f.departamento) n++;
  if (f.nivel) n++;
  if (f.modalidade) n++;
  if (f.scoreMin > 0 || f.scoreMax < 100) n++;
  if (f.expMin > 0 || f.expMax < 25) n++;
  if (f.pretensaoMin > 0 || f.pretensaoMax < 50000) n++;
  if (f.skills.length > 0) n++;
  if (f.disponibilidade) n++;
  if (f.onlyRecommended) n++;
  return n;
}

const sortLabels: Record<SortKey, string> = {
  score_desc: 'Score IA ↓',
  score_asc: 'Score IA ↑',
  recent: 'Mais recentes',
  oldest: 'Mais antigos',
  exp_desc: 'Experiência ↓',
  pretensao_asc: 'Pretensão ↑',
};

export interface FiltrosBarProps {
  filtros: RecrutamentoFiltros;
  setFiltros: Dispatch<SetStateAction<RecrutamentoFiltros>>;
  vagas: Vaga[];
  allSkills: string[];
  allDepartamentos: string[];
  allDisponibilidades: string[];
  viewMode: ViewMode;
  setViewMode: (v: ViewMode) => void;
  totalFiltrado: number;
  totalGeral: number;
  onExport: () => void;
}

export const FiltrosBar = ({
  filtros,
  setFiltros,
  vagas,
  allSkills,
  allDepartamentos,
  allDisponibilidades,
  viewMode,
  setViewMode,
  totalFiltrado,
  totalGeral,
  onExport,
}: FiltrosBarProps) => {
  const activeCount = countActiveFilters(filtros);

  const toggleSkill = (s: string) => {
    setFiltros((prev) => ({
      ...prev,
      skills: prev.skills.includes(s)
        ? prev.skills.filter((x) => x !== s)
        : [...prev.skills, s],
    }));
  };

  return (
    <div className="sticky top-0 z-20 rounded-xl border border-border bg-card/95 p-3 shadow-sm backdrop-blur-md">
      <div className="flex flex-wrap items-center gap-2">
        {/* Busca */}
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, e-mail ou skill… (Ctrl+K)"
            value={filtros.search}
            onChange={(e) =>
              setFiltros((p) => ({ ...p, search: e.target.value }))
            }
            className="h-9 pl-8"
          />
          {filtros.search && (
            <button
              onClick={() => setFiltros((p) => ({ ...p, search: '' }))}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Limpar busca"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Vaga */}
        <Select
          value={filtros.vagaId ?? 'all'}
          onValueChange={(v) =>
            setFiltros((p) => ({ ...p, vagaId: v === 'all' ? null : v }))
          }
        >
          <SelectTrigger className="h-9 w-[180px]">
            <SelectValue placeholder="Vaga" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as vagas</SelectItem>
            {vagas.map((v) => (
              <SelectItem key={v.id} value={v.id}>
                {v.titulo} ({v.candidatosCount})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Departamento */}
        <Select
          value={filtros.departamento ?? 'all'}
          onValueChange={(v) =>
            setFiltros((p) => ({ ...p, departamento: v === 'all' ? null : v }))
          }
        >
          <SelectTrigger className="h-9 w-[150px]">
            <SelectValue placeholder="Depto." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os deptos</SelectItem>
            {allDepartamentos.map((d) => (
              <SelectItem key={d} value={d}>
                {d}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Nível */}
        <Select
          value={filtros.nivel ?? 'all'}
          onValueChange={(v) =>
            setFiltros((p) => ({ ...p, nivel: v === 'all' ? null : v }))
          }
        >
          <SelectTrigger className="h-9 w-[120px]">
            <SelectValue placeholder="Nível" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Nível</SelectItem>
            <SelectItem value="junior">Júnior</SelectItem>
            <SelectItem value="pleno">Pleno</SelectItem>
            <SelectItem value="senior">Sênior</SelectItem>
            <SelectItem value="lead">Lead</SelectItem>
          </SelectContent>
        </Select>

        {/* Modalidade */}
        <Select
          value={filtros.modalidade ?? 'all'}
          onValueChange={(v) =>
            setFiltros((p) => ({ ...p, modalidade: v === 'all' ? null : v }))
          }
        >
          <SelectTrigger className="h-9 w-[130px]">
            <SelectValue placeholder="Modalidade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Modalidade</SelectItem>
            <SelectItem value="presencial">Presencial</SelectItem>
            <SelectItem value="hibrido">Híbrido</SelectItem>
            <SelectItem value="remoto">Remoto</SelectItem>
          </SelectContent>
        </Select>

        {/* Disponibilidade */}
        <Select
          value={filtros.disponibilidade ?? 'all'}
          onValueChange={(v) =>
            setFiltros((p) => ({
              ...p,
              disponibilidade: v === 'all' ? null : v,
            }))
          }
        >
          <SelectTrigger className="h-9 w-[150px]">
            <SelectValue placeholder="Disponibilidade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Disponibilidade</SelectItem>
            {allDisponibilidades.map((d) => (
              <SelectItem key={d} value={d}>
                {d}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Filtros avançados dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 gap-1">
              <Filter className="h-3.5 w-3.5" />
              Avançado
              {activeCount > 0 && (
                <Badge className="ml-1 h-4 px-1 text-[9px]">
                  {activeCount}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-80" align="end">
            <DropdownMenuLabel>Filtros avançados</DropdownMenuLabel>
            <DropdownMenuSeparator />

            <div className="space-y-3 px-2 py-2">
              {/* Score IA range */}
              <div>
                <label className="text-[11px] font-medium text-muted-foreground">
                  Score IA: {filtros.scoreMin} – {filtros.scoreMax}
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={filtros.scoreMin}
                    onChange={(e) =>
                      setFiltros((p) => ({
                        ...p,
                        scoreMin: Number(e.target.value),
                      }))
                    }
                    className="h-8"
                  />
                  <span className="text-xs">–</span>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={filtros.scoreMax}
                    onChange={(e) =>
                      setFiltros((p) => ({
                        ...p,
                        scoreMax: Number(e.target.value),
                      }))
                    }
                    className="h-8"
                  />
                </div>
              </div>

              {/* Experiência */}
              <div>
                <label className="text-[11px] font-medium text-muted-foreground">
                  Experiência (anos): {filtros.expMin} – {filtros.expMax}
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    value={filtros.expMin}
                    onChange={(e) =>
                      setFiltros((p) => ({
                        ...p,
                        expMin: Number(e.target.value),
                      }))
                    }
                    className="h-8"
                  />
                  <span className="text-xs">–</span>
                  <Input
                    type="number"
                    min={0}
                    value={filtros.expMax}
                    onChange={(e) =>
                      setFiltros((p) => ({
                        ...p,
                        expMax: Number(e.target.value),
                      }))
                    }
                    className="h-8"
                  />
                </div>
              </div>

              {/* Pretensão */}
              <div>
                <span className="text-[11px] font-medium text-muted-foreground">
                  Pretensão (R$)
                </span>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    step={500}
                    value={filtros.pretensaoMin}
                    onChange={(e) =>
                      setFiltros((p) => ({
                        ...p,
                        pretensaoMin: Number(e.target.value),
                      }))
                    }
                    className="h-8"
                  />
                  <span className="text-xs">–</span>
                  <Input
                    type="number"
                    min={0}
                    step={500}
                    value={filtros.pretensaoMax}
                    onChange={(e) =>
                      setFiltros((p) => ({
                        ...p,
                        pretensaoMax: Number(e.target.value),
                      }))
                    }
                    className="h-8"
                  />
                </div>
              </div>

              {/* Skills multi */}
              <div>
                <label className="text-[11px] font-medium text-muted-foreground">
                  Skills ({filtros.skills.length})
                </label>
                <div className="mt-1 flex max-h-32 flex-wrap gap-1 overflow-y-auto rounded border border-border p-1.5">
                  {allSkills.map((s) => {
                    const active = filtros.skills.includes(s);
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => toggleSkill(s)}
                        className={cn(
                          'rounded-full px-2 py-0.5 text-[10px] font-medium transition',
                          active
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        )}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Match IA toggle */}
        <Button
          size="sm"
          variant={filtros.onlyRecommended ? 'default' : 'outline'}
          onClick={() =>
            setFiltros((p) => ({ ...p, onlyRecommended: !p.onlyRecommended }))
          }
          className="h-9 gap-1"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Matchs IA
        </Button>

        {/* Ordenação */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 gap-1">
              <ArrowUpDown className="h-3.5 w-3.5" />
              {sortLabels[filtros.sort]}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {(Object.keys(sortLabels) as SortKey[]).map((k) => (
              <DropdownMenuCheckboxItem
                key={k}
                checked={filtros.sort === k}
                onCheckedChange={() => setFiltros((p) => ({ ...p, sort: k }))}
              >
                {sortLabels[k]}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* View mode switcher */}
        <div className="flex items-center overflow-hidden rounded-md border border-border">
          <Button
            size="sm"
            variant={viewMode === 'kanban' ? 'secondary' : 'ghost'}
            className="h-9 rounded-none border-none"
            onClick={() => setViewMode('kanban')}
            title="Kanban"
          >
            <Columns3 className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            className="h-9 rounded-none border-none"
            onClick={() => setViewMode('list')}
            title="Lista"
          >
            <LayoutList className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
            className="h-9 rounded-none border-none"
            onClick={() => setViewMode('grid')}
            title="Cards"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Exportar */}
        <Button
          size="sm"
          variant="outline"
          className="h-9 gap-1"
          onClick={onExport}
        >
          <Download className="h-3.5 w-3.5" />
          Exportar
        </Button>

        {/* Clear */}
        {activeCount > 0 && (
          <Button
            size="sm"
            variant="ghost"
            className="h-9 gap-1 text-muted-foreground"
            onClick={() => setFiltros(defaultFiltros)}
          >
            <X className="h-3.5 w-3.5" />
            Limpar ({activeCount})
          </Button>
        )}
      </div>

      {/* Contador resultado */}
      <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
        <span>
          Mostrando{' '}
          <span className="font-semibold text-foreground">{totalFiltrado}</span>{' '}
          de {totalGeral} candidatos
        </span>
        {filtros.skills.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {filtros.skills.map((s) => (
              <Badge
                key={s}
                variant="secondary"
                className="gap-1 px-1.5 py-0 text-[10px]"
              >
                {s}
                <button
                  onClick={() => toggleSkill(s)}
                  className="hover:text-destructive"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
