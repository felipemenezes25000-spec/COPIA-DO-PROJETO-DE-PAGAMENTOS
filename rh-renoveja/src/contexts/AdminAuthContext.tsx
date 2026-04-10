import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';
import type { AdminUser } from '../types/admin';
import { adminLogin as apiLogin, ADMIN_UNAUTHORIZED_EVENT } from '../lib/admin-api';

interface AdminAuthContextValue {
  user: AdminUser | null;
  loading: boolean;
  hydrated: boolean;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

const STORAGE_KEY = 'rh_admin_user';

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const navigate = useNavigate();

  // Restore session from sessionStorage (one-shot on mount).
  // Validates that the parsed object actually has a token — without this
  // guard a corrupted entry could leave us "logged in" with `token=undefined`,
  // which silently sends unauthenticated admin requests in a tight loop.
  useEffect(() => {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as Partial<AdminUser>;
        if (parsed && typeof parsed.token === 'string' && parsed.token.length > 0) {
          setUser(parsed as AdminUser);
        } else {
          sessionStorage.removeItem(STORAGE_KEY);
        }
      } catch {
        sessionStorage.removeItem(STORAGE_KEY);
      }
    }
    setHydrated(true);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      setLoading(true);
      try {
        const adminUser = await apiLogin(email, password);
        setUser(adminUser);
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(adminUser));
        navigate('/admin');
      } finally {
        setLoading(false);
      }
    },
    [navigate],
  );

  const logout = useCallback(() => {
    setUser(null);
    sessionStorage.removeItem(STORAGE_KEY);
    navigate('/admin/login');
  }, [navigate]);

  // Global 401 handler — when admin-api detects an expired/invalid token,
  // it dispatches ADMIN_UNAUTHORIZED_EVENT. We log out exactly once so the
  // user lands back on the login screen instead of getting stuck on a
  // skeleton that infinitely re-issues failing requests.
  useEffect(() => {
    function handleUnauthorized() {
      // Only act if we currently believe we're logged in — prevents a
      // redundant navigate() loop when multiple parallel requests all 401.
      if (sessionStorage.getItem(STORAGE_KEY)) {
        logout();
      }
    }
    window.addEventListener(ADMIN_UNAUTHORIZED_EVENT, handleUnauthorized);
    return () => {
      window.removeEventListener(ADMIN_UNAUTHORIZED_EVENT, handleUnauthorized);
    };
  }, [logout]);

  return (
    <AdminAuthContext.Provider value={{ user, loading, hydrated, token: user?.token ?? null, login, logout }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth(): AdminAuthContextValue {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) {
    throw new Error('useAdminAuth deve ser usado dentro de <AdminAuthProvider>');
  }
  return ctx;
}
