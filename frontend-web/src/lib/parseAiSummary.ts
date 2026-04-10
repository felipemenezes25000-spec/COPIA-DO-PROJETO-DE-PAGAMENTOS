/**
 * Parse AI summary text into structured blocks for better readability.
 * Aligned with frontend-mobile FormattedAiSummary.
 *
 * Duas APIs exportadas:
 *
 *  - parseAiSummary(text): retorno "flat" (header/bullet/text), mantido para
 *    backward compat com callers antigos.
 *
 *  - parseAiSummaryIntoSections(text): retorno agrupado em seções semânticas
 *    (Medicamentos, Exames, Conduta, Alertas, Diagnóstico, Outros) com
 *    reconhecimento de palavras-chave em português. Usado pelo renderer
 *    rico AiCopilotRichContent.
 */
export interface AiSummaryBlock {
  type: 'header' | 'bullet' | 'text';
  header?: string;
  content: string;
}

export function parseAiSummary(text: string): AiSummaryBlock[] {
  if (!text?.trim()) return [];
  const lines = text.split('\n').filter((l) => l.trim());
  const blocks: AiSummaryBlock[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    const headerMatch = trimmed.match(
      /^([A-ZÁÉÍÓÚÃÕÊÇÂÔ][A-ZÁÉÍÓÚÃÕÊÇÂÔ\s]{2,}):\s*(.*)/
    );
    if (headerMatch) {
      blocks.push({
        type: 'header',
        header: headerMatch[1].trim(),
        content: headerMatch[2].trim(),
      });
      continue;
    }
    if (
      trimmed.startsWith('•') ||
      (trimmed.startsWith('- ') && !trimmed.startsWith('--'))
    ) {
      blocks.push({ type: 'bullet', content: trimmed.replace(/^[•-]\s*/, '') });
      continue;
    }
    blocks.push({ type: 'text', content: trimmed });
  }
  return blocks;
}

/* ========================================================================
 * API nova: agrupamento em seções semânticas
 * ====================================================================== */

export type SectionKind =
  | 'medications'
  | 'exams'
  | 'diagnosis'
  | 'conduct'
  | 'warnings'
  | 'anamnesis'
  | 'other';

export interface AiSummaryLine {
  type: 'bullet' | 'text';
  content: string;
  /** Linha contém palavra-chave perigosa (alergia, contraindicação, interação). */
  isWarning: boolean;
}

export interface AiSummarySection {
  kind: SectionKind;
  /** Título como aparece no texto original (ex: "MEDICAMENTOS SUGERIDOS"). */
  title: string;
  /** Conteúdo inline quando o header veio com texto ("MEDICAMENTOS: dipirona"). */
  introLine?: string;
  lines: AiSummaryLine[];
}

/**
 * Classifica o header em um dos SectionKind conhecidos. Normaliza removendo
 * acentos e caixa para tornar a detecção robusta às variações que a LLM produz.
 */
function classifySection(headerRaw: string): SectionKind {
  const normalized = headerRaw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (/medicament|prescric|posologi|farmac|droga/.test(normalized)) {
    return 'medications';
  }
  if (
    /exame|laborator|imagem|rx|ressonan|tomograf|ultrassom/.test(normalized)
  ) {
    return 'exams';
  }
  if (/diagn[óo]|hipot|impress[aã]o|diferencia|cid/.test(normalized)) {
    return 'diagnosis';
  }
  if (
    /conduta|orienta|recomenda|plano|seguim|retorno|follow/.test(normalized)
  ) {
    return 'conduct';
  }
  if (
    /alerta|aten[cç][aã]o|cuidad|risco|contraindica|interac|alergia|advert/.test(
      normalized
    )
  ) {
    return 'warnings';
  }
  if (/anamnes|queixa|hist[óo]ria|sintoma|quadro|apresenta/.test(normalized)) {
    return 'anamnesis';
  }
  return 'other';
}

/** Palavras-chave que sinalizam conteúdo de risco dentro de uma linha. */
const WARNING_KEYWORDS = [
  'alergia',
  'alergic',
  'contraindicac',
  'contraindicad',
  'interac',
  'nao usar',
  'não usar',
  'suspender',
  'cuidado',
  'risco',
  'perigo',
  'evitar',
];

function lineHasWarning(content: string): boolean {
  const normalized = content
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  return WARNING_KEYWORDS.some((kw) => normalized.includes(kw));
}

export function parseAiSummaryIntoSections(
  text: string | null | undefined
): AiSummarySection[] {
  if (!text?.trim()) return [];

  const rawLines = text.split('\n');
  const sections: AiSummarySection[] = [];

  // Seção "corrente" que estamos preenchendo. Começa como undefined — se o
  // texto iniciar com conteúdo sem header, criamos uma seção 'other' implícita.
  let current: AiSummarySection | undefined;

  const ensureCurrent = (): AiSummarySection => {
    if (!current) {
      current = { kind: 'other', title: 'Análise', lines: [] };
      sections.push(current);
    }
    return current;
  };

  const headerRegex = /^([A-ZÁÉÍÓÚÃÕÊÇÂÔ][A-ZÁÉÍÓÚÃÕÊÇÂÔ\s]{2,}):\s*(.*)$/;

  for (const rawLine of rawLines) {
    const line = rawLine.trim();
    if (!line) continue;

    const headerMatch = line.match(headerRegex);
    if (headerMatch) {
      const title = headerMatch[1].trim();
      const inline = headerMatch[2].trim();
      const kind = classifySection(title);
      current = {
        kind,
        title,
        introLine: inline || undefined,
        lines: [],
      };
      sections.push(current);
      continue;
    }

    // Detecta bullets por • ou - (não --)
    const isBullet =
      line.startsWith('•') || (line.startsWith('- ') && !line.startsWith('--'));
    const content = isBullet ? line.replace(/^[•-]\s*/, '') : line;

    ensureCurrent().lines.push({
      type: isBullet ? 'bullet' : 'text',
      content,
      isWarning: lineHasWarning(content),
    });
  }

  // Filtra seções completamente vazias (header sem conteúdo nem intro)
  return sections.filter((s) => s.introLine || s.lines.length > 0);
}
