-- ============================================================
-- RENOVEJÁ — AI interaction logs (conformidade/auditoria)
-- Migração: 20260306140000_ai_interaction_logs.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS public.ai_interaction_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_name TEXT NOT NULL,
    model_name TEXT NOT NULL,
    model_version TEXT,
    prompt_hash TEXT NOT NULL,
    response_summary TEXT,
    tokens_used INTEGER,
    duration_ms BIGINT,
    request_id UUID REFERENCES public.requests(id) ON DELETE SET NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    success BOOLEAN NOT NULL DEFAULT TRUE,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_interaction_logs_created_at
  ON public.ai_interaction_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_interaction_logs_request_id
  ON public.ai_interaction_logs(request_id);

ALTER TABLE public.ai_interaction_logs ENABLE ROW LEVEL SECURITY;

-- Usuário vê somente os seus próprios logs
DROP POLICY IF EXISTS ai_logs_select_own ON public.ai_interaction_logs;
CREATE POLICY ai_logs_select_own ON public.ai_interaction_logs
  FOR SELECT USING (user_id = auth.uid());
