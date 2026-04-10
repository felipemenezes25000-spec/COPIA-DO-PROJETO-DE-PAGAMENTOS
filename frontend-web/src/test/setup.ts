import '@testing-library/jest-dom';
import { vi } from 'vitest';

/**
 * jsdom não implementa window.matchMedia. Hooks e componentes que usam
 * media queries (ex.: usePWA detecta `display-mode: standalone`, temas
 * que leem `prefers-color-scheme`) quebram com "matchMedia is not a
 * function" quando montados em testes.
 *
 * Mock global: retorna sempre `matches: false` com os listeners no-op.
 * Testes individuais podem sobrescrever com vi.spyOn se precisarem de
 * comportamento específico.
 */
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  configurable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    // APIs deprecated — algumas libs antigas ainda chamam
    addListener: vi.fn(),
    removeListener: vi.fn(),
    // APIs modernas
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
