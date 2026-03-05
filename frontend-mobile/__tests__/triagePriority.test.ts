import { getMessagePriority, getMessageTopic } from '../lib/triage/triagePriority';
import type { TriageMessage } from '../lib/triage/triage.types';

function msg(overrides: Partial<TriageMessage>): TriageMessage {
  return {
    key: 'home:welcome',
    text: 'texto',
    severity: 'info',
    avatarState: 'neutral',
    cta: null,
    cooldownMs: 1000,
    ...overrides,
  };
}

describe('triagePriority', () => {
  it('ranks attention above info', () => {
    const base = getMessagePriority(msg({ severity: 'info' }));
    const attention = getMessagePriority(msg({ severity: 'attention' }));
    expect(attention).toBeGreaterThan(base);
  });

  it('boosts priority when has cta', () => {
    const withoutCta = getMessagePriority(msg({ key: 'exam:ok', cta: null }));
    const withCta = getMessagePriority(msg({ key: 'exam:ok', cta: 'teleconsulta' }));
    expect(withCta).toBeGreaterThan(withoutCta);
  });

  it('boosts priority for critical keys', () => {
    const normal = getMessagePriority(msg({ key: 'exam:ok', severity: 'attention' }));
    const critical = getMessagePriority(msg({ key: 'exam:red_flags_symptoms', severity: 'attention' }));
    expect(critical).toBeGreaterThan(normal);
  });

  it('extracts canonical topic from key', () => {
    expect(getMessageTopic(msg({ key: 'home:renew_exam' }))).toBe('home:renew_exam');
    expect(getMessageTopic(msg({ key: 'consult:red_flags' }))).toBe('consult:red_flags');
  });
});

