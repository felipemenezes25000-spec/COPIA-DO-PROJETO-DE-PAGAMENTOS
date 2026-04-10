import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';
import {
  hasAuthSession,
  getStoredUser,
  getMe,
  getDoctorProfile,
  logoutDoctor,
  type DoctorUser,
  type DoctorProfile,
} from '@/services/doctorApi';
import { DoctorAuthContext } from './doctor-auth-context';

export function DoctorAuthProvider({ children }: { children: ReactNode }) {
  // ── Inicialização síncrona a partir do localStorage ──
  // Isso garante que no PRIMEIRO RENDER já temos user e token,
  // sem depender de nenhum useEffect assíncrono.
  const [user, setUser] = useState<DoctorUser | null>(() => getStoredUser());
  const [doctorProfile, setDoctorProfile] = useState<DoctorProfile | null>(
    null
  );

  // MUDANÇA CRÍTICA: loading começa como TRUE apenas se tem sessão mas NÃO tem user cached.
  // Se já tem ambos (sessão + user no localStorage), loading começa FALSE — sem flash.
  // hasAuthSession() checks for cached user or legacy localStorage token — HttpOnly cookies
  // are not readable from JS, so we rely on cached user data as a session indicator.
  const [loading, setLoading] = useState(() => {
    const hasSession = hasAuthSession();
    const hasUser = !!getStoredUser();
    // Se tem sessão E user cached → já podemos renderizar (loading = false)
    // Se tem sessão mas NÃO tem user → precisa esperar getMe() (loading = true)
    // Se NÃO tem sessão → não autenticado (loading = false)
    return hasSession && !hasUser;
  });

  // Guard contra múltiplos refreshes simultâneos e StrictMode double-mount
  const refreshingRef = useRef(false);
  // Global mount tracker — garante que nenhum setState ocorra após unmount
  // (race entre signOut/logout e o Provider sendo desmontado).
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refreshUser = useCallback(async () => {
    if (refreshingRef.current) return;
    // With HttpOnly cookies, we can't check for token presence from JS.
    // hasAuthSession() returns true if we have cached user data or legacy token.
    if (!hasAuthSession()) return;

    refreshingRef.current = true;
    try {
      const me = await getMe();
      if (mountedRef.current) {
        setUser(me);
      }

      try {
        const profile = await getDoctorProfile();
        if (mountedRef.current) setDoctorProfile(profile);
      } catch {
        if (mountedRef.current) setDoctorProfile(null);
      }
    } catch {
      // MUDANÇA: Só zera user se a sessão foi invalidada (pelo authFetch no 401).
      // Se a sessão ainda existe, foi erro de rede — manter user cached.
      if (mountedRef.current) {
        if (!hasAuthSession()) {
          setUser(null);
          setDoctorProfile(null);
        }
        // Se sessão ainda existe → manter user do localStorage (erro de rede/timeout)
      }
    } finally {
      refreshingRef.current = false;
    }
  }, []);

  const setAuthFromLogin = useCallback((loggedUser: DoctorUser) => {
    setUser(loggedUser);
    setLoading(false);
    // Buscar profile em background
    getDoctorProfile()
      .then((p) => {
        if (mountedRef.current) setDoctorProfile(p);
      })
      .catch(() => {
        if (mountedRef.current) setDoctorProfile(null);
      });
  }, []);

  // ── Effect de inicialização ──
  useEffect(() => {
    if (!hasAuthSession()) {
      setLoading(false);
      return;
    }

    // Refresh em background — NÃO bloqueia a renderização se já temos user cached
    refreshUser().finally(() => {
      if (mountedRef.current) {
        setLoading(false);
      }
    });
  }, [refreshUser]);

  // ── Listener para auth expirado (disparado pelo authFetch no 401) ──
  useEffect(() => {
    const handleExpired = () => {
      if (!mountedRef.current) return;
      setUser(null);
      setDoctorProfile(null);
      setLoading(false);
    };
    window.addEventListener('auth:expired', handleExpired);
    return () => window.removeEventListener('auth:expired', handleExpired);
  }, []);

  const signOut = useCallback(async () => {
    await logoutDoctor();
  }, []);

  // ── isAuthenticated: usa user E sessão (ambos devem existir) ──
  // With HttpOnly cookies we can't read the token from JS, so we use
  // hasAuthSession() which checks for cached user data or legacy token.
  const isAuthenticated = !!user && hasAuthSession();

  // Memoiza o valor do contexto para evitar re-renders em cascata
  // de todos os consumidores sempre que o Provider re-renderiza.
  // Sem isso, qualquer mudança de estado do Provider invalida a identidade
  // do objeto e força componentes que só leem `signOut` a re-renderizar.
  const contextValue = useMemo(
    () => ({
      user,
      doctorProfile,
      loading,
      isAuthenticated,
      profileComplete: user?.profileComplete !== false,
      refreshUser,
      setAuthFromLogin,
      signOut,
    }),
    [
      user,
      doctorProfile,
      loading,
      isAuthenticated,
      refreshUser,
      setAuthFromLogin,
      signOut,
    ]
  );

  return (
    <DoctorAuthContext.Provider value={contextValue}>
      {children}
    </DoctorAuthContext.Provider>
  );
}
