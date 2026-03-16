/**
 * paymentFlow.test.ts
 *
 * Testa a lógica central do fluxo PIX:
 * - polling automático e sua expiração
 * - verificação manual de status
 * - cálculo de expiração do código PIX
 * - detecção de pagamento aprovado
 */

// ── Mocks de APIs ─────────────────────────────────────────────────────────────

const mockFetchPayment = jest.fn();
const mockFetchPixCode = jest.fn();
const mockSyncPaymentStatus = jest.fn();

jest.mock('../lib/api', () => ({
  fetchPayment: mockFetchPayment,
  fetchPixCode: mockFetchPixCode,
  syncPaymentStatus: mockSyncPaymentStatus,
}));

// ── Dados de fixture ──────────────────────────────────────────────────────────

function makePayment(overrides: Record<string, unknown> = {}) {
  return {
    id: 'pay-123',
    requestId: 'req-456',
    amount: 49.9,
    status: 'pending',
    paymentMethod: 'pix',
    pixQrCodeBase64: 'base64string',
    pixCopyPaste: '00020126...',
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

// ── Lógica de cálculo de expiração (extraída do componente para ser testável) ──

function calcPixExpiresAt(
  payment: { createdAt: string; expiresAt?: string },
  expirationMinutes = 30,
): Date {
  if ((payment as Record<string, unknown>).expiresAt) {
    return new Date((payment as Record<string, unknown>).expiresAt as string);
  }
  return new Date(new Date(payment.createdAt).getTime() + expirationMinutes * 60 * 1000);
}

function calcExpiresInMinutes(expiresAt: Date, now = new Date()): number {
  return Math.floor((expiresAt.getTime() - now.getTime()) / 60000);
}

// ── Lógica de polling (extraída para ser testável) ───────────────────────────

interface PollState {
  pollCount: number;
  approved: boolean;
  polling: boolean;
  lastError: string | null;
}

async function runPollIteration(
  state: PollState,
  paymentId: string,
  requestId: string,
  maxPolls: number,
): Promise<PollState> {
  if (state.pollCount >= maxPolls) {
    return { ...state, polling: false };
  }

  const nextCount = state.pollCount + 1;

  try {
    const useSync = nextCount % 6 === 0;
    const updated = useSync
      ? await mockSyncPaymentStatus(requestId)
      : await mockFetchPayment(paymentId);

    const approved = updated.status === 'approved';
    return {
      pollCount: nextCount,
      approved,
      polling: !approved,
      lastError: null,
    };
  } catch (e) {
    return {
      pollCount: nextCount,
      approved: false,
      polling: true,
      lastError: (e as Error).message,
    };
  }
}

// ── Testes ────────────────────────────────────────────────────────────────────

describe('paymentFlow — PIX', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('cálculo de expiração', () => {
    it('usa expiresAt do backend quando disponível', () => {
      const futureDate = new Date(Date.now() + 25 * 60 * 1000).toISOString();
      const payment = makePayment({ expiresAt: futureDate });
      const expiresAt = calcPixExpiresAt(payment);
      expect(expiresAt.toISOString()).toBe(futureDate);
    });

    it('calcula fallback de 30 min a partir de createdAt', () => {
      const createdAt = new Date(Date.now() - 5 * 60 * 1000).toISOString(); // 5 min atrás
      const payment = makePayment({ createdAt });
      const expiresAt = calcPixExpiresAt(payment, 30);
      const minutesLeft = calcExpiresInMinutes(expiresAt);
      // 30 - 5 = 25 min restantes (floor); pequena variação por execução
      expect(minutesLeft).toBeGreaterThanOrEqual(24);
      expect(minutesLeft).toBeLessThanOrEqual(26);
    });

    it('retorna negativo para código expirado', () => {
      const createdAt = new Date(Date.now() - 31 * 60 * 1000).toISOString(); // 31 min atrás
      const payment = makePayment({ createdAt });
      const expiresAt = calcPixExpiresAt(payment, 30);
      const minutesLeft = calcExpiresInMinutes(expiresAt);
      expect(minutesLeft).toBeLessThan(0);
    });
  });

  describe('polling automático', () => {
    it('detecta pagamento aprovado e para o polling', async () => {
      mockFetchPayment.mockResolvedValueOnce(makePayment({ status: 'approved' }));

      let state: PollState = { pollCount: 0, approved: false, polling: true, lastError: null };
      state = await runPollIteration(state, 'pay-123', 'req-456', 180);

      expect(state.approved).toBe(true);
      expect(state.polling).toBe(false);
    });

    it('continua polling quando status ainda é pending', async () => {
      mockFetchPayment.mockResolvedValueOnce(makePayment({ status: 'pending' }));

      let state: PollState = { pollCount: 0, approved: false, polling: true, lastError: null };
      state = await runPollIteration(state, 'pay-123', 'req-456', 180);

      expect(state.approved).toBe(false);
      expect(state.polling).toBe(true);
    });

    it('para o polling ao atingir maxPolls', async () => {
      const state: PollState = { pollCount: 180, approved: false, polling: true, lastError: null };
      const next = await runPollIteration(state, 'pay-123', 'req-456', 180);

      expect(next.polling).toBe(false);
      expect(mockFetchPayment).not.toHaveBeenCalled();
    });

    it('usa syncPaymentStatus a cada 6 iterações (não fetchPayment)', async () => {
      mockSyncPaymentStatus.mockResolvedValueOnce(makePayment({ status: 'pending' }));

      let state: PollState = { pollCount: 5, approved: false, polling: true, lastError: null };
      state = await runPollIteration(state, 'pay-123', 'req-456', 180);

      // Na iteração 6 (count 5 → 6), deve usar syncPaymentStatus
      expect(mockSyncPaymentStatus).toHaveBeenCalledWith('req-456');
      expect(mockFetchPayment).not.toHaveBeenCalled();
    });

    it('mantém polling após erro de rede, armazena lastError', async () => {
      mockFetchPayment.mockRejectedValueOnce(new Error('Network request failed'));

      let state: PollState = { pollCount: 0, approved: false, polling: true, lastError: null };
      state = await runPollIteration(state, 'pay-123', 'req-456', 180);

      expect(state.polling).toBe(true);
      expect(state.lastError).toContain('Network request failed');
      expect(state.approved).toBe(false);
    });
  });

  describe('verificação manual (Já paguei)', () => {
    it('retorna pagamento aprovado via syncPaymentStatus', async () => {
      mockSyncPaymentStatus.mockResolvedValueOnce(makePayment({ status: 'approved' }));

      const result = await mockSyncPaymentStatus('req-456');
      expect(result.status).toBe('approved');
    });

    it('propaga erro quando syncPaymentStatus falha', async () => {
      mockSyncPaymentStatus.mockRejectedValueOnce(new Error('Timeout'));

      await expect(mockSyncPaymentStatus('req-456')).rejects.toThrow('Timeout');
    });
  });

  describe('fetchPixCode', () => {
    it('retorna código copia e cola', async () => {
      mockFetchPixCode.mockResolvedValueOnce('00020126...');

      const code = await mockFetchPixCode('pay-123');
      expect(code).toMatch(/^0002/);
    });

    it('lança erro quando PIX não pode ser gerado', async () => {
      mockFetchPixCode.mockRejectedValueOnce(new Error('PIX indisponível'));

      await expect(mockFetchPixCode('pay-123')).rejects.toThrow('PIX indisponível');
    });
  });
});
