import {
  validateCns,
  formatCns,
  validateCpf,
  formatCpf,
  validateCnes,
  validateCbo,
} from '../sus-validators';

describe('sus-validators', () => {
  describe('validateCns', () => {
    it('retorna false para null/undefined/vazio', () => {
      expect(validateCns(null)).toBe(false);
      expect(validateCns(undefined)).toBe(false);
      expect(validateCns('')).toBe(false);
    });
    it('retorna false para comprimento diferente de 15', () => {
      expect(validateCns('123')).toBe(false);
      expect(validateCns('1234567890123456')).toBe(false);
    });
    it('retorna false para primeiro dígito inválido', () => {
      expect(validateCns('300000000000000')).toBe(false);
    });
  });

  describe('formatCns', () => {
    it('formata CNS com espaços', () => {
      expect(formatCns('898001234567890')).toBe('898 0012 3456 7890');
    });
    it('retorna original se não tiver 15 dígitos', () => {
      expect(formatCns('123')).toBe('123');
    });
  });

  describe('validateCpf', () => {
    it('retorna false para vazio', () => {
      expect(validateCpf('')).toBe(false);
      expect(validateCpf(null)).toBe(false);
    });
    it('retorna false para todos dígitos iguais', () => {
      expect(validateCpf('111.111.111-11')).toBe(false);
    });
    it('retorna true para CPF válido', () => {
      expect(validateCpf('529.982.247-25')).toBe(true);
    });
  });

  describe('formatCpf', () => {
    it('formata CPF com pontos e traço', () => {
      expect(formatCpf('52998224725')).toBe('529.982.247-25');
    });
    it('retorna original se não tiver 11 dígitos', () => {
      expect(formatCpf('123')).toBe('123');
    });
  });

  describe('validateCnes', () => {
    it('retorna true para 7 dígitos', () => {
      expect(validateCnes('1234567')).toBe(true);
      expect(validateCnes('123 456 7')).toBe(true);
    });
    it('retorna false para inválido', () => {
      expect(validateCnes('')).toBe(false);
      expect(validateCnes('123')).toBe(false);
    });
  });

  describe('validateCbo', () => {
    it('retorna true para 6 dígitos', () => {
      expect(validateCbo('123456')).toBe(true);
    });
    it('retorna false para inválido', () => {
      expect(validateCbo('')).toBe(false);
      expect(validateCbo('123')).toBe(false);
    });
  });
});
