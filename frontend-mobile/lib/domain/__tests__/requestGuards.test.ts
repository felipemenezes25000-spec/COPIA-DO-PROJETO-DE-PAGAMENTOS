import type { RequestResponseDto } from '../../../types/database';
import { isActionAllowed, getBlockedActionMessage } from '../requestGuards';

const mockGetUiModel = jest.fn();
jest.mock('../requestUiModel', () => ({
  getUiModel: (req: RequestResponseDto, role: string) => mockGetUiModel(req, role),
}));

const baseRequest = { id: 'req-1', status: 'submitted' } as RequestResponseDto;

describe('requestGuards', () => {
  beforeEach(() => mockGetUiModel.mockReset());

  describe('isActionAllowed', () => {
    it('pay: retorna true quando canPay é true', () => {
      mockGetUiModel.mockReturnValue({ actions: { canPay: true, canSign: false, canDeliver: false } });
      expect(isActionAllowed(baseRequest, 'patient', 'pay')).toBe(true);
    });
    it('pay: retorna false quando canPay é false', () => {
      mockGetUiModel.mockReturnValue({ actions: { canPay: false, canSign: false, canDeliver: false } });
      expect(isActionAllowed(baseRequest, 'patient', 'pay')).toBe(false);
    });
    it('sign: usa canSign', () => {
      mockGetUiModel.mockReturnValue({ actions: { canPay: false, canSign: true, canDeliver: false } });
      expect(isActionAllowed(baseRequest, 'doctor', 'sign')).toBe(true);
    });
    it('deliver: usa canDeliver', () => {
      mockGetUiModel.mockReturnValue({ actions: { canPay: false, canSign: false, canDeliver: true } });
      expect(isActionAllowed(baseRequest, 'doctor', 'deliver')).toBe(true);
    });
  });

  describe('getBlockedActionMessage', () => {
    it('pay: mensagem "já realizado" quando phase é de pós-pagamento', () => {
      mockGetUiModel.mockReturnValue({ phase: 'signed', actions: {} });
      expect(getBlockedActionMessage(baseRequest, 'patient', 'pay')).toBe('Pagamento já foi realizado.');
    });
    it('pay: mensagem "não disponível" quando phase não é pós-pagamento', () => {
      mockGetUiModel.mockReturnValue({ phase: 'sent', actions: {} });
      expect(getBlockedActionMessage(baseRequest, 'patient', 'pay')).toBe(
        'Este pedido não está disponível para pagamento.'
      );
    });
    it('sign: retorna disabledReason ou fallback', () => {
      mockGetUiModel.mockReturnValue({ disabledReason: 'Aguardando pagamento', actions: {} });
      expect(getBlockedActionMessage(baseRequest, 'doctor', 'sign')).toBe('Aguardando pagamento');
      mockGetUiModel.mockReturnValue({ disabledReason: undefined, actions: {} });
      expect(getBlockedActionMessage(baseRequest, 'doctor', 'sign')).toBe(
        'Este pedido não está pronto para assinatura.'
      );
    });
    it('deliver: retorna disabledReason ou fallback', () => {
      mockGetUiModel.mockReturnValue({ disabledReason: undefined, actions: {} });
      expect(getBlockedActionMessage(baseRequest, 'doctor', 'deliver')).toBe(
        'Este pedido não está pronto para entrega.'
      );
    });
  });
});
