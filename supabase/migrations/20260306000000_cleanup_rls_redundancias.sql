-- ============================================================
-- RENOVEJÁ — Limpeza de RLS redundantes e organização
-- Migração: 20260306000000_cleanup_rls_redundancias.sql
-- ============================================================
-- Remove políticas duplicadas (mantém as do padrão _select_own, etc.)
-- Adiciona RLS em user_push_preferences
-- Remove storage policies redundantes (prescription-images)
-- ============================================================

-- ============================================================
-- 1. DROP políticas RLS duplicadas (nomes descritivos antigos)
-- Mantém: chat_messages_select, notifications_select_own, etc.
-- ============================================================

DROP POLICY IF EXISTS "Participants can view chat" ON public.chat_messages;
DROP POLICY IF EXISTS "User can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "User can view own payments" ON public.payments;
DROP POLICY IF EXISTS "User can view own push tokens" ON public.push_tokens;
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Participants can access video room" ON public.video_rooms;

-- ============================================================
-- 2. Storage prescription-images: remover policies redundantes
-- Mantém prescription_images_select_own e prescription_images_insert_own
-- (mais restritivas e corretas por ownership)
-- ============================================================

DROP POLICY IF EXISTS prescription_images_select_authenticated ON storage.objects;
DROP POLICY IF EXISTS prescription_images_insert_authenticated ON storage.objects;

-- ============================================================
-- 3. user_push_preferences: habilitar RLS e policy
-- Dados por usuário; backend usa service_role (bypassa RLS)
-- Tabela criada pelo backend; aplicar apenas se existir
-- ============================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_push_preferences') THEN
    ALTER TABLE public.user_push_preferences ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS user_push_preferences_select_own ON public.user_push_preferences;
    CREATE POLICY user_push_preferences_select_own ON public.user_push_preferences
      FOR SELECT USING (user_id = auth.uid());

    DROP POLICY IF EXISTS user_push_preferences_insert_own ON public.user_push_preferences;
    CREATE POLICY user_push_preferences_insert_own ON public.user_push_preferences
      FOR INSERT WITH CHECK (user_id = auth.uid());

    DROP POLICY IF EXISTS user_push_preferences_update_own ON public.user_push_preferences;
    CREATE POLICY user_push_preferences_update_own ON public.user_push_preferences
      FOR UPDATE USING (user_id = auth.uid());
  END IF;
END $$;

-- ============================================================
-- FIM
-- ============================================================
