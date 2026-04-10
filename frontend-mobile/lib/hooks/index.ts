/**
 * React Query hooks — barrel export.
 *
 * All data-fetching hooks centralized here.
 * Screens should import from this file:
 *   import { useRequestDetailQuery } from '../lib/hooks';
 */

// ── Request Lists ───────────────────────────────────────────────
export {
  useRequestsQuery,
  useInvalidateRequests,
  useRefetchRequests,
  getCachedRequests,
  REQUESTS_QUERY_KEY,
} from './useRequestsQuery';

export {
  useDoctorRequestsQuery,
  useInvalidateDoctorRequests,
  DOCTOR_REQUESTS_QUERY_KEY,
} from './useDoctorRequestsQuery';

// ── Request Detail ──────────────────────────────────────────────
export {
  useRequestDetailQuery,
  useMarkDelivered,
  useCancelRequest,
  useDocumentUrl,
  useInvalidateRequestDetail,
  useOptimisticUpdateRequest,
  requestDetailKeys,
} from './useRequestDetailQuery';

// ── Create Request (mutations) ──────────────────────────────────
export {
  useCreatePrescription,
  useCreateExam,
  useCreateConsultation,
} from './useCreateRequest';

// ── Payment ─────────────────────────────────────────────────────
export {
  usePaymentQuery,
  usePaymentQueryHelpers,
  PaymentRedirectError,
} from './usePaymentQuery';

// ── Doctor Actions ──────────────────────────────────────────────
export {
  useDoctorActions,
} from './useDoctorActions';

// ── Patient Profile ─────────────────────────────────────────────
export {
  usePatientProfileQuery,
} from './usePatientProfileQuery';

// ── Batch Signature ─────────────────────────────────────────────
export {
  useBatchPendingQuery,
  useMarkReviewedMutation,
  useApproveForSigningMutation,
  useReviewAndApproveMutation,
  useSignBatchMutation,
  BATCH_SIGNATURE_QUERY_KEY,
  BATCH_SIGNATURE_PENDING_QUERY_KEY,
} from './useBatchSignature';
