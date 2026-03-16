import { personalizeTriageCopy } from '../triageCopyPersonalization';
import type { TriageMessage, TriageInput } from '../triage.types';

describe('triageCopyPersonalization', () => {
  const baseMessage: TriageMessage = {
    key: 'test',
    text: 'Mensagem curta.',
    severity: 'info',
    avatarState: 'neutral',
    cta: null,
    cooldownMs: 0,
  };

  const baseInput: TriageInput = {
    requestId: 'req-1',
    context: 'home',
    step: 'idle',
    role: 'patient',
  };

  it('retorna mensagem com text possivelmente adaptado', () => {
    const out = personalizeTriageCopy(baseMessage, baseInput);
    expect(out).toHaveProperty('text');
    expect(out.text.length).toBeGreaterThan(0);
    expect(out.key).toBe('test');
  });

  it('perfil guided para idade >= 60', () => {
    const out = personalizeTriageCopy(baseMessage, { ...baseInput, patientAge: 65 });
    expect(out.text).toMatch(/Passo a passo:/);
  });

  it('perfil supportive para status rejected', () => {
    const out = personalizeTriageCopy(baseMessage, { ...baseInput, status: 'rejected' });
    expect(out.text).toMatch(/Tudo bem\./);
  });

  it('limita texto a 140 caracteres', () => {
    const long = { ...baseMessage, text: 'x'.repeat(200) };
    const out = personalizeTriageCopy(long, baseInput);
    expect(out.text.length).toBeLessThanOrEqual(141);
  });
});
