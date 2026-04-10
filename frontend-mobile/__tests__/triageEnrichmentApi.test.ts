/**
 * triageEnrichmentApi.test.ts
 * Destino: frontend-mobile/__tests__/triageEnrichmentApi.test.ts
 * (Cópia do arquivo gerado anteriormente no container)
 */

const mockGetAuthToken = jest.fn();
const mockPost = jest.fn();

jest.mock('../lib/api-client', () => ({
  apiClient: {
    getAuthToken: () => mockGetAuthToken(),
    post: (...args: unknown[]) => mockPost(...args),
  },
}));

import { enrichTriageMessage } from '../lib/triage/triageEnrichmentApi';
import type { TriageMessage, TriageInput } from '../lib/triage/triage.types';

function makeMessage(key: string, text = 'Mensagem base.'): TriageMessage {
  return { key, text, severity: 'info', avatarState: 'neutral', cta: null, cooldownMs: 30000 } as TriageMessage;
}

function makeInput(o: Partial<TriageInput> = {}): TriageInput {
  return { context: 'prescription', step: 'entry', role: 'patient', totalRequests: 1, ...o } as TriageInput;
}

beforeEach(() => { jest.clearAllMocks(); jest.useRealTimers(); });

describe('enrichTriageMessage — chaves que pulam enriquecimento', () => {
  const skipped = [
    'rx:high_risk', 'rx:red_flags', 'rx:unreadable', 'rx:ai_message', 'rx:controlled',
    'exam:high_risk', 'exam:complex', 'exam:many', 'exam:red_flags',
    'consult:red_flags', 'doctor:detail:high_risk', 'detail:conduct_available',
  ];
  skipped.forEach((key) => {
    it(`retorna null para key="${key}"`, async () => {
      expect(await enrichTriageMessage(makeMessage(key), makeInput())).toBeNull();
      expect(mockPost).not.toHaveBeenCalled();
    });
  });
});

describe('enrichTriageMessage — sem token', () => {
  it('retorna null quando getAuthToken=null', async () => {
    mockGetAuthToken.mockResolvedValueOnce(null);
    expect(await enrichTriageMessage(makeMessage('rx:entry'), makeInput())).toBeNull();
    expect(mockPost).not.toHaveBeenCalled();
  });
});

describe('enrichTriageMessage — sucesso', () => {
  it('retorna texto personalizado com isPersonalized=true', async () => {
    mockGetAuthToken.mockResolvedValueOnce('tok');
    mockPost.mockResolvedValueOnce({ text: 'Texto personalizado.', isPersonalized: true });
    const result = await enrichTriageMessage(makeMessage('rx:entry'), makeInput());
    expect(result?.text).toBe('Texto personalizado.');
    expect(result?.isPersonalized).toBe(true);
  });

  it('trunca em 140 chars', async () => {
    mockGetAuthToken.mockResolvedValueOnce('tok');
    mockPost.mockResolvedValueOnce({ text: 'A'.repeat(200), isPersonalized: true });
    const result = await enrichTriageMessage(makeMessage('rx:entry'), makeInput());
    expect(result?.text.length).toBeLessThanOrEqual(140);
  });

  it('retorna null quando isPersonalized=false', async () => {
    mockGetAuthToken.mockResolvedValueOnce('tok');
    mockPost.mockResolvedValueOnce({ text: 'Texto.', isPersonalized: false });
    expect(await enrichTriageMessage(makeMessage('rx:entry'), makeInput())).toBeNull();
  });

  it('retorna null com text vazio', async () => {
    mockGetAuthToken.mockResolvedValueOnce('tok');
    mockPost.mockResolvedValueOnce({ text: '', isPersonalized: true });
    expect(await enrichTriageMessage(makeMessage('rx:entry'), makeInput())).toBeNull();
  });
});

describe('enrichTriageMessage — sanitização de texto proibido', () => {
  const forbidden = ['você tem diabetes', 'prescrevo Metformina', 'diagnóstico de gripe'];
  forbidden.forEach((text) => {
    it(`rejeita "${text.slice(0, 20)}..."`, async () => {
      mockGetAuthToken.mockResolvedValueOnce('tok');
      mockPost.mockResolvedValueOnce({ text, isPersonalized: true });
      expect(await enrichTriageMessage(makeMessage('rx:entry'), makeInput())).toBeNull();
    });
  });
});

describe('enrichTriageMessage — erros e timeout', () => {
  it('retorna null quando post lança exceção', async () => {
    mockGetAuthToken.mockResolvedValueOnce('tok');
    mockPost.mockRejectedValueOnce(new Error('network'));
    expect(await enrichTriageMessage(makeMessage('rx:entry'), makeInput())).toBeNull();
  });

  it('retorna null por timeout (>4s)', async () => {
    jest.useFakeTimers();
    mockGetAuthToken.mockResolvedValueOnce('tok');
    mockPost.mockImplementationOnce(() => new Promise(() => {}));
    const p = enrichTriageMessage(makeMessage('rx:entry'), makeInput());
    jest.advanceTimersByTime(4001);
    expect(await p).toBeNull();
    jest.useRealTimers();
  });
});
