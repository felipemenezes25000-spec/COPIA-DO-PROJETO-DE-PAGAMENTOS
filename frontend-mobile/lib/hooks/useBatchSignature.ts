/**
 * useBatchSignature — Hooks React Query para assinatura em lote.
 *
 * Cobre:
 *  - Query de pedidos pendentes de assinatura em lote
 *  - Mutations de review / approve / review-and-approve
 *  - Mutation de assinatura em lote (retorna BatchSignatureResult)
 *
 * Todas as mutations invalidam as queries de pedidos do médico
 * (`['doctor-requests']`) e as de assinatura em lote (`['batch-signature']`)
 * ao concluírem com sucesso.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  approveForSigning,
  getPendingBatchSignature,
  markRequestReviewed,
  reviewAndApprove,
  signBatch,
  type BatchSignRequestParams,
  type BatchSignatureResult,
} from '../api-batch-signature';
import type { ApiError } from '../api-client';
import type { RequestResponseDto } from '../../types/database';
import { DOCTOR_REQUESTS_QUERY_KEY } from './useDoctorRequestsQuery';

/** Prefixo comum para logs deste módulo — facilita filtrar em Sentry/console. */
const LOG_PREFIX = '[batch-signature]';

function logMutationError(operation: string, error: unknown): void {
  // Nunca logamos o payload (pode conter senha do PFX). Apenas a operação e o erro.
  const status = (error as { status?: number })?.status;
  // eslint-disable-next-line no-console
  console.warn(`${LOG_PREFIX} ${operation} failed`, {
    status,
    message: (error as Error)?.message,
  });
}

// ============================================
// Query keys
// ============================================

export const BATCH_SIGNATURE_QUERY_KEY = ['batch-signature'] as const;
export const BATCH_SIGNATURE_PENDING_QUERY_KEY = [
  'batch-signature',
  'pending',
] as const;

// ============================================
// Queries
// ============================================

/**
 * Lista de pedidos prontos para assinatura em lote do médico autenticado.
 * - staleTime: 30s (dado muda com frequência moderada)
 * - refetchOnWindowFocus: true (atualiza ao voltar para a tela)
 *
 * NOTE: Currently unused by any consumer. Kept as future-proofing —
 * consumers (notably `BatchSignModal`) may call it to get a cached server
 * listing of batch-pending IDs instead of filtering `doctor-requests`
 * client-side. Safe to delete if it ever becomes dead weight.
 */
export function useBatchPendingQuery() {
  return useQuery<string[]>({
    queryKey: BATCH_SIGNATURE_PENDING_QUERY_KEY,
    queryFn: () => getPendingBatchSignature(),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: true,
    retry: (failureCount, error) => {
      const status = (error as { status?: number })?.status;
      if (status === 401 || status === 403) return false;
      return failureCount < 2;
    },
  });
}

// ============================================
// Helpers
// ============================================

/** Invalida as queries impactadas por uma mudança no fluxo de assinatura em lote. */
function invalidateBatchSignatureCaches(
  queryClient: ReturnType<typeof useQueryClient>
): void {
  queryClient.invalidateQueries({ queryKey: DOCTOR_REQUESTS_QUERY_KEY });
  queryClient.invalidateQueries({ queryKey: BATCH_SIGNATURE_QUERY_KEY });
}

// ============================================
// Mutations
// ============================================

/** Marca um pedido como revisado pelo médico. */
export function useMarkReviewedMutation() {
  const queryClient = useQueryClient();

  return useMutation<void, ApiError, string>({
    mutationFn: (requestId: string) => markRequestReviewed(requestId),
    onSuccess: () => {
      invalidateBatchSignatureCaches(queryClient);
    },
    onError: (error) => logMutationError('markReviewed', error),
  });
}

/** Aprova o pedido para entrar na fila de assinatura em lote. */
export function useApproveForSigningMutation() {
  const queryClient = useQueryClient();

  return useMutation<void, ApiError, string>({
    mutationFn: (requestId: string) => approveForSigning(requestId),
    onSuccess: () => {
      invalidateBatchSignatureCaches(queryClient);
    },
    onError: (error) => logMutationError('approveForSigning', error),
  });
}

/**
 * Endpoint combinado: marca como revisado e aprova para o lote de uma vez.
 *
 * Aplica uma atualização otimista na query `doctor-requests`: move o
 * pedido de `'approved'` (a visualizar) para `'paid'` (aprovado) antes
 * da resposta do servidor, revertendo em caso de erro. Isso faz o
 * contador do banner "Aprovar N documentos" atualizar instantaneamente.
 *
 * Contexto de tipo: `doctor-requests` guarda um `RequestResponseDto[]`
 * direto no cache (ver `useDoctorRequestsQuery.ts`), NÃO um objeto
 * `{ items: [] }`. O updater abaixo reflete isso.
 */
export function useReviewAndApproveMutation() {
  const queryClient = useQueryClient();

  return useMutation<
    void,
    ApiError,
    string,
    { previous: RequestResponseDto[] | undefined }
  >({
    mutationFn: (requestId: string) => reviewAndApprove(requestId),
    onMutate: async (requestId) => {
      await queryClient.cancelQueries({ queryKey: DOCTOR_REQUESTS_QUERY_KEY });
      const previous = queryClient.getQueryData<RequestResponseDto[]>(
        DOCTOR_REQUESTS_QUERY_KEY
      );
      if (previous) {
        queryClient.setQueryData<RequestResponseDto[]>(
          DOCTOR_REQUESTS_QUERY_KEY,
          previous.map((r) =>
            r.id === requestId ? { ...r, status: 'paid' } : r
          )
        );
      }
      return { previous };
    },
    onError: (error, _id, ctx) => {
      logMutationError('reviewAndApprove', error);
      if (ctx?.previous) {
        queryClient.setQueryData(DOCTOR_REQUESTS_QUERY_KEY, ctx.previous);
      }
    },
    onSettled: () => {
      invalidateBatchSignatureCaches(queryClient);
    },
  });
}

/**
 * Assina em lote os pedidos informados.
 * O resultado (`BatchSignatureResult`) traz os sucessos e falhas por pedido —
 * o chamador deve exibir ao usuário e tratar falhas parciais.
 */
export function useSignBatchMutation() {
  const queryClient = useQueryClient();

  return useMutation<BatchSignatureResult, ApiError, BatchSignRequestParams>({
    mutationFn: (params: BatchSignRequestParams) => signBatch(params),
    onSuccess: () => {
      invalidateBatchSignatureCaches(queryClient);
    },
    onError: (error) => logMutationError('signBatch', error),
  });
}
