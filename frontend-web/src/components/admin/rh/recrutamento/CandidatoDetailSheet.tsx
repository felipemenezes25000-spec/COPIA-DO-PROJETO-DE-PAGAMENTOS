/**
 * CandidatoDetailSheet — Drawer lateral com perfil rico do candidato.
 * Tabs: Visão Geral | Análise IA | Currículo | Histórico | Entrevistas | Comunicação.
 */
import { useMemo } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Mail,
  Phone,
  Linkedin,
  Calendar,
  Printer,
  Download,
  MessageCircle,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  GraduationCap,
  Briefcase,
  ChevronRight,
} from 'lucide-react';

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

import type { Candidato, CandidatoEtapa, Vaga } from '@/types/rh';
import { ScoreIaRing, scoreColor } from './ScoreIaRing';
import { SkillMatchBar } from './SkillMatchBar';
import { ETAPAS } from './KanbanColumn';

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

export interface CandidatoDetailSheetProps {
  candidato: Candidato | null;
  vaga?: Vaga;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMoveEtapa: (id: string, etapa: CandidatoEtapa) => void;
  onReject: (id: string) => void;
}

export const CandidatoDetailSheet = ({
  candidato,
  vaga,
  open,
  onOpenChange,
  onMoveEtapa,
  onReject,
}: CandidatoDetailSheetProps) => {
  const etapaMeta = useMemo(
    () => ETAPAS.find((e) => e.key === candidato?.etapa),
    [candidato?.etapa]
  );

  // Histórico mock determinístico
  const historico = useMemo(() => {
    if (!candidato) return [];
    const base = new Date(candidato.createdAt).getTime();
    return [
      { etapa: 'Inscrição recebida', data: new Date(base), icon: FileText },
      {
        etapa: 'Triagem automática IA',
        data: new Date(base + 1000 * 60 * 60 * 2),
        icon: Sparkles,
      },
      {
        etapa: etapaMeta?.label ?? 'Pipeline',
        data: new Date(base + 1000 * 60 * 60 * 26),
        icon: ChevronRight,
      },
    ];
  }, [candidato, etapaMeta]);

  if (!candidato) return null;

  const colors = scoreColor(candidato.scoreIa);
  const skillMatches = candidato.skills.map((s, i) => ({
    skill: s,
    // determinístico baseado no char code
    match: Math.min(
      100,
      Math.max(
        45,
        (s.charCodeAt(0) + i * 7 + Math.round(candidato.scoreIa / 2)) % 100
      )
    ),
  }));

  const culturalFit = Math.min(100, Math.round(candidato.scoreIa * 0.92));
  const pontosFortes = [
    `${candidato.experienciaAnos} anos de experiência relevante`,
    `Stack alinhada: ${candidato.skills.slice(0, 3).join(', ')}`,
    candidato.scoreIa >= 85
      ? 'Score IA excelente — candidato destaque'
      : 'Perfil técnico consistente',
    'Disponibilidade imediata para entrevistas',
  ];
  const pontosAtencao =
    candidato.scoreIa < 70
      ? [
          'Score IA abaixo da média — revisar cuidadosamente',
          'Algumas skills-chave ausentes',
        ]
      : [
          candidato.pretensaoSalarial > (vaga?.salarioMax ?? Infinity)
            ? 'Pretensão acima da faixa salarial da vaga'
            : 'Pretensão dentro da faixa',
          'Verificar referências profissionais',
        ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader className="space-y-0 pb-2 text-left">
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16 border-2 border-primary/30">
              <AvatarFallback className="bg-primary/10 text-lg font-bold text-primary">
                {iniciais(candidato.nome)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <SheetTitle className="text-xl">{candidato.nome}</SheetTitle>
              <SheetDescription className="flex items-center gap-1">
                <Briefcase className="h-3.5 w-3.5" />
                {vaga?.titulo ?? 'Sem vaga'}
                {vaga && (
                  <>
                    <span className="mx-1">·</span>
                    <span>{vaga.departamento}</span>
                  </>
                )}
              </SheetDescription>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {etapaMeta && (
                  <Badge
                    variant="outline"
                    className={cn('text-[10px]', etapaMeta.color)}
                  >
                    <span
                      className={cn(
                        'mr-1 h-1.5 w-1.5 rounded-full',
                        etapaMeta.dot
                      )}
                    />
                    {etapaMeta.label}
                  </Badge>
                )}
                <Badge
                  variant="outline"
                  className={cn('text-[10px] font-bold', colors.text)}
                >
                  <Sparkles className="mr-1 h-2.5 w-2.5" />
                  Score IA {Math.round(candidato.scoreIa)}
                </Badge>
                <Badge variant="secondary" className="text-[10px]">
                  {candidato.experienciaAnos} anos exp
                </Badge>
                <Badge variant="secondary" className="text-[10px]">
                  {currencyFmt.format(candidato.pretensaoSalarial)}
                </Badge>
              </div>
            </div>
          </div>

          {/* Ações topo */}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              size="sm"
              className="gap-1"
              onClick={() =>
                (window.location.href = `mailto:${candidato.email}`)
              }
            >
              <Mail className="h-3.5 w-3.5" />
              Contato
            </Button>
            <Button size="sm" variant="outline" className="gap-1">
              <Calendar className="h-3.5 w-3.5" />
              Agendar entrevista
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" className="gap-1">
                  Mover etapa
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Mover para</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {ETAPAS.filter((e) => e.key !== 'rejeitado').map((e) => (
                  <DropdownMenuItem
                    key={e.key}
                    onClick={() => onMoveEtapa(candidato.id, e.key)}
                    disabled={candidato.etapa === e.key}
                  >
                    <span className={cn('mr-2 h-2 w-2 rounded-full', e.dot)} />
                    {e.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              size="sm"
              variant="outline"
              className="gap-1 text-destructive"
              onClick={() => onReject(candidato.id)}
              disabled={candidato.etapa === 'rejeitado'}
            >
              Rejeitar
            </Button>
            <Button size="sm" variant="ghost" className="gap-1">
              <Printer className="h-3.5 w-3.5" />
              Imprimir
            </Button>
          </div>
        </SheetHeader>

        <Separator className="my-4" />

        <Tabs defaultValue="overview">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">Visão</TabsTrigger>
            <TabsTrigger value="ai">Análise IA</TabsTrigger>
            <TabsTrigger value="cv">CV</TabsTrigger>
            <TabsTrigger value="history">Histórico</TabsTrigger>
            <TabsTrigger value="interviews">Entrevistas</TabsTrigger>
            <TabsTrigger value="comm">Mensagens</TabsTrigger>
          </TabsList>

          {/* OVERVIEW */}
          <TabsContent value="overview" className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-3 rounded-lg border border-border p-3 text-sm">
              <div>
                <p className="text-[11px] uppercase text-muted-foreground">
                  E-mail
                </p>
                <p className="flex items-center gap-1 font-medium">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                  {candidato.email}
                </p>
              </div>
              <div>
                <p className="text-[11px] uppercase text-muted-foreground">
                  Telefone
                </p>
                <p className="flex items-center gap-1 font-medium">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                  (11) 9xxxx-xxxx
                </p>
              </div>
              {candidato.linkedin && (
                <div className="col-span-2">
                  <p className="text-[11px] uppercase text-muted-foreground">
                    LinkedIn
                  </p>
                  <a
                    href={candidato.linkedin}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 font-medium text-primary hover:underline"
                  >
                    <Linkedin className="h-3.5 w-3.5" />
                    {candidato.linkedin}
                  </a>
                </div>
              )}
              <div>
                <p className="text-[11px] uppercase text-muted-foreground">
                  Experiência
                </p>
                <p className="font-medium">{candidato.experienciaAnos} anos</p>
              </div>
              <div>
                <p className="text-[11px] uppercase text-muted-foreground">
                  Pretensão
                </p>
                <p className="font-medium">
                  {currencyFmt.format(candidato.pretensaoSalarial)}
                </p>
              </div>
              <div>
                <p className="text-[11px] uppercase text-muted-foreground">
                  Disponibilidade
                </p>
                <p className="font-medium">{candidato.disponibilidade}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase text-muted-foreground">
                  Aplicou em
                </p>
                <p className="font-medium">
                  {format(new Date(candidato.createdAt), 'dd MMM yyyy', {
                    locale: ptBR,
                  })}
                </p>
              </div>
            </div>

            <div>
              <h4 className="mb-2 flex items-center gap-1 text-sm font-semibold">
                <GraduationCap className="h-4 w-4" /> Formação
              </h4>
              <div className="rounded-lg border border-border p-3 text-xs text-muted-foreground">
                Bacharelado em Sistemas de Informação — USP (2015–2019)
                <br />
                Pós-graduação em Engenharia de Software — FIAP (2021)
              </div>
            </div>

            <div>
              <h4 className="mb-2 flex items-center gap-1 text-sm font-semibold">
                <Briefcase className="h-4 w-4" /> Experiência recente
              </h4>
              <div className="space-y-2">
                {[0, 1].map((i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-border p-3 text-xs"
                  >
                    <p className="font-semibold">
                      Desenvolvedor{' '}
                      {candidato.experienciaAnos >= 5 ? 'Sênior' : 'Pleno'}
                    </p>
                    <p className="text-muted-foreground">
                      Empresa {i === 0 ? 'Atual' : 'Anterior'} · 2022 – 2025
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="mb-2 text-sm font-semibold">
                Skills ({candidato.skills.length})
              </h4>
              <div className="flex flex-wrap gap-1">
                {candidato.skills.map((s) => (
                  <Badge key={s} variant="secondary">
                    {s}
                  </Badge>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* AI */}
          <TabsContent value="ai" className="mt-4 space-y-4">
            <div className="flex items-start gap-4 rounded-lg border border-primary/20 bg-primary/5 p-4">
              <ScoreIaRing value={candidato.scoreIa} size={110} />
              <div className="flex-1">
                <div className="flex items-center gap-1 text-sm font-semibold">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Resumo gerado por IA
                </div>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {candidato.resumoIa}
                </p>
                <div className="mt-3 space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">
                      Match cultural
                    </span>
                    <span className="font-bold tabular-nums">
                      {culturalFit}%
                    </span>
                  </div>
                  <Progress value={culturalFit} className="h-1.5" />
                </div>
              </div>
            </div>

            <div>
              <h4 className="mb-2 text-sm font-semibold">Match por skill</h4>
              <div className="space-y-2 rounded-lg border border-border p-3">
                {skillMatches.map((s) => (
                  <SkillMatchBar
                    key={s.skill}
                    skill={s.skill}
                    match={s.match}
                  />
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
                <h5 className="mb-2 flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Pontos fortes
                </h5>
                <ul className="space-y-1 text-[11px] text-foreground">
                  {pontosFortes.map((p, i) => (
                    <li key={i} className="flex items-start gap-1">
                      <span className="mt-0.5 h-1 w-1 shrink-0 rounded-full bg-emerald-500" />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                <h5 className="mb-2 flex items-center gap-1 text-xs font-semibold text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Pontos de atenção
                </h5>
                <ul className="space-y-1 text-[11px] text-foreground">
                  {pontosAtencao.map((p, i) => (
                    <li key={i} className="flex items-start gap-1">
                      <span className="mt-0.5 h-1 w-1 shrink-0 rounded-full bg-amber-500" />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </TabsContent>

          {/* CV */}
          <TabsContent value="cv" className="mt-4 space-y-3">
            <div className="flex h-64 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/20">
              <FileText className="h-12 w-12 text-muted-foreground/50" />
              <p className="text-xs text-muted-foreground">
                Preview do currículo PDF
              </p>
              <Button size="sm" variant="outline" className="gap-1">
                <Download className="h-3.5 w-3.5" />
                Download CV
              </Button>
            </div>
          </TabsContent>

          {/* HISTORICO */}
          <TabsContent value="history" className="mt-4">
            <div className="relative space-y-4 pl-5">
              <span className="absolute left-2 top-0 h-full w-px bg-border" />
              {historico.map((h, i) => {
                const Icon = h.icon;
                return (
                  <div key={i} className="relative">
                    <span className="absolute -left-5 top-0 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Icon className="h-2.5 w-2.5" />
                    </span>
                    <p className="text-xs font-semibold">{h.etapa}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {format(h.data, "dd MMM yyyy 'às' HH:mm", {
                        locale: ptBR,
                      })}
                      {' · '}
                      {formatDistanceToNow(h.data, {
                        locale: ptBR,
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                );
              })}
            </div>
          </TabsContent>

          {/* ENTREVISTAS */}
          <TabsContent value="interviews" className="mt-4 space-y-3">
            <div className="rounded-lg border border-border p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold">Entrevista técnica</p>
                  <p className="text-[10px] text-muted-foreground">
                    Pendente de agendamento
                  </p>
                </div>
                <Button size="sm" variant="outline" className="gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  Agendar
                </Button>
              </div>
            </div>
            <div className="rounded-lg border border-dashed border-border p-3 text-center text-[11px] text-muted-foreground">
              Nenhuma entrevista realizada ainda.
            </div>
          </TabsContent>

          {/* COMUNICAÇÃO */}
          <TabsContent value="comm" className="mt-4 space-y-3">
            <div className="rounded-lg border border-border p-3">
              <p className="text-[10px] font-semibold uppercase text-muted-foreground">
                Enviado há 2 dias
              </p>
              <p className="mt-1 text-xs">
                Olá {candidato.nome.split(' ')[0]}, obrigado pelo seu interesse
                na vaga de {vaga?.titulo ?? '—'}. Gostaríamos de seguir com você
                para próxima etapa.
              </p>
            </div>
            <Button size="sm" variant="outline" className="w-full gap-1">
              <MessageCircle className="h-3.5 w-3.5" />
              Nova mensagem
            </Button>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
};
