import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isAuthenticated, logout } from './adminApi';

describe('adminApi', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('isAuthenticated', () => {
    it('deve retornar false quando não há token', () => {
      expect(isAuthenticated()).toBe(false);
    });

    it('deve retornar true quando há token', () => {
      localStorage.setItem('admin_auth_token', 'abc123');
      expect(isAuthenticated()).toBe(true);
    });
  });

  describe('logout', () => {
    it('deve remover token do localStorage', () => {
      localStorage.setItem('admin_auth_token', 'abc123');

      logout();

      expect(localStorage.getItem('admin_auth_token')).toBeNull();
    });
  });
});
