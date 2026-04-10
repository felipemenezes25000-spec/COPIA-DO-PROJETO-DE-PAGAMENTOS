-- ============================================================
-- Migration: tabelas patients e consent_records (RDS / Postgres)
-- Necessárias para PatientRepository e ConsentRepository.
-- Aplicar em banco já existente. Ordem: patients antes de consent_records.
-- Data: 2026-03-16
-- ============================================================

-- patients (1:1 com users, módulo clínico)
CREATE TABLE IF NOT EXISTS public.patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    cpf TEXT NOT NULL,
    birth_date TIMESTAMPTZ,
    sex VARCHAR(20),
    social_name TEXT,
    phone TEXT,
    email TEXT,
    address_line1 TEXT,
    city VARCHAR(100),
    state VARCHAR(2),
    zip_code VARCHAR(10),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_patients_user_id ON public.patients(user_id);
CREATE INDEX IF NOT EXISTS idx_patients_cpf ON public.patients(cpf);

-- consent_records (referencia patients)
CREATE TABLE IF NOT EXISTS public.consent_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    consent_type TEXT NOT NULL,
    legal_basis TEXT NOT NULL,
    purpose TEXT NOT NULL,
    accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    channel TEXT NOT NULL,
    text_version TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_consent_records_patient_id ON public.consent_records(patient_id);

SELECT 'Migration 20260316_patients_consent_records aplicada.' AS result;
