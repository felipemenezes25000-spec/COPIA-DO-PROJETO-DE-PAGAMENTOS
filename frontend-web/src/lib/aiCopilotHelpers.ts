/**
 * Helpers compartilhados para componentes de Copiloto IA (AiCopilotSection, AiCopilotCard).
 */

export function hasUsefulAiContent(
  aiSummary: string | null | undefined,
  aiRisk?: string | null,
  aiUrgency?: string | null
): boolean {
  if (aiRisk || aiUrgency) return true;
  if (!aiSummary || !aiSummary.trim()) return false;
  return aiSummary.replace(/\s/g, '').length > 50;
}

const URGENCY_LABELS_PT: Record<string, string> = {
  routine: 'Rotina',
  urgent: 'Urgente',
  emergency: 'Emergência',
};

/**
 * Converte o valor cru de `aiUrgency` (vindo da IA, às vezes capitalizado)
 * para o rótulo em português. Sempre normaliza via toLowerCase para evitar
 * que variações como "Routine"/"ROUTINE" vazem em inglês na tela.
 */
export function getUrgencyLabelPt(level: string | null | undefined): string {
  if (!level) return '';
  return URGENCY_LABELS_PT[level.toLowerCase()] ?? 'Rotina';
}

/**
 * Normaliza a urgência para comparação (sempre lowercase).
 * Útil para condicionais como `isRoutine(level)`.
 */
export function isRoutineUrgency(level: string | null | undefined): boolean {
  return (level ?? '').toLowerCase() === 'routine';
}
