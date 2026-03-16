-- ============================================================
-- Migration: colunas faltantes em requests (RDS / Postgres)
-- Aplicar em banco já existente (ex.: RDS) sem recriar tabelas.
-- Data: 2026-03-16
-- ============================================================

-- short_code (URLs curtas: /pedidos/11040ef97c6e)
ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS short_code TEXT;
UPDATE public.requests
SET short_code = lower(substring(replace(id::text, '-', ''), 1, 12))
WHERE short_code IS NULL;
CREATE INDEX IF NOT EXISTS idx_requests_short_code ON public.requests(short_code) WHERE short_code IS NOT NULL;

-- Conduta e triagem (Dra. Renova)
ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS auto_observation TEXT;
ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS doctor_conduct_notes TEXT;
ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS include_conduct_in_pdf BOOLEAN DEFAULT TRUE;
UPDATE public.requests SET include_conduct_in_pdf = TRUE WHERE include_conduct_in_pdf IS NULL;
ALTER TABLE public.requests ALTER COLUMN include_conduct_in_pdf SET DEFAULT TRUE;
ALTER TABLE public.requests ALTER COLUMN include_conduct_in_pdf SET NOT NULL;
ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS ai_conduct_suggestion TEXT;
ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS ai_suggested_exams TEXT;
ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS conduct_updated_at TIMESTAMPTZ;
ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS conduct_updated_by UUID REFERENCES public.users(id);

-- WebRTC / chamada (timer de consulta)
ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS doctor_call_connected_at TIMESTAMPTZ;
ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS patient_call_connected_at TIMESTAMPTZ;

-- Índices para conduta/auditoria
CREATE INDEX IF NOT EXISTS idx_requests_has_conduct ON public.requests(doctor_conduct_notes) WHERE doctor_conduct_notes IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_requests_conduct_audit ON public.requests(conduct_updated_by, conduct_updated_at) WHERE conduct_updated_at IS NOT NULL;

SELECT 'Migration 20260316_requests_missing_columns aplicada.' AS result;
