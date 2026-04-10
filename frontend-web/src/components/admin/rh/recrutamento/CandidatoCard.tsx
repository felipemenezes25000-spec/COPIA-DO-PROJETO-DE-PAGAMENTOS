/**
 * CandidatoCard — Card rico e arrastável de candidato para Kanban / Grid.
 */
import type { DragEvent, MouseEvent } from 'react';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  GripVertical,
  Mail,
  Phone,
  Linkedin,
  Eye,
  Briefcase,
  Clock,
  Sparkles,
} from 'lucide-react';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

import type { Candidato, Vaga } from '@/types/rh';
import { scoreColor } from './ScoreIaRing';

const currencyFmt = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
});

function iniciais(nome: string): string {
  return nome
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

export interface CandidatoCardProps {
  candidato: Candidato;
  vaga?: Vaga;
  onOpen: (c: Candidato) => void;
  onDragStart?: (id: string) => void;
  onDragEnd?: () => void;
  isDragging?: boolean;
  variant?: 'kanban' | 'grid';
}

export const CandidatoCard = ({
  candidato,
  vaga,
  onOpen,
  onDragStart,
  onDragEnd,
  isDragging,
  variant = 'kanban',
}: CandidatoCardProps) => {
  const colors = scoreColor(candidato.scoreIa);
  const isRecommended = candidato.scoreIa >= 80;

  const handleDragStart = (e: DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData('text/plain', candidato.id);
    e.dataTransfer.effectAllowed = 'move';
    onDragStart?.(candidato.id);
  };

  const stop = (e: MouseEvent) => e.stopPropagation();

  const visibleSkills = candidato.skills.slice(0, 3);
  const extraSkills = Math.max(0, candidato.skills.length - 3);

  return (
    <motion.div
      layout
      draggable
      onDragStart={handleDragStart as unknown as undefined}
      onDragEnd={onDragEnd as unknown as undefined}
      onClick={() => onOpen(candidato)}
      whileHover={{ y: -2 }}
      className={cn(
        'group relative cursor-grab select-none rounded-xl border border-border bg-card p-3 shadow-sm transition',
        'hover:border-primary/40 hover:shadow-md active:cursor-grabbing',
        isDragging && 'scale-[0.98] opacity-40',
        variant === 'grid' && 'p-4'
      )}
    >
      {isRecommended && (
        <div className="absolute -right-1.5 -top-1.5 rounded-full bg-emerald-500 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white shadow">
          <Sparkles className="inline h-2.5 w-2.5" /> IA
        </div>
      )}

      {/* Header: grip + avatar + nome */}
      <div className="flex items-start gap-2">
        <GripVertical className="mt-1 h-4 w-4 shrink-0 text-muted-foreground/40 group-hover:text-muted-foreground" />
        <Avatar className="h-9 w-9 shrink-0 border">
          <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
            {iniciais(candidato.nome)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold leading-tight">
            {candidato.nome}
          </p>
          <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-muted-foreground">
            <Briefcase className="h-3 w-3" />
            {vaga?.titulo ?? 'Sem vaga'}
          </p>
        </div>
      </div>

      {/* Score IA */}
      <div className="mt-3 space-y-1">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-muted-foreground">Score IA</span>
          <span className={cn('font-bold tabular-nums', colors.text)}>
            {Math.round(candidato.scoreIa)}
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${candidato.scoreIa}%` }}
            transition={{ duration: 0.6 }}
            className={cn('h-full rounded-full', colors.bg)}
          />
        </div>
      </div>

      {/* Skills */}
      <div className="mt-2 flex flex-wrap gap-1">
        {visibleSkills.map((s) => (
          <Badge
            key={s}
            variant="secondary"
            className="px-1.5 py-0 text-[10px] font-normal"
          >
            {s}
          </Badge>
        ))}
        {extraSkills > 0 && (
          <Badge
            variant="outline"
            className="px-1.5 py-0 text-[10px] font-normal"
          >
            +{extraSkills}
          </Badge>
        )}
      </div>

      {/* Infos: exp + pretensão */}
      <div className="mt-2 grid grid-cols-2 gap-1 text-[10px] text-muted-foreground">
        <div>
          <span className="block text-[9px] uppercase tracking-wider">Exp</span>
          <span className="font-medium text-foreground">
            {candidato.experienciaAnos}a
          </span>
        </div>
        <div>
          <span className="block text-[9px] uppercase tracking-wider">
            Pretensão
          </span>
          <span className="font-medium text-foreground">
            {currencyFmt.format(candidato.pretensaoSalarial)}
          </span>
        </div>
      </div>

      {/* Disponibilidade + tempo */}
      <div className="mt-2 flex items-center justify-between text-[10px]">
        <Badge variant="outline" className="px-1.5 py-0 font-normal">
          {candidato.disponibilidade}
        </Badge>
        <span className="flex items-center gap-0.5 text-muted-foreground">
          <Clock className="h-2.5 w-2.5" />
          {formatDistanceToNow(new Date(candidato.createdAt), {
            locale: ptBR,
            addSuffix: false,
          })}
        </span>
      </div>

      {/* Quick actions */}
      <div className="mt-2 flex items-center gap-0.5 border-t border-border/50 pt-2 opacity-0 transition group-hover:opacity-100">
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6"
                onClick={(e) => {
                  stop(e);
                  window.location.href = `mailto:${candidato.email}`;
                }}
              >
                <Mail className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>E-mail</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6"
                onClick={stop}
              >
                <Phone className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Ligar</TooltipContent>
          </Tooltip>
          {candidato.linkedin && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6"
                  onClick={(e) => {
                    stop(e);
                    window.open(candidato.linkedin, '_blank');
                  }}
                >
                  <Linkedin className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>LinkedIn</TooltipContent>
            </Tooltip>
          )}
          <div className="ml-auto">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6"
                  onClick={(e) => {
                    stop(e);
                    onOpen(candidato);
                  }}
                >
                  <Eye className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Ver detalhes</TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      </div>
    </motion.div>
  );
};
