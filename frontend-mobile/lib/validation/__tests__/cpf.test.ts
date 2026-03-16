import { isValidCpf } from '../cpf';

describe('isValidCpf', () => {
  it('retorna false para string vazia ou null', () => {
    expect(isValidCpf('')).toBe(false);
    expect(isValidCpf(null as any)).toBe(false);
  });

  it('retorna false para menos de 11 dígitos', () => {
    expect(isValidCpf('1234567890')).toBe(false);
    expect(isValidCpf('123.456.789-0')).toBe(false);
  });

  it('retorna false para mais de 11 dígitos (após remover não-dígitos)', () => {
    expect(isValidCpf('123456789012')).toBe(false);
  });

  it('retorna false para CPF com todos dígitos iguais', () => {
    expect(isValidCpf('111.111.111-11')).toBe(false);
    expect(isValidCpf('00000000000')).toBe(false);
  });

  it('retorna true para CPF válido (apenas números)', () => {
    // CPF válido conhecido (algoritmo módulo 11)
    expect(isValidCpf('52998224725')).toBe(true);
  });

  it('aceita CPF com máscara e remove não-dígitos', () => {
    expect(isValidCpf('529.982.247-25')).toBe(true);
  });

  it('retorna false para CPF inválido (dígitos verificadores errados)', () => {
    expect(isValidCpf('52998224700')).toBe(false);
    expect(isValidCpf('12345678901')).toBe(false);
  });
});
