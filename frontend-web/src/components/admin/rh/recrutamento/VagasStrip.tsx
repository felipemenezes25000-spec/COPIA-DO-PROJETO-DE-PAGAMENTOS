/**
 * VagasStrip — Strip horizontal scrollável com cards de vagas.
 */
import { motion } from 'framer-motion';
import { Briefcase, Users, Clock, MapPin, LayoutGrid } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Vaga, VagaStatus } from '@/types/rh';

const currencyFmt = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
});

const statusTone: Record<VagaStatus, string> = {
  aberta:
    'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
  pausada:
    'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
  fechada:
    'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30',
};

const nivelLabel: Record<Vaga['nivel'], string> = {
  junior: 'Júnior',
  pleno: 'Pleno',
  senior: 'Sênior',
  lead: 'Lead',
};

const modalidadeLabel: Record<Vaga['modalidade'], string> = {
  presencial: 'Presencial',
  hibrido: 'Híbrido',
  remoto: 'Remoto',
};

export interface VagasStripProps {
  vagas: Vaga[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  totalCandidatos: number;
}

export const VagasStrip = ({
  vagas,
  selectedId,
  onSelect,
  totalCandidatos,
}: VagasStripProps) => {
  return (
    <div className="relative">
      <div className="scrollbar-thin flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 pr-2">
        {/* Card "todas" */}
        <motion.button
          layout
          onClick={() => onSelect(null)}
          className={cn(
            'group relative min-w-[200px] shrink-0 snap-start rounded-xl border p-3 text-left transition',
            selectedId === null
              ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary/30'
              : 'border-border bg-card hover:border-primary/40 hover:shadow-sm'
          )}
        >
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-primary/10 p-1.5 text-primary">
              <LayoutGrid className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold leading-tight">
                Todas as vagas
              </p>
              <p className="text-[10px] text-muted-foreground">
                Visão consolidada
              </p>
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="text-2xl font-bold tabular-nums">
              {totalCandidatos}
            </span>
            <span className="text-[10px] text-muted-foreground">
              candidatos
            </span>
          </div>
        </motion.button>

        {vagas.map((v, i) => {
          const selected = selectedId === v.id;
          const urgente = v.diasAberta > 45;
          return (
            <motion.button
              key={v.id}
              layout
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => onSelect(v.id)}
              className={cn(
                'group relative min-w-[260px] shrink-0 snap-start rounded-xl border p-3 text-left transition',
                selected
                  ? 'border-primary bg-primary/5 shadow-md ring-1 ring-primary/30'
                  : 'border-border bg-card hover:border-primary/40 hover:shadow-sm'
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="flex items-center gap-1 truncate text-sm font-semibold leading-tight">
                    <Briefcase className="h-3.5 w-3.5 shrink-0 text-primary" />
                    {v.titulo}
                  </p>
                  <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                    {v.departamento}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    'shrink-0 text-[9px] uppercase',
                    statusTone[v.status]
                  )}
                >
                  {v.status}
                </Badge>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-1 text-[10px]">
                <Badge variant="secondary" className="px-1.5 py-0 font-normal">
                  {nivelLabel[v.nivel]}
                </Badge>
                <Badge variant="secondary" className="px-1.5 py-0 font-normal">
                  <MapPin className="mr-0.5 h-2.5 w-2.5" />
                  {modalidadeLabel[v.modalidade]}
                </Badge>
              </div>

              <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  <span className="font-semibold text-foreground">
                    {v.candidatosCount}
                  </span>{' '}
                  candidatos
                </span>
                <span
                  className={cn(
                    'flex items-center gap-1',
                    urgente && 'font-semibold text-rose-600 dark:text-rose-400'
                  )}
                >
                  <Clock className="h-3 w-3" />
                  {v.diasAberta}d aberta
                </span>
              </div>

              <div className="mt-2 text-[10px] text-muted-foreground">
                <span className="font-medium text-foreground">
                  {currencyFmt.format(v.salarioMin)}
                </span>
                {' – '}
                <span className="font-medium text-foreground">
                  {currencyFmt.format(v.salarioMax)}
                </span>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};
