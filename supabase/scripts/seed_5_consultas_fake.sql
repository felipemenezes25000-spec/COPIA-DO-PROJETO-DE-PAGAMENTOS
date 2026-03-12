-- ============================================================
-- Seed: 5 consultas fake para testar sem pagar
-- As consultas já vêm com status PAID (prontas para entrar e testar).
--
-- Como usar:
-- 1. Execute no Supabase SQL Editor (ou psql)
-- 2. Faça login no app com o email do paciente usado
-- 3. As 5 consultas aparecerão na lista para testar
--
-- Se v_patient_email = NULL, usa o 1º paciente do banco.
-- ============================================================

DO $$
DECLARE
  v_patient_email text := 'felipemenezes25000@gmail.com';  -- Paciente para ver no app
  v_patient_id uuid;
  v_doctor_id uuid;
  v_patient_name text;
  v_doctor_name text;
  v_request_id uuid;
  i int;
BEGIN
  -- Paciente: por email se definido, senão primeiro paciente
  IF v_patient_email IS NOT NULL AND v_patient_email != '' THEN
    SELECT id, name INTO v_patient_id, v_patient_name
    FROM public.users WHERE role = 'patient' AND email = v_patient_email LIMIT 1;
  END IF;
  IF v_patient_id IS NULL THEN
    SELECT id, name INTO v_patient_id, v_patient_name
    FROM public.users WHERE role = 'patient' ORDER BY created_at LIMIT 1;
  END IF;

  SELECT id, name INTO v_doctor_id, v_doctor_name
  FROM public.users WHERE role = 'doctor' ORDER BY created_at LIMIT 1;

  IF v_patient_id IS NULL THEN
    RAISE EXCEPTION 'Nenhum paciente cadastrado. Cadastre um paciente antes de rodar o seed.';
  END IF;
  IF v_doctor_id IS NULL THEN
    RAISE EXCEPTION 'Nenhum médico cadastrado. Cadastre um médico antes de rodar o seed.';
  END IF;
  v_patient_name := COALESCE(v_patient_name, 'Paciente');
  v_doctor_name := COALESCE(v_doctor_name, 'Médico');

  -- 5 CONSULTAS fake (status paid - prontas para testar)
  FOR i IN 1..5 LOOP
    INSERT INTO public.requests (
      patient_id, patient_name, doctor_id, doctor_name,
      request_type, status, symptoms, price, notes,
      consultation_type, contracted_minutes, price_per_minute,
      created_at, updated_at
    ) VALUES (
      v_patient_id, v_patient_name, v_doctor_id, v_doctor_name,
      'consultation', 'paid',
      'Consulta fake #' || i || ' - dor de cabeça, febre leve (teste)',
      99.90, 'Consulta fake para entrar e testar sem pagar',
      'medico_clinico', 15, 6.66,
      NOW() - (i * interval '1 hour'), NOW()
    )
    RETURNING id INTO v_request_id;

    -- Registro de pagamento (simula que já foi pago - amount > 0 exigido pela constraint)
    INSERT INTO public.payments (request_id, user_id, amount, status, payment_method, paid_at, created_at, updated_at)
    VALUES (v_request_id, v_patient_id, 99.90, 'approved', 'pix', NOW(), NOW(), NOW());
  END LOOP;

  RAISE NOTICE 'OK: 5 consultas fake criadas para % (%). Faça login com essa conta no app.', v_patient_name, (SELECT email FROM public.users WHERE id = v_patient_id);
END $$;
