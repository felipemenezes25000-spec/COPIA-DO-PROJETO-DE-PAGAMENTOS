import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';
import { logger } from './logger';
import { trackError } from './analytics';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
  },
  // Erros de queries/mutations -> analytics (captura silenciosa global)
  queryCache: new QueryCache({
    onError: (error, query) => {
      const path = String(query.queryKey[0] ?? 'unknown');
      logger.exception('api', error, '[QueryCache] query error: ' + path);
      try { trackError('query_error', error instanceof Error ? error.message : String(error), path); } catch { /* noop */ }
    },
  }),
  mutationCache: new MutationCache({
    onError: (error) => {
      logger.exception('api', error, '[MutationCache] mutation error');
      try { trackError('mutation_error', error instanceof Error ? error.message : String(error)); } catch { /* noop */ }
    },
  }),
});
