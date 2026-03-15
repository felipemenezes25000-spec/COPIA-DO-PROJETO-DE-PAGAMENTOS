-- ============================================================
-- Schema completo RenoveJá+ para RDS PostgreSQL
-- Unificado a partir de supabase/migrations/
-- Removidas referências a auth.users e storage.buckets (Supabase-specific)
-- ============================================================

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- BASE SCHEMA (20260221000001)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    phone TEXT,
    cpf TEXT,
    birth_date TIMESTAMPTZ,
    gender VARCHAR(20),
    address TEXT,
    street VARCHAR(200),
    number VARCHAR(20),
    neighborhood VARCHAR(100),
    complement VARCHAR(100),
    city VARCHAR(100),
    state VARCHAR(2),
    postal_code VARCHAR(10),
    avatar_url TEXT,
    role TEXT NOT NULL DEFAULT 'patient' CHECK (role IN ('patient', 'doctor', 'admin')),
    profile_complete BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_cpf ON public.users(cpf);

CREATE TABLE IF NOT EXISTS public.auth_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_auth_tokens_token ON public.auth_tokens(token);
CREATE INDEX IF NOT EXISTS idx_auth_tokens_user_id ON public.auth_tokens(user_id);

CREATE TABLE IF NOT EXISTS public.doctor_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
    crm TEXT NOT NULL,
    crm_state TEXT NOT NULL,
    specialty TEXT NOT NULL,
    professional_address TEXT,
    professional_postal_code TEXT,
    professional_street TEXT,
    professional_number TEXT,
    professional_neighborhood TEXT,
    professional_complement TEXT,
    professional_city TEXT,
    professional_state TEXT,
    professional_phone VARCHAR(30),
    university TEXT,
    courses TEXT,
    hospitals_services TEXT,
    bio TEXT,
    rating DECIMAL(3,2) NOT NULL DEFAULT 5.0,
    total_consultations INTEGER NOT NULL DEFAULT 0,
    available BOOLEAN NOT NULL DEFAULT TRUE,
    active_certificate_id UUID,
    crm_validated BOOLEAN NOT NULL DEFAULT FALSE,
    crm_validated_at TIMESTAMPTZ,
    approval_status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_doctor_profiles_user_id ON public.doctor_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_doctor_profiles_specialty ON public.doctor_profiles(specialty);
CREATE INDEX IF NOT EXISTS idx_doctor_profiles_available ON public.doctor_profiles(available);

CREATE TABLE IF NOT EXISTS public.requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    patient_name TEXT,
    doctor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    doctor_name TEXT,
    request_type TEXT NOT NULL CHECK (request_type IN ('prescription', 'exam', 'consultation')),
    status TEXT NOT NULL DEFAULT 'submitted',
    prescription_type TEXT CHECK (prescription_type IN ('simples', 'controlado', 'azul')),
    prescription_kind VARCHAR(30),
    medications JSONB NOT NULL DEFAULT '[]',
    prescription_images JSONB NOT NULL DEFAULT '[]',
    exam_type TEXT,
    exams JSONB NOT NULL DEFAULT '[]',
    exam_images JSONB NOT NULL DEFAULT '[]',
    symptoms TEXT,
    price DECIMAL(10,2),
    notes TEXT,
    rejection_reason TEXT,
    access_code TEXT,
    signed_at TIMESTAMPTZ,
    signed_document_url TEXT,
    signature_id TEXT,
    ai_summary_for_doctor TEXT,
    ai_extracted_json TEXT,
    ai_risk_level TEXT,
    ai_urgency TEXT,
    ai_readability_ok BOOLEAN,
    ai_message_to_user TEXT,
    consultation_type TEXT,
    contracted_minutes INTEGER,
    price_per_minute DECIMAL(10,4),
    consultation_started_at TIMESTAMPTZ,
    triage_conduct TEXT,
    triage_observation TEXT,
    prescription_valid_days INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_requests_patient_id ON public.requests(patient_id);
CREATE INDEX IF NOT EXISTS idx_requests_doctor_id ON public.requests(doctor_id);
CREATE INDEX IF NOT EXISTS idx_requests_status ON public.requests(status);
CREATE INDEX IF NOT EXISTS idx_requests_type ON public.requests(request_type);
CREATE INDEX IF NOT EXISTS idx_requests_created_at ON public.requests(created_at DESC);

CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES public.requests(id) ON DELETE RESTRICT,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    amount DECIMAL(10,2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'refunded', 'cancelled')),
    payment_method TEXT NOT NULL DEFAULT 'pix' CHECK (payment_method IN ('pix', 'credit_card', 'debit_card')),
    external_id TEXT,
    pix_qr_code TEXT,
    pix_qr_code_base64 TEXT,
    pix_copy_paste TEXT,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_payments_request_id ON public.payments(request_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);

CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    sender_name TEXT,
    sender_type TEXT NOT NULL CHECK (sender_type IN ('patient', 'doctor', 'system')),
    message TEXT NOT NULL,
    read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_chat_messages_request_id ON public.chat_messages(request_id);

-- ============================================================
-- INCREMENTAL FEATURES (20260221000002)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.doctor_certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_profile_id UUID NOT NULL REFERENCES public.doctor_profiles(id) ON DELETE CASCADE,
    subject_name TEXT NOT NULL,
    issuer_name TEXT NOT NULL,
    serial_number TEXT NOT NULL,
    not_before TIMESTAMPTZ NOT NULL,
    not_after TIMESTAMPTZ NOT NULL,
    pfx_storage_path TEXT NOT NULL,
    pfx_file_name TEXT NOT NULL,
    cpf TEXT,
    crm_number TEXT,
    is_valid BOOLEAN NOT NULL DEFAULT TRUE,
    is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
    revoked_at TIMESTAMPTZ,
    revocation_reason TEXT,
    validated_at_registration BOOLEAN NOT NULL DEFAULT FALSE,
    last_validation_date TIMESTAMPTZ,
    last_validation_result TEXT,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    uploaded_by_ip TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_doctor_certificates_doctor ON public.doctor_certificates(doctor_profile_id);

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    user_email TEXT,
    user_role TEXT,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    details TEXT,
    ip_address TEXT,
    user_agent TEXT,
    endpoint TEXT,
    http_method TEXT,
    status_code INTEGER,
    event_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    duration BIGINT,
    old_values TEXT,
    new_values TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON public.audit_logs(created_at DESC);

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    notification_type TEXT NOT NULL DEFAULT 'info',
    read BOOLEAN NOT NULL DEFAULT FALSE,
    data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);

CREATE TABLE IF NOT EXISTS public.video_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
    room_name TEXT NOT NULL,
    room_url TEXT,
    status TEXT NOT NULL DEFAULT 'waiting',
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    duration_seconds INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.consultation_anamnesis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    transcript_text TEXT,
    anamnesis_json TEXT,
    ai_suggestions_json TEXT,
    evidence_json TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_consultation_anamnesis_request_id ON public.consultation_anamnesis(request_id);

CREATE TABLE IF NOT EXISTS public.push_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    device_type TEXT NOT NULL DEFAULT 'unknown',
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_push_tokens_unique ON public.push_tokens(user_id, token);

CREATE TABLE IF NOT EXISTS public.user_push_preferences (
    user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    requests_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    payments_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    consultations_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    reminders_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    timezone TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.product_prices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_type TEXT NOT NULL,
    subtype TEXT NOT NULL DEFAULT 'default',
    price_brl DECIMAL(10,2) NOT NULL,
    name TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_prices_unique ON public.product_prices(product_type, subtype);

INSERT INTO public.product_prices (product_type, subtype, price_brl, name, is_active) VALUES
    ('prescription', 'simples', 49.90, 'Receita simples', TRUE),
    ('prescription', 'controlado', 79.90, 'Receita controlada', TRUE),
    ('prescription', 'azul', 69.90, 'Receita azul', TRUE),
    ('exam', 'default', 99.90, 'Pedido de exame', TRUE),
    ('consultation', 'default', 149.90, 'Teleconsulta', TRUE),
    ('consultation', 'psicologo', 3.99, 'Consulta Psicólogo (por minuto)', TRUE),
    ('consultation', 'medico_clinico', 6.99, 'Consulta Médico Clínico (por minuto)', TRUE)
ON CONFLICT (product_type, subtype) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.payment_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
    request_id UUID NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    correlation_id TEXT NOT NULL,
    payment_method TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    mercado_pago_payment_id TEXT,
    mercado_pago_preference_id TEXT,
    request_url TEXT,
    request_payload TEXT,
    response_payload TEXT,
    response_status_code INTEGER,
    response_status_detail TEXT,
    response_headers TEXT,
    error_message TEXT,
    is_success BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id TEXT,
    event_type TEXT DEFAULT 'payment',
    source VARCHAR DEFAULT 'mercadopago',
    payload JSONB,
    status VARCHAR DEFAULT 'processed',
    error_message TEXT,
    correlation_id TEXT,
    mercado_pago_payment_id TEXT,
    mercado_pago_request_id TEXT,
    webhook_type TEXT,
    webhook_action TEXT,
    raw_payload TEXT,
    processed_payload TEXT,
    query_string TEXT,
    request_headers TEXT,
    content_type TEXT,
    content_length INTEGER,
    source_ip TEXT,
    is_duplicate BOOLEAN NOT NULL DEFAULT FALSE,
    is_processed BOOLEAN NOT NULL DEFAULT FALSE,
    processing_error TEXT,
    payment_status TEXT,
    payment_status_detail TEXT,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.saved_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    mp_customer_id TEXT NOT NULL,
    mp_card_id TEXT NOT NULL,
    last_four TEXT NOT NULL,
    brand TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_saved_cards_unique ON public.saved_cards(user_id, mp_card_id);

-- ============================================================
-- CONSULTATION TIME BANK
-- ============================================================

CREATE TABLE IF NOT EXISTS public.consultation_time_bank (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    consultation_type TEXT NOT NULL,
    balance_seconds INTEGER NOT NULL DEFAULT 0,
    last_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (patient_id, consultation_type)
);

CREATE TABLE IF NOT EXISTS public.consultation_time_bank_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.users(id),
    request_id UUID REFERENCES public.requests(id),
    consultation_type TEXT NOT NULL,
    delta_seconds INTEGER NOT NULL,
    reason TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PRESCRIPTIONS & VERIFICATION (public-facing)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.prescriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES public.users(id),
    doctor_id UUID NOT NULL REFERENCES public.users(id),
    verification_code TEXT NOT NULL UNIQUE,
    pdf_url TEXT,
    pdf_hash TEXT,
    signed BOOLEAN NOT NULL DEFAULT FALSE,
    valid_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_prescriptions_code ON public.prescriptions(verification_code);
CREATE INDEX IF NOT EXISTS idx_prescriptions_request ON public.prescriptions(request_id);

CREATE TABLE IF NOT EXISTS public.prescription_verification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prescription_id UUID NOT NULL REFERENCES public.prescriptions(id),
    ip_address TEXT,
    user_agent TEXT,
    verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PRONTUARIO (clinical records)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.encounters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    practitioner_id UUID NOT NULL REFERENCES public.users(id),
    request_id UUID REFERENCES public.requests(id),
    encounter_type TEXT NOT NULL DEFAULT 'consultation',
    status TEXT NOT NULL DEFAULT 'in-progress',
    reason_text TEXT,
    clinical_notes TEXT,
    diagnosis_codes JSONB DEFAULT '[]',
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_encounters_patient ON public.encounters(patient_id);

CREATE TABLE IF NOT EXISTS public.medical_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    encounter_id UUID REFERENCES public.encounters(id) ON DELETE SET NULL,
    patient_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    practitioner_id UUID NOT NULL REFERENCES public.users(id),
    request_id UUID REFERENCES public.requests(id),
    document_type TEXT NOT NULL,
    title TEXT,
    content_json JSONB NOT NULL DEFAULT '{}',
    pdf_url TEXT,
    signed BOOLEAN NOT NULL DEFAULT FALSE,
    signed_at TIMESTAMPTZ,
    signature_id TEXT,
    provenance_source TEXT,
    provenance_request_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_medical_documents_patient ON public.medical_documents(patient_id);

CREATE TABLE IF NOT EXISTS public.consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    practitioner_id UUID NOT NULL REFERENCES public.users(id),
    consent_type TEXT NOT NULL DEFAULT 'treatment',
    status TEXT NOT NULL DEFAULT 'active',
    given_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    scope_description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID NOT NULL REFERENCES public.users(id),
    actor_role TEXT NOT NULL,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id UUID,
    patient_id UUID REFERENCES public.users(id),
    details JSONB DEFAULT '{}',
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_events_patient ON public.audit_events(patient_id);

CREATE TABLE IF NOT EXISTS public.ai_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    encounter_id UUID REFERENCES public.encounters(id),
    request_id UUID REFERENCES public.requests(id),
    practitioner_id UUID NOT NULL REFERENCES public.users(id),
    suggestion_type TEXT NOT NULL,
    input_data JSONB DEFAULT '{}',
    output_data JSONB DEFAULT '{}',
    model_used TEXT,
    accepted BOOLEAN,
    accepted_at TIMESTAMPTZ,
    feedback TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ai_interaction_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID REFERENCES public.requests(id),
    interaction_type TEXT NOT NULL,
    model_used TEXT,
    prompt_tokens INTEGER,
    completion_tokens INTEGER,
    total_tokens INTEGER,
    latency_ms INTEGER,
    success BOOLEAN NOT NULL DEFAULT TRUE,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.doctor_patient_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    note_text TEXT NOT NULL,
    note_type TEXT NOT NULL DEFAULT 'general',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(doctor_id, patient_id, note_type)
);

-- ============================================================
-- CARE PLANS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.care_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    responsible_doctor_id UUID NOT NULL REFERENCES public.users(id),
    encounter_id UUID REFERENCES public.encounters(id),
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_care_plans_patient ON public.care_plans(patient_id);

CREATE TABLE IF NOT EXISTS public.care_plan_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    care_plan_id UUID NOT NULL REFERENCES public.care_plans(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    task_type TEXT NOT NULL DEFAULT 'general',
    status TEXT NOT NULL DEFAULT 'pending',
    frequency TEXT,
    due_date TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    notes TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.care_plan_task_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.care_plan_tasks(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_type TEXT,
    file_size INTEGER,
    uploaded_by UUID NOT NULL REFERENCES public.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.outbox_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'pending',
    retry_count INTEGER NOT NULL DEFAULT 0,
    last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

-- Done!
SELECT 'Schema RenoveJá+ criado com sucesso no RDS!' AS result;
