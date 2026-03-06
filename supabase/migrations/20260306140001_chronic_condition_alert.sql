-- ============================================================
-- RENOVEJÁ — Regra 180 dias para crônicos (Res. CFM 2.314/2022)
-- Migração: 20260306140001_chronic_condition_alert.sql
-- ============================================================

ALTER TABLE IF EXISTS public.encounters
  ADD COLUMN IF NOT EXISTS is_presential BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE IF EXISTS public.patients
  ADD COLUMN IF NOT EXISTS has_chronic_condition BOOLEAN NOT NULL DEFAULT FALSE;

CREATE OR REPLACE FUNCTION public.get_days_since_last_presential(patient_uuid UUID)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  last_presential TIMESTAMPTZ;
BEGIN
  SELECT MAX(started_at)
    INTO last_presential
  FROM public.encounters
  WHERE patient_id = patient_uuid
    AND is_presential = TRUE;

  IF last_presential IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN FLOOR(EXTRACT(EPOCH FROM (NOW() - last_presential)) / 86400)::INTEGER;
END;
$$;
