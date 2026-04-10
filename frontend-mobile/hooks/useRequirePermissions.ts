/**
 * useRequirePermissions — gate de permissões obrigatórias.
 *
 * Usado nos layouts pós-login (patient/doctor). Checa câmera, microfone e
 * notificações no mount e sempre que o app volta para foreground (AppState
 * "active"). Se faltar qualquer uma, redireciona para /permissions com a
 * rota atual no query param `next`.
 */

import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useRouter } from 'expo-router';
import { allRequiredGranted } from '../lib/permissions';

export function useRequirePermissions(nextRoute: string) {
  const router = useRouter();
  const redirected = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      if (redirected.current) return;
      const ok = await allRequiredGranted();
      if (cancelled || ok || redirected.current) return;
      redirected.current = true;
      router.replace(
        `/permissions?next=${encodeURIComponent(nextRoute)}` as any,
      );
    };

    check();

    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') {
        redirected.current = false;
        check();
      }
    });

    return () => {
      cancelled = true;
      sub.remove();
    };
  }, [router, nextRoute]);
}
