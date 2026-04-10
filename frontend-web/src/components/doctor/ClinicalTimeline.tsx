/**
 * ClinicalTimeline — Timeline vertical de eventos clínicos do paciente.
 *
 * Substitui listas flat (consultas, exames, receitas) por uma visualização
 * cronológica agrupada por mês, com linha vertical contínua conectando os
 * markers. O médico vê a evolução temporal do paciente de relance, sem
 * precisar reconstruir a timeline mentalmente de uma lista plana.
 *
 * Design pattern inspirado em EHRs modernos (Epic, Cerner): eixo Y = tempo,
 * eventos alinhados à direita, cabeçalho de mês com marker colorido distinto
 * dos markers individuais.
 *
 * Uso genérico: recebe qualquer MedicalRequest[] (consultas, exames, receitas
 * ou mix) — o agrupamento e ordenação são feitos internamente.
 */
import type { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { ChevronRight, Clock } from 'lucide-react';
import type { MedicalRequest } from '@/services/doctorApi';
import { getTypeIcon, getTypeLabel, getStatusInfo } from '@/lib/doctor-helpers';

interface ClinicalTimelineProps {
  items: MedicalRequest[];
  onItemClick?: (id: string) => void;
  emptyLabel?: string;
  emptyIcon?: ReactNode;
}

type MonthGroup = {
  key: string;
  label: string;
  items: MedicalRequest[];
};

function groupByMonth(items: MedicalRequest[]): MonthGroup[] {
  const groups = new Map<string, MonthGroup>();
  const monthFormatter = new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
  });

  for (const item of items) {
    const date = new Date(item.createdAt);
    const key = `${date.getFullYear()}-${String(date.getMonth()).padStart(2, '0')}`;
    const rawLabel = monthFormatter.format(date);
    // Capitaliza: "março de 2026" → "Março de 2026"
    const label = rawLabel.charAt(0).toUpperCase() + rawLabel.slice(1);
    if (!groups.has(key)) {
      groups.set(key, { key, label, items: [] });
    }
    groups.get(key)!.items.push(item);
  }

  // Grupos ordenados do mês mais recente para o mais antigo.
  return Array.from(groups.values()).sort((a, b) => (a.key < b.key ? 1 : -1));
}

export function ClinicalTimeline({
  items,
  onItemClick,
  emptyLabel = 'Nenhum evento registrado',
  emptyIcon,
}: ClinicalTimelineProps) {
  if (items.length === 0) {
    return (
      <Card className="shadow-sm">
        <CardContent className="py-12 text-center">
          {emptyIcon}
          <p className="mt-2 text-sm text-muted-foreground">{emptyLabel}</p>
        </CardContent>
      </Card>
    );
  }

  // Ordem descendente por data (mais recente primeiro)
  const sorted = [...items].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const groups = groupByMonth(sorted);

  return (
    <div className="relative pl-10">
      {/* Espinha vertical da timeline: um gradient sutil que fade no final */}
      <div
        className="absolute bottom-2 left-[15px] top-2 w-px bg-gradient-to-b from-border via-border to-transparent"
        aria-hidden
      />

      {groups.map((group, gi) => (
        <div key={group.key} className={gi > 0 ? 'mt-6' : ''}>
          {/* Cabeçalho do mês: marker colorido maior que os markers de item */}
          <div className="relative mb-3">
            <div
              className="absolute -left-10 top-0 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow"
              aria-hidden
            >
              <Clock className="h-3 w-3" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {group.label}
            </p>
          </div>

          {/* Items do mês */}
          <div className="space-y-2">
            {group.items.map((item, i) => {
              const reqType =
                item.type ||
                (item as { requestType?: string }).requestType ||
                '';
              const TypeIcon = getTypeIcon(reqType);
              const statusInfo = getStatusInfo(item.status);
              const date = new Date(item.createdAt);

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(i * 0.03, 0.3) }}
                  className="relative"
                >
                  {/* Marker do item: círculo pequeno neutro */}
                  <div
                    className="absolute -left-[28px] top-4 h-2 w-2 rounded-full border-2 border-background bg-muted-foreground"
                    aria-hidden
                  />

                  <Card
                    onClick={() => onItemClick?.(item.id)}
                    className="group cursor-pointer shadow-sm transition-all hover:shadow-md"
                  >
                    <CardContent className="flex items-center gap-3 p-3 sm:gap-4 sm:p-4">
                      <div className="shrink-0 rounded-xl bg-muted p-2 sm:p-2.5">
                        <TypeIcon className="h-4 w-4 text-muted-foreground sm:h-5 sm:w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {getTypeLabel(reqType)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {date.toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                          {' · '}
                          {date.toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                      <Badge
                        variant={statusInfo.variant}
                        className={`shrink-0 border text-[10px] ${statusInfo.color} ${statusInfo.bgColor}`}
                      >
                        {statusInfo.label}
                      </Badge>
                      <ChevronRight
                        className="hidden h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 sm:block"
                        aria-hidden
                      />
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
