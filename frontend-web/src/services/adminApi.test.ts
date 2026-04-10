import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isAuthenticated, logout, validateAdminToken } from './adminApi';

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

    it('deve retornar true quando há token e login_at válido', () => {
      localStorage.setItem('admin_auth_token', 'abc123');
      localStorage.setItem('admin_login_at', String(Date.now()));
      expect(isAuthenticated()).toBe(true);
    });
  });

  describe('validateAdminToken', () => {
    beforeEach(() => {
      vi.stubEnv('VITE_API_URL', 'https://api.test');
    });

    it('deve retornar false quando não há token no storage', async () => {
      const fetchMock = vi.fn();
      vi.stubGlobal('fetch', fetchMock);
      await expect(validateAdminToken()).resolves.toBe(false);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('deve retornar false se o backend responder não-ok', async () => {
      localStorage.setItem('admin_auth_token', 'abc123');
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) })
      );
      await expect(validateAdminToken()).resolves.toBe(false);
    });

    it('deve retornar false se a role NÃO for admin (fail-closed)', async () => {
      localStorage.setItem('admin_auth_token', 'abc123');
      // Simula ataque: storage adulterado com "admin" mas backend diz "doctor".
      localStorage.setItem('admin_user_role', 'admin');
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({ id: '1', role: 'doctor' }),
        })
      );
      await expect(validateAdminToken()).resolves.toBe(false);
    });

    it('deve retornar true e sincronizar a role quando backend confirma admin', async () => {
      localStorage.setItem('admin_auth_token', 'abc123');
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({ id: '1', role: 'admin' }),
        })
      );
      await expect(validateAdminToken()).resolves.toBe(true);
      expect(localStorage.getItem('admin_user_role')).toBe('admin');
    });
  });

  describe('logout', () => {
    it('deve remover token do localStorage', async () => {
      localStorage.setItem('admin_auth_token', 'abc123');
      // Mock fetch for the backend logout call (best-effort, does not block)
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));

      await logout();

      expect(localStorage.getItem('admin_auth_token')).toBeNull();
    });
  });
});
