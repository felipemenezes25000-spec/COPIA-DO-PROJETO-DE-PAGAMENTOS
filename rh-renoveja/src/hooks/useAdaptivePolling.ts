import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Retorna o intervalo atual de polling (em ms) baseado em 3 sinais:
 *  - visibilidade da aba (Page Visibility API)      → `hidden` pausa (null)
 *  - ociosidade do usuário (>2min sem mouse/teclado) → usa `idleInterval`
 *  - caso contrário                                  → usa `activeInterval`
 *
 * O hook não faz o fetch — só entrega o intervalo atual. O caller (via
 * `usePoll` abaixo) é quem dispara a função de busca.
 *
 * Por que "adaptativo":
 * - Admin sai pra almoçar → aba em background → zero requests. Trinta minutos
 *   de inatividade não custam nada.
 * - Admin abre a aba rápido pra ver a fila → intervalo curto, vê tudo ao vivo.
 * - Admin deixa aba aberta mas foi lidar com outra coisa → intervalo longo,
 *   ainda atualiza mas sem stress.
 */
export function useAdaptivePolling(
  activeInterval: number = 10_000,
  idleInterval: number = 60_000,
  idleAfterMs: number = 120_000,
): number | null {
  const [interval, setInterval] = useState<number | null>(activeInterval);
  const lastActivityRef = useRef<number>(Date.now());

  useEffect(() => {
    // Math.random() apenas no mount para não depender de `interval` no effect
    const markActive = () => {
      lastActivityRef.current = Date.now();
    };

    const recompute = () => {
      if (typeof document === 'undefined') return;
      if (document.visibilityState === 'hidden') {
        setInterval(null);
        return;
      }
      const idleFor = Date.now() - lastActivityRef.current;
      setInterval(idleFor > idleAfterMs ? idleInterval : activeInterval);
    };

    const onVisibility = () => recompute();
    const onActivity = () => {
      markActive();
      recompute();
    };

    document.addEventListener('visibilitychange', onVisibility);
    // Passive listeners para não penalizar scroll
    window.addEventListener('mousemove', onActivity, { passive: true });
    window.addEventListener('keydown', onActivity);
    window.addEventListener('focus', onActivity);

    // Recomputa periodicamente (a cada 5s) para detectar transições de
    // active → idle sem precisar de evento do usuário.
    const tick = window.setInterval(recompute, 5_000);
    recompute();

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('mousemove', onActivity);
      window.removeEventListener('keydown', onActivity);
      window.removeEventListener('focus', onActivity);
      window.clearInterval(tick);
    };
  }, [activeInterval, idleInterval, idleAfterMs]);

  return interval;
}

/**
 * Hook de alto nível: combina `useAdaptivePolling` com um fetcher que
 * respeita AbortController. Retorna `data`, `error`, `loading` e um
 * `refresh()` manual. O fetch roda:
 *   1. imediatamente ao montar
 *   2. sempre que o intervalo adaptativo dispara
 *   3. ao chamar `refresh()`
 *
 * Se o intervalo vira `null` (background tab), o polling pausa completamente.
 */
export interface UsePollResult<T> {
  data: T | null;
  error: unknown;
  loading: boolean;
  refresh: () => void;
  lastUpdated: Date | null;
}

export function usePoll<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  options: {
    activeInterval?: number;
    idleInterval?: number;
    deps?: unknown[];
  } = {},
): UsePollResult<T> {
  const interval = useAdaptivePolling(
    options.activeInterval ?? 10_000,
    options.idleInterval ?? 60_000,
  );
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  const refresh = useCallback(() => {
    setRefreshNonce((n) => n + 1);
  }, []);

  // dependências do effect: interval (pode ficar null), nonce, e as deps do caller
  const depsKey = JSON.stringify(options.deps ?? []);

  useEffect(() => {
    let cancelled = false;

    const doFetch = async () => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setLoading(true);
      try {
        const result = await fetcher(ctrl.signal);
        if (cancelled) return;
        setData(result);
        setError(null);
        setLastUpdated(new Date());
      } catch (err) {
        if (cancelled) return;
        // Cancelamentos NÃO contam como erro — só significa que outro fetch
        // mais recente começou (ou a aba ficou invisível).
        const anyErr = err as { name?: string; code?: string };
        if (anyErr?.name === 'CanceledError' || anyErr?.code === 'ERR_CANCELED') return;
        setError(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    // Fetch imediato
    doFetch();

    // Polling
    let timer: number | undefined;
    if (interval !== null) {
      timer = window.setInterval(doFetch, interval);
    }

    return () => {
      cancelled = true;
      abortRef.current?.abort();
      if (timer !== undefined) window.clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interval, refreshNonce, depsKey]);

  return { data, error, loading, refresh, lastUpdated };
}
