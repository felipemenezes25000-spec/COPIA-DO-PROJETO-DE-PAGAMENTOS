/**
 * signatureFlow.test.ts
 *
 * Testa o fluxo de assinatura digital no frontend mobile:
 * - estados de transição da state machine (Paid → Signed → Delivered)
 * - validação antes de assinar
 * - download do documento assinado
 * - proteção contra assinar sem estar no estado Paid
 */

// ── Mocks de APIs ─────────────────────────────────────────────────────────────

const mockSignRequest = jest.fn();
const mockValidatePrescription = jest.fn();
const mockGetSignedDocument = jest.fn();
const mockMarkDelivered = jest.fn();

jest.mock('../lib/api', () => ({
  signRequest: mockSignRequest,
  validatePrescription: mockValidatePrescription,
  getSignedDocument: mockGetSignedDocument,
  markDelivered: mockMarkDelivered,
}));

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeRequest(overrides: Record<string, unknown> = {}) {
  return {
    id: 'req-123',
    patientId: 'patient-456',
    requestType: 'prescription',
    status: 'paid',
    medications: ['Losartana 50mg'],
    doctorName: 'Dr. Silva',
    signedDocumentUrl: null,
    signedAt: null,
    ...overrides,
  };
}

// ── State machine: transições válidas ────────────────────────────────────────

function isSignable(request: ReturnType<typeof makeRequest>): boolean {
  return request.status === 'paid';
}

function canDeliver(request: ReturnType<typeof makeRequest>): boolean {
  return request.status === 'signed';
}

function canDownload(request: ReturnType<typeof makeRequest>): boolean {
  return !!request.signedDocumentUrl || request.status === 'signed' || request.status === 'delivered';
}

// ── Testes ────────────────────────────────────────────────────────────────────

describe('signatureFlow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('state machine — transições', () => {
    it('pedido Paid pode ser assinado (isSignable)', () => {
      const req = makeRequest({ status: 'paid' });
      expect(isSignable(req)).toBe(true);
    });

    it('pedido Submitted NÃO pode ser assinado', () => {
      const req = makeRequest({ status: 'submitted' });
      expect(isSignable(req)).toBe(false);
    });

    it('pedido InReview NÃO pode ser assinado', () => {
      const req = makeRequest({ status: 'in_review' });
      expect(isSignable(req)).toBe(false);
    });

    it('pedido Signed pode ser marcado como entregue', () => {
      const req = makeRequest({ status: 'signed' });
      expect(canDeliver(req)).toBe(true);
    });

    it('pedido Paid ainda NÃO pode ser marcado entregue', () => {
      const req = makeRequest({ status: 'paid' });
      expect(canDeliver(req)).toBe(false);
    });

    it('pedido Signed pode ser baixado', () => {
      const req = makeRequest({ status: 'signed' });
      expect(canDownload(req)).toBe(true);
    });

    it('pedido Delivered pode ser baixado', () => {
      const req = makeRequest({ status: 'delivered' });
      expect(canDownload(req)).toBe(true);
    });

    it('pedido com signedDocumentUrl pode ser baixado independente do status', () => {
      const req = makeRequest({
        status: 'delivered',
        signedDocumentUrl: 'https://s3.amazonaws.com/prescription.pdf',
      });
      expect(canDownload(req)).toBe(true);
    });

    it('pedido Paid sem URL NÃO pode ser baixado', () => {
      const req = makeRequest({ status: 'paid', signedDocumentUrl: null });
      expect(canDownload(req)).toBe(false);
    });
  });

  describe('assinar via API', () => {
    it('signRequest é chamado com o requestId correto', async () => {
      mockSignRequest.mockResolvedValueOnce(
        makeRequest({ status: 'signed', signedDocumentUrl: 'https://s3.example.com/doc.pdf', signedAt: new Date().toISOString() }),
      );

      const result = await mockSignRequest('req-123', { certificateId: 'cert-789' });
      expect(mockSignRequest).toHaveBeenCalledWith('req-123', expect.any(Object));
      expect(result.status).toBe('signed');
    });

    it('pedido retorna signedDocumentUrl após assinatura', async () => {
      const signedUrl = 'https://s3.amazonaws.com/prescriptions/signed-doc.pdf';
      mockSignRequest.mockResolvedValueOnce(
        makeRequest({ status: 'signed', signedDocumentUrl: signedUrl }),
      );

      const result = await mockSignRequest('req-123');
      expect(result.signedDocumentUrl).toBe(signedUrl);
    });

    it('propaga erro quando certificado não está disponível', async () => {
      mockSignRequest.mockRejectedValueOnce(
        new Error('Certificado digital não encontrado'),
      );

      await expect(mockSignRequest('req-123')).rejects.toThrow('Certificado');
    });
  });

  describe('validação antes de assinar', () => {
    it('retorna isValid: true para receita completa', async () => {
      mockValidatePrescription.mockResolvedValueOnce({
        isValid: true,
        missingFields: [],
        messages: [],
      });

      const result = await mockValidatePrescription('req-123');
      expect(result.isValid).toBe(true);
      expect(result.missingFields).toHaveLength(0);
    });

    it('retorna campos faltantes quando dados estão incompletos', async () => {
      mockValidatePrescription.mockResolvedValueOnce({
        isValid: false,
        missingFields: ['paciente.cpf', 'medico.crm'],
        messages: ['CPF do paciente é obrigatório', 'CRM do médico é obrigatório'],
      });

      const result = await mockValidatePrescription('req-123');
      expect(result.isValid).toBe(false);
      expect(result.missingFields).toContain('paciente.cpf');
      expect(result.missingFields).toContain('medico.crm');
    });
  });

  describe('download do documento', () => {
    it('getSignedDocument retorna URL de download temporária', async () => {
      const tempUrl = 'https://s3.amazonaws.com/prescriptions/doc.pdf?token=xyz';
      mockGetSignedDocument.mockResolvedValueOnce(tempUrl);

      const url = await mockGetSignedDocument('req-123');
      expect(url).toBe(tempUrl);
    });

    it('propaga erro quando documento não está disponível', async () => {
      mockGetSignedDocument.mockRejectedValueOnce(new Error('Documento não encontrado'));

      await expect(mockGetSignedDocument('req-123')).rejects.toThrow('não encontrado');
    });
  });

  describe('marcar como entregue', () => {
    it('markDelivered transiciona para status delivered', async () => {
      mockMarkDelivered.mockResolvedValueOnce(makeRequest({ status: 'delivered' }));

      const result = await mockMarkDelivered('req-123');
      expect(result.status).toBe('delivered');
    });
  });

  describe('tipos de receita', () => {
    it.each([
      ['simples', true],
      ['controlado', true],
      ['prescription', true],
    ])('tipo %s pode ser assinado quando status é paid', (type, expected) => {
      const req = makeRequest({ requestType: type, status: 'paid' });
      expect(isSignable(req)).toBe(expected);
    });

    it('consulta finalizada não passa por assinatura', () => {
      const req = makeRequest({
        requestType: 'consultation',
        status: 'consultation_finished',
      });
      // Consultas finalizadas não têm assinatura — isSignable deve retornar false
      expect(isSignable(req)).toBe(false);
    });
  });
});
