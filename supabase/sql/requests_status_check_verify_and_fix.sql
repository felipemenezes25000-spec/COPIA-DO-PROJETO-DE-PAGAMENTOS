-- ============================================================
-- Verify + Fix: requests_status_check (consultation flow)
-- ============================================================
-- Use no Supabase SQL Editor (produção/homologação)

-- 1) Ver status atuais existentes na tabela (diagnóstico rápido)
SELECT status, COUNT(*)
FROM public.requests
GROUP BY status
ORDER BY status;

-- 2) Ver definição atual da constraint requests_status_check
SELECT tc.constraint_name,
       cc.check_clause
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc
  ON cc.constraint_name = tc.constraint_name
WHERE tc.table_schema = 'public'
  AND tc.table_name = 'requests'
  AND tc.constraint_name = 'requests_status_check';

-- 3) Fix idempotente da constraint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'requests'
      AND constraint_name = 'requests_status_check'
      AND constraint_type = 'CHECK'
  ) THEN
    ALTER TABLE public.requests DROP CONSTRAINT requests_status_check;
  END IF;
END $$;

ALTER TABLE public.requests
  ADD CONSTRAINT requests_status_check
  CHECK (status IN (
    -- canônicos atuais
    'submitted',
    'in_review',
    'approved_pending_payment',
    'paid',
    'signed',
    'delivered',
    'rejected',
    'cancelled',
    'searching_doctor',
    'in_consultation',
    'consultation_finished',

    -- legados/compatibilidade histórica
    'pending',
    'analyzing',
    'approved',
    'pending_payment',
    'payment_pending',
    'in_queue',
    'consultation_ready',
    'awaiting_signature',
    'reanalysis_requested',
    'completed',
    'expired'
  ));

-- 4) Revalidar definição após fix
SELECT tc.constraint_name,
       cc.check_clause
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc
  ON cc.constraint_name = tc.constraint_name
WHERE tc.table_schema = 'public'
  AND tc.table_name = 'requests'
  AND tc.constraint_name = 'requests_status_check';

-- 5) Teste de sanidade do fluxo de consulta
-- (se já houver requests de consulta, verifique se existem em searching_doctor)
SELECT id, request_type, status, created_at
FROM public.requests
WHERE request_type = 'consultation'
ORDER BY created_at DESC
LIMIT 20;
