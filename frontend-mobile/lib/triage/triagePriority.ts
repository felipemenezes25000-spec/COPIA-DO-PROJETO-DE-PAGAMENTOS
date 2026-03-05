import type { TriageMessage } from './triage.types';

const CRITICAL_KEY_RE = /(red_flags|high_risk|no_certificate)/i;

const SEVERITY_WEIGHT: Record<TriageMessage['severity'], number> = {
  attention: 4,
  positive: 2,
  info: 1,
  neutral: 0,
};

/**
 * Score de prioridade para decidir se uma nova mensagem
 * deve substituir a atual sem gerar ruído visual.
 */
export function getMessagePriority(message: TriageMessage): number {
  let score = SEVERITY_WEIGHT[message.severity] ?? 0;
  if (message.cta) score += 1;
  if (CRITICAL_KEY_RE.test(message.key)) score += 3;
  if (message.isPersonalized) score += 1;
  return score;
}

/**
 * Topic canônico para evitar repetição excessiva na sessão.
 * Ex.: "home:renew_exam" e "home:renew_prescription" viram tópicos diferentes.
 */
export function getMessageTopic(message: TriageMessage): string {
  const [ctx = 'generic', topic = 'generic'] = message.key.split(':');
  return `${ctx}:${topic}`;
}

