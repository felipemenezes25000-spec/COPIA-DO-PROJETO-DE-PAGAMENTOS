-- ============================================================
-- Script: Seed de 10 consultas fake (paid + consultation_ready)
-- Uso: Executar no Supabase SQL Editor ou psql
-- Cria usuários fake se não existirem, depois insere as requests.
-- Cada execução adiciona 10 novas consultas (5 paid, 5 consultation_ready).
-- ============================================================

-- 1. Criar paciente fake se não existir nenhum
INSERT INTO public.users (id, name, email, password_hash, role, profile_complete, created_at, updated_at)
SELECT
    'a1111111-1111-1111-1111-111111111111'::uuid,
    'Paciente Fake Seed',
    'paciente.fake.seed@example.com',
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    'patient',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE email = 'paciente.fake.seed@example.com');

-- 2. Criar médico fake se não existir nenhum
INSERT INTO public.users (id, name, email, password_hash, role, profile_complete, created_at, updated_at)
SELECT
    'b2222222-2222-2222-2222-222222222222'::uuid,
    'Dr. Médico Fake Seed',
    'medico.fake.seed@example.com',
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    'doctor',
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE email = 'medico.fake.seed@example.com');

-- 3. Criar doctor_profile para o médico fake se não existir
INSERT INTO public.doctor_profiles (id, user_id, crm, crm_state, specialty, bio, rating, total_consultations, available, crm_validated, created_at)
SELECT
    'c3333333-3333-3333-3333-333333333333'::uuid,
    'b2222222-2222-2222-2222-222222222222'::uuid,
    '123456',
    'SP',
    'Clínico Geral',
    'Médico fake para testes',
    5.0,
    0,
    true,
    false,
    NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.doctor_profiles WHERE user_id = 'b2222222-2222-2222-2222-222222222222'::uuid);

-- 4. Inserir 10 consultas fake (5 paid + 5 consultation_ready)
DO $$
DECLARE
  v_patient_id uuid;
  v_doctor_id uuid;
  v_patient_name text;
  v_doctor_name text;
  i int;
  v_status text;
  v_request_id uuid;
BEGIN
  SELECT id, name INTO v_patient_id, v_patient_name FROM public.users WHERE email = 'felipemenezes25000@gmail.com' LIMIT 1;
  IF v_patient_id IS NULL THEN
    SELECT id, name INTO v_patient_id, v_patient_name FROM public.users WHERE role = 'patient' ORDER BY created_at LIMIT 1;
  END IF;
  SELECT id, name INTO v_doctor_id, v_doctor_name FROM public.users WHERE email = 'contato@renovejasaude.com.br' LIMIT 1;
  IF v_doctor_id IS NULL THEN
    SELECT id, name INTO v_doctor_id, v_doctor_name FROM public.users WHERE role = 'doctor' ORDER BY created_at LIMIT 1;
  END IF;

  v_patient_id := COALESCE(v_patient_id, 'a1111111-1111-1111-1111-111111111111'::uuid);
  v_doctor_id := COALESCE(v_doctor_id, 'b2222222-2222-2222-2222-222222222222'::uuid);
  v_patient_name := COALESCE(v_patient_name, 'Paciente Fake');
  v_doctor_name := COALESCE(v_doctor_name, 'Dr. Fake');

  FOR i IN 1..10 LOOP
    v_status := CASE WHEN i <= 5 THEN 'paid' ELSE 'consultation_ready' END;

    INSERT INTO public.requests (
      patient_id, patient_name, doctor_id, doctor_name,
      request_type, status, symptoms, price, notes,
      consultation_type, contracted_minutes, price_per_minute,
      created_at, updated_at
    ) VALUES (
      v_patient_id, v_patient_name, v_doctor_id, v_doctor_name,
      'consultation', v_status,
      'Dor de cabeça, febre leve - seed fake #' || i,
      99.90, 'Consulta fake para testes',
      'medico_clinico', 15, 6.66,
      NOW() - (i * interval '1 hour'), NOW()
    )
    RETURNING id INTO v_request_id;

    -- Para status paid: criar registro de pagamento confirmado (payments usa 'approved', não 'paid')
    IF v_status = 'paid' THEN
      INSERT INTO public.payments (request_id, user_id, amount, status, payment_method, paid_at, created_at, updated_at)
      VALUES (v_request_id, v_patient_id, 99.90, 'approved', 'pix', NOW(), NOW(), NOW());
    END IF;
  END LOOP;
END $$;

-- Verificar: listar consultas fake criadas
-- SELECT id, status, symptoms, created_at FROM public.requests WHERE symptoms LIKE '%seed fake%' ORDER BY created_at DESC;
