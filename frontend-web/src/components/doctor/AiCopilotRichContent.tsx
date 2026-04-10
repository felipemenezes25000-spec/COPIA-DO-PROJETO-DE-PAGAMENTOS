/**
 * AiCopilotRichContent — Renderer enriquecido para o resumo do Copiloto IA.
 *
 * Pega o texto bruto do `aiSummaryForDoctor` (que hoje é um blob de string,
 * não JSON estruturado) e:
 *
 *   1. Roda parseAiSummaryIntoSections para agrupar o conteúdo em seções
 *      semânticas (Medicamentos, Exames, Conduta, Diagnóstico, Alertas...).
 *   2. Renderiza cada seção com ícone próprio, cor diferenciada e layout
 *      apropriado (lista para medicamentos/exames, texto para anamnese).
 *   3. Destaca linhas com palavras-chave de risco (alergia, contraindicação,
 *      interação) em vermelho, com ícone de alerta inline.
 *   4. Cada seção é collapsible individualmente, e cada linha tem um botão
 *      "Copiar" discreto para o médico capturar só o trecho que interessa.
 *
 * Substitui o antigo renderer que cuspia um `<p>` de texto puro. O contrato
 * com o backend é o MESMO — não exige nenhuma mudança de DTO. Se no futuro
 * o backend passar a retornar JSON estruturado, basta trocar esse renderer
 * por um que consuma o JSON diretamente; o parser por regex fica como
 * fallback gracioso para dados antigos.
 */
import { useMemo, useState } from 'react';
import {
  parseAiSummaryIntoSections,
  type SectionKind,
  type AiSummarySection,
  type AiSummaryLine,
} from '@/lib/parseAiSummary';
import {
  Pill,
  FlaskConical,
  Stethoscope,
  ClipboardList,
  AlertTriangle,
  FileText,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface SectionStyle {
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  accentBorder: string;
  headerColor: string;
}

const SECTION_STYLES: Record<SectionKind, SectionStyle> = {
  medications: {
    icon: Pill,
    iconBg: 'bg-emerald-100 dark:bg-emerald-950/40',
    iconColor: 'text-emerald-700 dark:text-emerald-300',
    accentBorder: 'border-l-emerald-400',
    headerColor: 'text-emerald-800 dark:text-emerald-200',
  },
  exams: {
    icon: FlaskConical,
    iconBg: 'bg-sky-100 dark:bg-sky-950/40',
    iconColor: 'text-sky-700 dark:text-sky-300',
    accentBorder: 'border-l-sky-400',
    headerColor: 'text-sky-800 dark:text-sky-200',
  },
  diagnosis: {
    icon: Stethoscope,
    iconBg: 'bg-violet-100 dark:bg-violet-950/40',
    iconColor: 'text-violet-700 dark:text-violet-300',
    accentBorder: 'border-l-violet-400',
    headerColor: 'text-violet-800 dark:text-violet-200',
  },
  conduct: {
    icon: ClipboardList,
    iconBg: 'bg-amber-100 dark:bg-amber-950/40',
    iconColor: 'text-amber-700 dark:text-amber-300',
    accentBorder: 'border-l-amber-400',
    headerColor: 'text-amber-800 dark:text-amber-200',
  },
  warnings: {
    icon: AlertTriangle,
    iconBg: 'bg-red-100 dark:bg-red-950/40',
    iconColor: 'text-red-700 dark:text-red-300',
    accentBorder: 'border-l-red-500',
    headerColor: 'text-red-800 dark:text-red-200',
  },
  anamnesis: {
    icon: FileText,
    iconBg: 'bg-slate-100 dark:bg-slate-800',
    iconColor: 'text-slate-700 dark:text-slate-300',
    accentBorder: 'border-l-slate-400',
    headerColor: 'text-slate-800 dark:text-slate-200',
  },
  other: {
    icon: FileText,
    iconBg: 'bg-slate-100 dark:bg-slate-800',
    iconColor: 'text-slate-700 dark:text-slate-300',
    accentBorder: 'border-l-slate-300',
    headerColor: 'text-slate-800 dark:text-slate-200',
  },
};

interface AiCopilotRichContentProps {
  summaryText: string | null | undefined;
  /** Quantas seções manter abertas por padrão. Resto colapsado. */
  defaultOpenCount?: number;
  className?: string;
}

export function AiCopilotRichContent({
  summaryText,
  defaultOpenCount = 3,
  className,
}: AiCopilotRichContentProps) {
  const sections = useMemo(
    () => parseAiSummaryIntoSections(summaryText ?? null),
    [summaryText]
  );

  // Sections abertas por índice. Inicialmente: as primeiras defaultOpenCount
  // ficam abertas, exceto 'warnings' que SEMPRE fica aberta (safety-first).
  const [openSections, setOpenSections] = useState<Set<number>>(() => {
    const initial = new Set<number>();
    sections.forEach((s, i) => {
      if (s.kind === 'warnings' || i < defaultOpenCount) initial.add(i);
    });
    return initial;
  });

  if (sections.length === 0) {
    return null;
  }

  const toggleSection = (idx: number) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  return (
    <div className={cn('space-y-2', className)}>
      {sections.map((section, i) => (
        <SectionCard
          key={i}
          section={section}
          isOpen={openSections.has(i)}
          onToggle={() => toggleSection(i)}
        />
      ))}
    </div>
  );
}

/* ========================================================================
 * Sub-componente: cada seção individualmente
 * ====================================================================== */

interface SectionCardProps {
  section: AiSummarySection;
  isOpen: boolean;
  onToggle: () => void;
}

function SectionCard({ section, isOpen, onToggle }: SectionCardProps) {
  const style = SECTION_STYLES[section.kind];
  const Icon = style.icon;
  const itemCount = section.lines.length + (section.introLine ? 1 : 0);

  return (
    <div
      className={cn(
        'rounded-lg border-l-4 bg-background/60 transition-colors',
        style.accentBorder
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/30"
        aria-expanded={isOpen}
      >
        <div className={cn('shrink-0 rounded-lg p-1.5', style.iconBg)}>
          <Icon className={cn('h-4 w-4', style.iconColor)} aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              'text-xs font-bold uppercase tracking-wide',
              style.headerColor
            )}
          >
            {section.title}
          </p>
          {!isOpen && itemCount > 0 && (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {itemCount} {itemCount === 1 ? 'item' : 'itens'}
              {section.introLine ? ` — ${section.introLine}` : ''}
            </p>
          )}
        </div>
        {isOpen ? (
          <ChevronDown
            className="h-4 w-4 shrink-0 text-muted-foreground"
            aria-hidden
          />
        ) : (
          <ChevronRight
            className="h-4 w-4 shrink-0 text-muted-foreground"
            aria-hidden
          />
        )}
      </button>

      {isOpen && (
        <div className="space-y-1.5 px-3 pb-3 pt-1">
          {section.introLine && (
            <LineItem
              line={{
                type: 'text',
                content: section.introLine,
                isWarning: false,
              }}
              sectionKind={section.kind}
            />
          )}
          {section.lines.map((line, i) => (
            <LineItem key={i} line={line} sectionKind={section.kind} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ========================================================================
 * Sub-componente: linha individual (com botão copiar on-hover)
 * ====================================================================== */

interface LineItemProps {
  line: AiSummaryLine;
  sectionKind: SectionKind;
}

function LineItem({ line, sectionKind }: LineItemProps) {
  const [copied, setCopied] = useState(false);
  const showWarning = line.isWarning || sectionKind === 'warnings';

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(line.content);
      setCopied(true);
      toast.success('Trecho copiado');
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Não foi possível copiar');
    }
  };

  return (
    <div
      className={cn(
        'group relative flex items-start gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
        showWarning
          ? 'bg-red-50 text-red-900 dark:bg-red-950/40 dark:text-red-200'
          : 'hover:bg-muted/40'
      )}
    >
      {/* Bullet marker */}
      {line.type === 'bullet' ? (
        <span
          className={cn(
            'mt-2 h-1.5 w-1.5 shrink-0 rounded-full',
            showWarning ? 'bg-red-500' : 'bg-muted-foreground/50'
          )}
          aria-hidden
        />
      ) : null}

      {/* Warning icon inline quando aplicável */}
      {showWarning && line.type !== 'bullet' && (
        <AlertTriangle
          className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-600 dark:text-red-400"
          aria-hidden
        />
      )}

      <p className="flex-1 whitespace-pre-wrap break-words leading-snug">
        {line.content}
      </p>

      <button
        type="button"
        onClick={handleCopy}
        className="shrink-0 rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-background hover:text-foreground focus:opacity-100 group-hover:opacity-100"
        aria-label="Copiar este trecho"
      >
        {copied ? (
          <Check className="h-3 w-3 text-emerald-600" aria-hidden />
        ) : (
          <Copy className="h-3 w-3" aria-hidden />
        )}
      </button>
    </div>
  );
}
