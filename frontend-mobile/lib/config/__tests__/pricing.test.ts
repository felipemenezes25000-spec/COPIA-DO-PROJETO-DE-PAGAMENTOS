import {
  FALLBACK_PRICES,
  PRESCRIPTION_TYPE_PRICES,
  EXAM_TYPE_PRICES,
  CONSULTATION_PRICE_PER_MINUTE,
  getDisplayPrice,
} from '../pricing';

describe('pricing', () => {
  it('FALLBACK_PRICES tem prescription, exam, consultation', () => {
    expect(FALLBACK_PRICES.prescription).toBe(29.9);
    expect(FALLBACK_PRICES.exam).toBe(19.9);
    expect(FALLBACK_PRICES.consultation).toBe(120);
  });

  it('PRESCRIPTION_TYPE_PRICES tem simples, controlado, azul', () => {
    expect(PRESCRIPTION_TYPE_PRICES.simples).toBe(29.9);
    expect(PRESCRIPTION_TYPE_PRICES.controlado).toBe(49.9);
  });

  it('EXAM_TYPE_PRICES tem laboratorial e imagem', () => {
    expect(EXAM_TYPE_PRICES.laboratorial).toBe(19.9);
    expect(EXAM_TYPE_PRICES.imagem).toBe(29.9);
  });

  it('CONSULTATION_PRICE_PER_MINUTE tem psicologo e medico_clinico', () => {
    expect(CONSULTATION_PRICE_PER_MINUTE.psicologo).toBe(3.99);
    expect(CONSULTATION_PRICE_PER_MINUTE.medico_clinico).toBe(6.99);
  });

  describe('getDisplayPrice', () => {
    it('retorna price quando > 0', () => {
      expect(getDisplayPrice(50, 'prescription')).toBe(50);
    });

    it('retorna fallback por requestType quando price é null', () => {
      expect(getDisplayPrice(null, 'prescription')).toBe(29.9);
      expect(getDisplayPrice(null, 'exam')).toBe(19.9);
      expect(getDisplayPrice(null, 'consultation')).toBe(120);
    });

    it('usa prescriptionType para prescription quando fornecido', () => {
      expect(getDisplayPrice(null, 'prescription', 'controlado')).toBe(49.9);
      expect(getDisplayPrice(null, 'prescription', 'simples')).toBe(29.9);
    });

    it('retorna FALLBACK_PRICES.prescription como último recurso', () => {
      expect(getDisplayPrice(null, undefined)).toBe(29.9);
    });
  });
});
