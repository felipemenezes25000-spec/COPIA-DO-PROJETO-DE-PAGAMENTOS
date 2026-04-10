/**
 * api-batch-signature — Cliente HTTP para os endpoints de assinatura em lote.
 *
 * Fluxo:
 *  1. Médico revisa um pedido                      → markRequestReviewed
 *  2. Médico aprova para entrar no lote             → approveForSigning
 *  3. Combinação das duas etapas anteriores         → reviewAndApprove
 *  4. Listar pedidos prontos para assinar           → getPendingBatchSignature
 *  5. Assinar todos (ou um subconjunto) de uma vez  → signBatch
 */

import { apiClient } from './api-client';

// ============================================
// DTOs
// ============================================

export interface BatchSignatureItemResult {
  requestId: string;
  success: boolean;
  errorMessage: string | null;
}

export interface BatchSignatureResult {
  signedCount: number;
  failedCount: number;
  items: BatchSignatureItemResult[];
  message: string;
}

export interface BatchSignRequestParams {
  requestIds: string[];
  pfxPassword: string;
}

// ============================================
// ENDPOINTS
// ============================================

/** Marca um pedido como revisado pelo médico. */
export async function markRequestReviewed(requestId: string): Promise<void> {
  await apiClient.post<void>(`/api/batch-signature/${requestId}/review`, {});
}

/** Aprova um pedido para entrar na fila de assinatura em lote. */
export async function approveForSigning(requestId: string): Promise<void> {
  await apiClient.post<void>(`/api/batch-signature/${requestId}/approve-for-signing`, {});
}

/**
 * Marca o pedido como revisado e aprova para assinatura em lote numa única chamada.
 * Usa o endpoint combinado introduzido no backend.
 */
export async function reviewAndApprove(requestId: string): Promise<void> {
  await apiClient.post<void>(`/api/batch-signature/${requestId}/review-and-approve`, {});
}

/** Lista os IDs dos pedidos prontos para assinatura em lote do médico autenticado. */
export async function getPendingBatchSignature(): Promise<string[]> {
  return apiClient.get<string[]>('/api/batch-signature/pending');
}

/**
 * Timeout para o endpoint de assinatura em lote.
 *
 * O batch pode ter até 50 documentos (MaxItemsPerBatch no backend), cada um
 * gerando PDF + assinatura PAdES + upload S3 (~3s por item em condições
 * normais). 180s = 3 minutos dá margem para batches grandes em redes lentas
 * sem travar o modal indefinidamente se o backend morrer silenciosamente.
 *
 * Sem este timeout explícito, o modal ficaria em estado "signing" até o
 * REQUEST_TIMEOUT_MS padrão do api-client (normalmente 30-60s), que é curto
 * demais para batches maiores.
 */
const BATCH_SIGN_TIMEOUT_MS = 180_000;

/**
 * Assina em lote os pedidos informados usando o certificado ICP-Brasil (PFX).
 * Nunca logar `pfxPassword` em hipótese alguma.
 */
export async function signBatch(
  params: BatchSignRequestParams
): Promise<BatchSignatureResult> {
  return apiClient.post<BatchSignatureResult>(
    '/api/batch-signature/sign',
    {
      requestIds: params.requestIds,
      pfxPassword: params.pfxPassword,
    },
    { timeoutMs: BATCH_SIGN_TIMEOUT_MS },
  );
}
