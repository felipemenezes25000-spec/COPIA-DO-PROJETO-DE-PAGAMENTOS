-- Torna o usuário com o ID informado um administrador (role = admin).
-- Execute no SQL Editor do Supabase (Dashboard do projeto).
--
-- Se der erro "violates check constraint users_role_check", execute ANTES o script:
--   backend-dotnet/docs/migrations/allow_admin_role.sql
--
-- Uso: substitua o ID abaixo pelo user id desejado e execute.

UPDATE public.users
SET role = 'admin'
WHERE id = '7a058e93-bcec-4766-b317-ef4a79e70537';

-- Verificar (opcional):
-- SELECT id, name, email, role FROM public.users WHERE id = '7a058e93-bcec-4766-b317-ef4a79e70537';
