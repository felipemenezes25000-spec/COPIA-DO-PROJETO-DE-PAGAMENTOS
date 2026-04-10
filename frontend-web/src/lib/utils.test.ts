import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('cn', () => {
  it('deve mesclar classes com tailwind-merge', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
  });

  it('deve aceitar condicionais via clsx', () => {
    const show = true;
    const hide = false;
    expect(cn('base', hide && 'hidden', show && 'visible')).toBe(
      'base visible'
    );
  });

  it('deve retornar string vazia para inputs vazios', () => {
    expect(cn()).toBe('');
  });
});
