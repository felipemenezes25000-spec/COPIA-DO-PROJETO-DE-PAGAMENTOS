-- Auditoria 100%: old_values e new_values para rastrear alterações antes/depois
-- Permite auditoria completa de edições no prontuário (conduta, anamnese, plano, notas)

ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS old_values JSONB,
  ADD COLUMN IF NOT EXISTS new_values JSONB;

COMMENT ON COLUMN public.audit_logs.old_values IS 'Valores anteriores (para Update/Delete). Ex: {"anamnesis":"...","plan":"..."}';
COMMENT ON COLUMN public.audit_logs.new_values IS 'Valores novos (para Create/Update). Ex: {"anamnesis":"...","plan":"..."}';
