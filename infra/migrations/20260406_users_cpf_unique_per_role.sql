-- ============================================================
-- Migration: CPF único por (cpf, role) na tabela users
-- Data: 2026-04-06
-- ============================================================
-- Permite que a mesma pessoa física (mesmo CPF) tenha dois cadastros
-- desde que com roles diferentes (ex.: paciente e médico),
-- mas bloqueia duplicatas dentro da mesma role.
-- Index parcial: ignora linhas com cpf NULL (usuários Google antes do complete-profile).
-- ============================================================

-- 1) Detectar duplicatas pré-existentes (não falha — só loga aviso).
--    Se aparecer warning, resolver manualmente antes do CREATE UNIQUE INDEX.
DO $$
DECLARE
    dup_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO dup_count
    FROM (
        SELECT cpf, role
        FROM public.users
        WHERE cpf IS NOT NULL
        GROUP BY cpf, role
        HAVING COUNT(*) > 1
    ) dups;
    IF dup_count > 0 THEN
        RAISE WARNING 'users: % grupo(s) (cpf, role) duplicados encontrados — CREATE UNIQUE INDEX falhará. Resolva manualmente antes.', dup_count;
    END IF;
END $$;

-- 2) Index único parcial em (cpf, role).
CREATE UNIQUE INDEX IF NOT EXISTS users_cpf_role_unique
    ON public.users (cpf, role)
    WHERE cpf IS NOT NULL;

-- 3) Remover o index não-único antigo (substituído pelo composto acima).
DROP INDEX IF EXISTS public.idx_users_cpf;
