import { SPECIALTIES_FALLBACK } from '../specialties';

describe('specialties', () => {
  it('SPECIALTIES_FALLBACK é array não vazio', () => {
    expect(Array.isArray(SPECIALTIES_FALLBACK)).toBe(true);
    expect(SPECIALTIES_FALLBACK.length).toBeGreaterThan(0);
  });

  it('contém especialidades esperadas', () => {
    expect(SPECIALTIES_FALLBACK).toContain('Clínico Geral');
    expect(SPECIALTIES_FALLBACK).toContain('Cardiologia');
    expect(SPECIALTIES_FALLBACK).toContain('Pediatria');
  });
});
