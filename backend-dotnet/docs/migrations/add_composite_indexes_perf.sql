-- ============================================================
-- MIGRATION: Índices compostos para paginação real
-- Data: 2026-03-16
-- Contexto: As queries GetByPatientIdPagedAsync e GetDoctorQueuePagedAsync
--   usam filtros compostos que os índices simples existentes não cobrem
--   de forma eficiente. Estes índices eliminam full-table scans e sorts
--   em memória nas queries mais frequentes do app.
-- ============================================================

-- 1) Paciente: busca por patient_id ordenada por created_at DESC
--    Query: WHERE patient_id = $1 ORDER BY created_at DESC LIMIT N OFFSET M
--    Sem este índice: seq scan em requests + sort em memória.
--    Cobertura: GetByPatientIdAsync, GetByPatientIdPagedAsync
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_requests_patient_created
    ON public.requests (patient_id, created_at DESC);

-- 2) Paciente com filtro de status:
--    Query: WHERE patient_id = $1 AND status = $2 ORDER BY created_at DESC
--    Cobertura: GetByPatientIdPagedAsync com filtro de status
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_requests_patient_status_created
    ON public.requests (patient_id, status, created_at DESC);

-- 3) Fila do médico — pedidos atribuídos ao médico:
--    Query: WHERE doctor_id = $1 ORDER BY created_at DESC
--    idx_requests_doctor_id já existe mas não inclui created_at.
--    Este índice cobre o ORDER BY sem sort extra.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_requests_doctor_created
    ON public.requests (doctor_id, created_at DESC)
    WHERE doctor_id IS NOT NULL;

-- 4) Fila do médico — pedidos disponíveis (sem médico, em status elegíveis):
--    Query: WHERE status IN ('submitted','searching_doctor','pending','analyzing')
--           AND (doctor_id IS NULL OR doctor_id = '00000000-...')
--           ORDER BY created_at DESC
--    O partial index com WHERE doctor_id IS NULL é o mais eficiente aqui.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_requests_queue_available
    ON public.requests (status, created_at DESC)
    WHERE doctor_id IS NULL;

-- 5) Lookup por short_code (verificação de receita via QR):
--    Query: WHERE short_code = $1 LIMIT 1
--    O short_code é único por pedido mas não tinha índice dedicado.
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_requests_short_code
    ON public.requests (short_code)
    WHERE short_code IS NOT NULL;

-- 6) Lookup por access_code (validação pública):
--    Query: WHERE access_code = $1 LIMIT 1
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_requests_access_code
    ON public.requests (access_code)
    WHERE access_code IS NOT NULL;

-- 7) Notificações não lidas (polling de badge):
--    Query: WHERE user_id = $1 AND read = false
--    O idx_notifications_user_id existe, mas não filtra por read.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_unread
    ON public.notifications (user_id, created_at DESC)
    WHERE read = false;

-- 8) Pagamentos por request_id (lookup em PaymentRepository):
--    idx_payments_request_id já existe — confirmar que está ativo.
--    Sem ação necessária, mas listado para documentação.

-- ============================================================
-- Verificação dos índices criados:
-- SELECT indexname, indexdef FROM pg_indexes
-- WHERE tablename IN ('requests', 'notifications')
--   AND schemaname = 'public'
--   AND indexname LIKE 'idx_%'
-- ORDER BY tablename, indexname;
-- ============================================================
