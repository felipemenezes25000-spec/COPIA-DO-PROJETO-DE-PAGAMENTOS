import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Platform, Linking } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { nav, type AppRoute } from '../lib/navigation';
import { useAuth } from './AuthContext';
import { registerPushToken, unregisterPushToken } from '../lib/api';
import { setLastRegisteredPushToken } from '../lib/pushTokenRegistry';
import { showToast } from '../components/ui/Toast';
import { isExpoGo } from '../lib/expo-go';

// Push foi removido do Expo Go no SDK 53 — não carregar o módulo no Expo Go para evitar erro
// eslint-disable-next-line @typescript-eslint/no-require-imports -- conditional native module
const Notifications = isExpoGo ? null : require('expo-notifications');

interface NotificationContent {
  request?: { content?: { data?: Record<string, unknown> } };
}

if (Notifications) {
  Notifications.setNotificationHandler({
    handleNotification: async (notification: NotificationContent) => {
      // ── FILTRO POR ROLE ──
      // Se a notificação tem targetRole, só mostra se bater com o role ativo.
      // Isso evita que o médico receba heads-up de notificações de paciente e vice-versa.
      const data = notification?.request?.content?.data ?? {};
      const targetRole = data?.targetRole as string | undefined;

      // Importar user role dinâmicamente (evita circular dependency)
      let currentRole: string | null = null;
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        const storedUser = await AsyncStorage.getItem('@renoveja:user');
        if (storedUser) {
          const parsed = JSON.parse(storedUser);
          currentRole = parsed?.role ?? null;
        }
      } catch {}

      // Se targetRole está definido e não bate com o role ativo, suprime completamente.
      // Evita que médico receba notificações de paciente (e vice-versa) quando o mesmo
      // dispositivo tem token registrado em ambas as contas.
      if (targetRole && currentRole && targetRole !== currentRole) {
        return {
          shouldShowAlert: false,
          shouldPlaySound: false,
          shouldSetBadge: false,
          shouldShowBanner: false,
          shouldShowList: false,
        };
      }

      // Notificação relevante para o role ativo — mostrar com tudo
      return {
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      };
    },
  });
}

interface PushNotificationContextValue {
  lastNotificationAt: number;
}

const PushNotificationContext = createContext<PushNotificationContextValue | undefined>(undefined);

export function PushNotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const lastRegisteredToken = useRef<string | null>(null);
  const [lastNotificationAt, setLastNotificationAt] = useState(0);
  const userRef = useRef(user);
  const coldStartHandled = useRef(false);
  userRef.current = user;

  /**
   * Trata ações específicas baseadas no tipo da notificação.
   * Invalida queries e mostra toasts conforme necessário.
   */
  const handleNotificationType = useCallback(
    (type: string) => {
      const normalizedType = (type || '').toLowerCase().trim();

      switch (normalizedType) {
        case 'request_reopened_for_review': {
          // Invalida a lista de requisições do paciente para refletir o status atualizado
          queryClient.invalidateQueries({ queryKey: ['requests'] });
          showToast({
            message: 'Seu pedido foi reaberto para análise médica',
            type: 'info',
            duration: 5000,
          });
          break;
        }
        // Adicionar mais cases conforme necessário
        default:
          break;
      }
    },
    [queryClient]
  );

  /**
   * Navega para a tela correta com base no deepLink da notificação.
   *
   * PRIORIDADE:
   * 1. deepLink completo (renoveja://...) → Linking.openURL → resolve pelo expo-router
   * 2. requestId + targetRole → rota específica do role correto
   * 3. requestId + user.role (fallback legado)
   */
  const handleNotificationNavigation = useCallback(
    (data: Record<string, unknown>) => {
      const deepLink = data?.deepLink as string | undefined;
      const requestId = data?.requestId as string | undefined;
      const targetRole = data?.targetRole as string | undefined;

      // 1. Deep link completo → preferido (já contém a rota correta). Valida contra whitelist.
      // FIX M8: decode URI para tratar caracteres especiais (%20, etc)
      if (typeof deepLink === 'string' && deepLink.startsWith('renoveja://')) {
        let path: string;
        try { path = decodeURIComponent(deepLink.replace('renoveja://', '/')) || '/'; }
        catch { path = deepLink.replace('renoveja://', '/') || '/'; }
        const allowed = [
          '/request-detail/', '/doctor-request/', '/consultation-summary/',
          '/video/', '/doctor-requests', '/settings', '/doctor-dashboard',
          '/post-consultation-emit/', '/doctor-patient/',
        ];
        const norm = (s: string) => s.endsWith('/') ? s.slice(0, -1) : s;
        const normPath = norm(path);
        const isAllowed = allowed.some((p) => {
          const normP = norm(p);
          return normPath === normP || normPath.startsWith(normP + '/');
        });
        if (isAllowed && !path.includes('..')) {
          Linking.openURL(deepLink).catch((e) => { if (__DEV__) console.warn('[Push] openURL failed:', e); });
        }
        return;
      }

      // 2. Se temos requestId, navegar baseado em targetRole (não no role do user logado)
      if (requestId && typeof requestId === 'string') {
        const effectiveRole = targetRole || userRef.current?.role;
        const path = effectiveRole === 'doctor'
          ? `/doctor-request/${requestId}`
          : `/request-detail/${requestId}`;
        nav.push(router, path as AppRoute);
      }
    },
    [router]
  );

  // Reset cold-start flag when user changes (new login session)
  useEffect(() => {
    coldStartHandled.current = false;
  }, [user?.id]);

  /** Trata notificação pendente do cold start (app foi aberto pelo tap na notificação). */
  useEffect(() => {
    if (!Notifications || !user?.role || coldStartHandled.current) return;
    coldStartHandled.current = true;
    let cancelled = false;
    const timer = setTimeout(() => {
      if (cancelled) return;
      Notifications.getLastNotificationResponseAsync()
        .then((response: { notification?: { request?: { content?: { data?: Record<string, unknown> } } } } | null) => {
          if (cancelled || !response) return;
          const data = response?.notification?.request?.content?.data ?? {};
          handleNotificationNavigation(data);
        })
        .catch(() => {});
    }, 500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [user?.role, handleNotificationNavigation]);

  useEffect(() => {
    if (!Notifications) return;
    const sub = Notifications.addNotificationReceivedListener((notification: { request?: { content?: { data?: Record<string, unknown> } } }) => {
      setLastNotificationAt(Date.now());
      const data = notification?.request?.content?.data ?? {};
      const type = data?.type as string | undefined;
      if (type) {
        handleNotificationType(type);
      }
    });
    const responseSub = Notifications.addNotificationResponseReceivedListener((response: { notification?: { request?: { content?: { data?: Record<string, unknown> } } } }) => {
      const data = response?.notification?.request?.content?.data ?? {};
      const type = data?.type as string | undefined;
      if (type) {
        handleNotificationType(type);
      }
      handleNotificationNavigation(data);
    });
    return () => {
      sub.remove();
      responseSub.remove();
    };
  }, [handleNotificationNavigation, handleNotificationType]);

  useEffect(() => {
    if (!Notifications) return; // Expo Go: push não disponível
    if (Platform.OS === 'web') return; // push token não suportado na web
    if (!user) {
      lastRegisteredToken.current = null;
      setLastRegisteredPushToken(null);
      return;
    }

    let mounted = true;

    const registerToken = async () => {
      try {
        const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
        if (!projectId) {
          if (__DEV__) console.warn('[Push] projectId ausente — rode eas init e adicione projectId ao app.json');
          return;
        }

        // O gate /permissions já garantiu a concessão antes de chegar aqui.
        // Apenas verificamos — não pedimos de novo (evita duplicar o diálogo).
        const { status } = await Notifications.getPermissionsAsync();
        if (status !== 'granted') {
          if (__DEV__) console.warn('[Push] Permissao nao concedida — status:', status);
          return;
        }

        const tokenData = await Notifications.getExpoPushTokenAsync({
          projectId: projectId as string,
        });
        const token = typeof tokenData?.data === 'string' ? tokenData.data : null;
        if (!token || !mounted) return;

        await registerPushToken(token, Platform.OS);
        lastRegisteredToken.current = token;
        setLastRegisteredPushToken(token);
        if (__DEV__) {
          // eslint-disable-next-line no-console -- debug em __DEV__; nunca exponha prefixo do token
          console.log('[Push] Token registrado: [REDACTED]');
        }
      } catch (error) {
        if (__DEV__) console.warn('Push token registration failed:', error);
      }
    };

    registerToken();

    return () => {
      mounted = false;
    };
  }, [user]);

  // Unregister push token quando o usuário sai (logout). Erros silenciosos.
  // TODO: garantir que o backend invalida o token mesmo se a chamada falhar.
  useEffect(() => {
    if (user) return;
    const token = lastRegisteredToken.current;
    if (!token) return;
    unregisterPushToken(token).catch(() => {});
    lastRegisteredToken.current = null;
    setLastRegisteredPushToken(null);
  }, [user]);

    const pushCtxValue = React.useMemo(() => ({ lastNotificationAt }), [lastNotificationAt]);
  return (
    <PushNotificationContext.Provider value={pushCtxValue}>
      {children}
    </PushNotificationContext.Provider>
  );
}

export function usePushNotification() {
  const context = useContext(PushNotificationContext);
  return context ?? { lastNotificationAt: 0 };
}
