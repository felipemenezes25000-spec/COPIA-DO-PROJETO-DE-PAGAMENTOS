/**
 * NotificationContext — Global unread count + polling adaptativo.
 *
 * Padrão baseado no mobile (NotificationContext.tsx):
 * - Polling a cada 30s (normal) ou 60s (slow mode após 5 polls sem mudança)
 * - Integração com SignalR: refresh ao receber RequestUpdated
 * - Operações otimistas: markAllRead zera imediatamente, rollback se falhar
 */
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import {
  getUnreadNotificationCount,
  markAllNotificationsRead,
} from '@/services/doctorApi';
import { useDoctorAuth } from '@/hooks/useDoctorAuth';
import { useRequestEvents } from '@/hooks/useSignalR';

const POLL_INTERVAL_MS = 30_000;
const POLL_INTERVAL_SLOW_MS = 60_000;
const UNCHANGED_THRESHOLD = 5;
const MIN_INTERVAL_MS = 5_000;

interface NotificationContextValue {
  unreadCount: number;
  refreshUnreadCount: () => Promise<void>;
  decrementUnreadCount: () => void;
  markAllReadOptimistic: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue>({
  unreadCount: 0,
  refreshUnreadCount: async () => {},
  decrementUnreadCount: () => {},
  markAllReadOptimistic: async () => {},
});

// eslint-disable-next-line react-refresh/only-export-components
export function useNotifications() {
  return useContext(NotificationContext);
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useDoctorAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const unchangedRef = useRef(0);
  const lastFetchRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fetchingRef = useRef(false);
  const isAuthenticatedRef = useRef(isAuthenticated);
  useEffect(() => {
    isAuthenticatedRef.current = isAuthenticated;
  }, [isAuthenticated]);

  const fetchCount = useCallback(async (auth: boolean) => {
    if (!auth) return;
    if (fetchingRef.current) return;
    const now = Date.now();
    if (now - lastFetchRef.current < MIN_INTERVAL_MS) return;
    lastFetchRef.current = now;
    fetchingRef.current = true;

    try {
      const count = await getUnreadNotificationCount();
      setUnreadCount((prev) => {
        if (prev === count) {
          unchangedRef.current += 1;
        } else {
          unchangedRef.current = 0;
        }
        return count;
      });
    } catch (e) {
      // Polling de notificações: erros são esperados (offline, 401 transitório).
      // Logar em dev mas não alertar o usuário — UI segue mostrando contagem anterior.
      if (import.meta.env.DEV)
        console.warn('[NotificationContext] fetchCount falhou:', e);
    } finally {
      fetchingRef.current = false;
    }
  }, []);

  // Polling when authenticated; reset when logged out
  useEffect(() => {
    if (!isAuthenticated) {
      // Intentional: reset count synchronously when user logs out
      setUnreadCount(0);
      unchangedRef.current = 0;
      return;
    }

    fetchCount(true);

    let cancelled = false;

    function schedule() {
      if (cancelled) return;
      const interval =
        unchangedRef.current >= UNCHANGED_THRESHOLD
          ? POLL_INTERVAL_SLOW_MS
          : POLL_INTERVAL_MS;
      timerRef.current = setTimeout(async () => {
        if (cancelled) return;
        await fetchCount(true);
        schedule();
      }, interval);
    }

    schedule();

    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isAuthenticated, fetchCount]);

  // Refresh on SignalR event — check auth ref to avoid race condition on logout
  const handleSignalREvent = useCallback(() => {
    if (!isAuthenticatedRef.current) return;
    unchangedRef.current = 0;
    fetchCount(true);
  }, [fetchCount]);

  useRequestEvents(handleSignalREvent);

  // Refresh on tab focus
  useEffect(() => {
    const onFocus = () => {
      unchangedRef.current = 0;
      fetchCount(true);
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [fetchCount]);

  const decrementUnreadCount = useCallback(() => {
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }, []);

  const markAllReadOptimistic = useCallback(async () => {
    let prevCount = 0;
    setUnreadCount((prev) => {
      prevCount = prev;
      return 0;
    });
    try {
      await markAllNotificationsRead();
    } catch {
      setUnreadCount(prevCount);
      throw new Error('Erro ao marcar todas como lidas');
    }
  }, []);

  const refreshUnreadCount = useCallback(() => fetchCount(true), [fetchCount]);

  const contextValue = useMemo<NotificationContextValue>(
    () => ({
      unreadCount,
      refreshUnreadCount,
      decrementUnreadCount,
      markAllReadOptimistic,
    }),
    [
      unreadCount,
      refreshUnreadCount,
      decrementUnreadCount,
      markAllReadOptimistic,
    ]
  );

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
}
