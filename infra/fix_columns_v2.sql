-- Colunas extras faltantes (Fase 2)
ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS clicksign_envelope_id TEXT;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS metadata TEXT;
ALTER TABLE public.prescriptions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE public.encounters ADD COLUMN IF NOT EXISTS finished_at TIMESTAMPTZ;
ALTER TABLE public.audit_events ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE public.ai_interaction_logs ADD COLUMN IF NOT EXISTS model_name TEXT;

-- Relaxar check constraint de payments para aceitar valores do Supabase
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_status_check;
ALTER TABLE public.payments ADD CONSTRAINT payments_status_check CHECK (status IN ('pending', 'paid', 'failed', 'refunded', 'cancelled', 'approved', 'rejected', 'in_process', 'authorized'));

SELECT 'Fix v2 aplicado!' AS result;
