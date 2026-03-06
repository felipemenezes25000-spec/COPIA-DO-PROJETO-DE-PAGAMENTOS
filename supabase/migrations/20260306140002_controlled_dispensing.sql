-- ============================================================
-- RENOVEJÁ — Controle de dispensação de receitas controladas
-- Migração: 20260306140002_controlled_dispensing.sql
-- ============================================================

ALTER TABLE IF EXISTS public.prescriptions
  ADD COLUMN IF NOT EXISTS dispensed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS dispensed_pharmacy TEXT,
  ADD COLUMN IF NOT EXISTS dispensed_pharmacist TEXT;

-- Evita "desdispensar" (voltar para null)
CREATE OR REPLACE FUNCTION public.prevent_dispensed_reset()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.dispensed_at IS NOT NULL AND NEW.dispensed_at IS NULL THEN
    RAISE EXCEPTION 'dispensed_at não pode voltar para NULL após dispensação';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_dispensed_reset ON public.prescriptions;
CREATE TRIGGER trg_prevent_dispensed_reset
BEFORE UPDATE ON public.prescriptions
FOR EACH ROW EXECUTE FUNCTION public.prevent_dispensed_reset();

-- Índice para lookup de prescrições ativas
CREATE INDEX IF NOT EXISTS idx_requests_patient_status
  ON public.requests(patient_id, status);
