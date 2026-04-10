import * as validation from '../index';

describe('validation index', () => {
  it('re-exporta normalizers', () => {
    expect(validation.normalizeCpf).toBeDefined();
    expect(typeof validation.normalizeCpf).toBe('function');
  });

  it('re-exporta schemas', () => {
    expect(validation.loginSchema).toBeDefined();
    expect(validation.registerSchema).toBeDefined();
  });

  it('re-exporta validate', () => {
    expect(validation.validate).toBeDefined();
    expect(typeof validation.validate).toBe('function');
  });
});
