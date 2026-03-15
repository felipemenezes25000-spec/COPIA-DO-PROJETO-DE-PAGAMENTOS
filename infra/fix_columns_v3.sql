-- Fix v3: ultimas colunas faltantes
ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS clicksign_document_id TEXT;
ALTER TABLE public.prescriptions ADD COLUMN IF NOT EXISTS verify_code_hash TEXT;
ALTER TABLE public.encounters ADD COLUMN IF NOT EXISTS channel TEXT;
ALTER TABLE public.audit_events ADD COLUMN IF NOT EXISTS entity_id TEXT;
ALTER TABLE public.ai_interaction_logs ADD COLUMN IF NOT EXISTS model_version TEXT;
SELECT 'Fix v3 OK!' AS result;
