-- Adiciona coluna graduation_year ao perfil do médico.
-- Usado pelo RH-renoveja como "ano de conclusão" para triagem de candidatos.
-- Nullable — cadastros antigos permanecem sem valor.
ALTER TABLE public.doctor_profiles
    ADD COLUMN IF NOT EXISTS graduation_year INT NULL;
