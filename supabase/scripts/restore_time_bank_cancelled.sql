-- Restaura banco de horas para consultas canceladas que debitaram mas não creditaram.
-- Caso: consultas que falharam no PATCH (price constraint) e foram canceladas — minutos foram debitados mas nunca creditados.
--
-- Uso: Execute no Supabase SQL Editor.
-- Substitua 'SEU_PATIENT_ID' pelo UUID do paciente.
-- Ex: a1eb1a43-af19-46b7-af8e-51dbcb3ac0ac (Felipe Menezes do erro Sentry)

DO $$
DECLARE
  v_patient_id UUID := 'a1eb1a43-af19-46b7-af8e-51dbcb3ac0ac'::UUID;  -- Altere se for outro paciente
  v_rec RECORD;
  v_debited INT;
  v_new_balance INT;
BEGIN
  FOR v_rec IN (
    SELECT r.id AS request_id, r.patient_id, r.consultation_type,
           COALESCE(SUM(ABS(t.delta_seconds)), 0)::INT AS debited
    FROM public.requests r
    JOIN public.consultation_time_bank_transactions t
      ON t.request_id = r.id AND t.delta_seconds < 0 AND t.reason = 'used_for_consultation'
    WHERE r.status = 'cancelled'
      AND r.request_type = 'consultation'
      AND r.consultation_type IS NOT NULL
      AND r.patient_id = v_patient_id
    GROUP BY r.id, r.patient_id, r.consultation_type
    HAVING COALESCE(SUM(ABS(t.delta_seconds)), 0) > 0
  )
  LOOP
    -- Evitar double-refund: já existe refund_cancelled para este request?
    IF NOT EXISTS (
      SELECT 1 FROM public.consultation_time_bank_transactions
      WHERE request_id = v_rec.request_id AND reason = 'refund_cancelled'
    ) THEN
      v_debited := v_rec.debited;

      -- Atualizar ou inserir no banco de horas
      INSERT INTO public.consultation_time_bank (id, patient_id, consultation_type, balance_seconds, last_updated_at, created_at)
      VALUES (gen_random_uuid(), v_rec.patient_id, v_rec.consultation_type, v_debited, NOW(), NOW())
      ON CONFLICT (patient_id, consultation_type) DO UPDATE SET
        balance_seconds = public.consultation_time_bank.balance_seconds + v_debited,
        last_updated_at = NOW();

      -- Registrar transação de estorno
      INSERT INTO public.consultation_time_bank_transactions
        (id, patient_id, request_id, consultation_type, delta_seconds, reason, created_at)
      VALUES (gen_random_uuid(), v_rec.patient_id, v_rec.request_id, v_rec.consultation_type, v_debited, 'refund_cancelled', NOW());

      RAISE NOTICE 'Creditado %s segundos para patient % (request %, type %)', v_debited, v_rec.patient_id, v_rec.request_id, v_rec.consultation_type;
    END IF;
  END LOOP;
END $$;
