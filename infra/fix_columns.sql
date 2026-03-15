-- Colunas extras que existem no Supabase mas não no schema RDS
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 0;
ALTER TABLE public.doctor_profiles ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 0;
ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 0;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 0;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS correlation_id TEXT;
ALTER TABLE public.consultation_anamnesis ADD COLUMN IF NOT EXISTS transcript_file_url TEXT;
ALTER TABLE public.push_tokens ADD COLUMN IF NOT EXISTS role TEXT;
ALTER TABLE public.prescriptions ADD COLUMN IF NOT EXISTS issued_at TIMESTAMPTZ;
ALTER TABLE public.encounters ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE public.audit_events ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id);
ALTER TABLE public.ai_interaction_logs ADD COLUMN IF NOT EXISTS service_name TEXT;
SELECT 'Colunas adicionadas!' AS result;
