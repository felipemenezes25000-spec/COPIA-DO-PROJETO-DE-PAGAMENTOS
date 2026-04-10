using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Npgsql;

namespace RenoveJa.Infrastructure.Data.Postgres;

internal class MigrationRunnerLogger { }

public static class MigrationRunner
{
    private static readonly string[] RefreshTokenMigrations =
    {
        "ALTER TABLE auth_tokens ADD COLUMN IF NOT EXISTS refresh_token TEXT",
        "ALTER TABLE auth_tokens ADD COLUMN IF NOT EXISTS refresh_token_expires_at TIMESTAMPTZ",
        "CREATE INDEX IF NOT EXISTS idx_auth_tokens_refresh_token ON auth_tokens (refresh_token) WHERE refresh_token IS NOT NULL"
    };

    private static readonly string[] PasswordResetTokensMigrations =
    {
        """
        CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
            token TEXT NOT NULL UNIQUE,
            expires_at TIMESTAMPTZ NOT NULL,
            used BOOLEAN NOT NULL DEFAULT FALSE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        """,
        "CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON public.password_reset_tokens(token)",
        "CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON public.password_reset_tokens(user_id)",
        "CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at ON public.password_reset_tokens(expires_at)"
    };

    private static readonly string[] RequestAiColumns =
    {
        """
        ALTER TABLE public.requests
          ADD COLUMN IF NOT EXISTS ai_summary_for_doctor TEXT,
          ADD COLUMN IF NOT EXISTS ai_extracted_json TEXT,
          ADD COLUMN IF NOT EXISTS ai_risk_level TEXT,
          ADD COLUMN IF NOT EXISTS ai_urgency TEXT,
          ADD COLUMN IF NOT EXISTS ai_readability_ok BOOLEAN,
          ADD COLUMN IF NOT EXISTS ai_message_to_user TEXT
        """,
        "ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS access_code TEXT"
    };

    private static readonly string[] RequestAiRejectionColumns =
    {
        "ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS rejection_source TEXT",
        "ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS ai_rejection_reason TEXT",
        "ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS ai_rejected_at TIMESTAMPTZ",
        "ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS reopened_by UUID",
        "ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS reopened_at TIMESTAMPTZ",
        """
        CREATE INDEX IF NOT EXISTS idx_requests_ai_rejected
          ON public.requests (required_specialty, ai_rejected_at DESC)
          WHERE status = 'rejected' AND rejection_source = 'ai'
        """
    };

    private static readonly string[] PrescriptionProfileFieldsMigrations =
    {
        "ALTER TABLE public.users ADD COLUMN IF NOT EXISTS gender VARCHAR(20)",
        "ALTER TABLE public.users ADD COLUMN IF NOT EXISTS address TEXT",
        "ALTER TABLE public.users ADD COLUMN IF NOT EXISTS city VARCHAR(100)",
        "ALTER TABLE public.users ADD COLUMN IF NOT EXISTS state VARCHAR(2)",
        "ALTER TABLE public.users ADD COLUMN IF NOT EXISTS postal_code VARCHAR(10)",
        "ALTER TABLE public.users ADD COLUMN IF NOT EXISTS street VARCHAR(200)",
        "ALTER TABLE public.users ADD COLUMN IF NOT EXISTS number VARCHAR(20)",
        "ALTER TABLE public.users ADD COLUMN IF NOT EXISTS neighborhood VARCHAR(100)",
        "ALTER TABLE public.users ADD COLUMN IF NOT EXISTS complement VARCHAR(100)",
        "ALTER TABLE public.doctor_profiles ADD COLUMN IF NOT EXISTS professional_address TEXT",
        "ALTER TABLE public.doctor_profiles ADD COLUMN IF NOT EXISTS professional_phone VARCHAR(30)",
        "ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS prescription_kind VARCHAR(30)"
    };

    private static readonly string[] DoctorCertificatesMigrations =
    {
        """
        CREATE TABLE IF NOT EXISTS public.doctor_certificates (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            doctor_profile_id UUID NOT NULL REFERENCES public.doctor_profiles(id) ON DELETE CASCADE,
            subject_name TEXT NOT NULL, issuer_name TEXT NOT NULL, serial_number TEXT NOT NULL,
            not_before TIMESTAMPTZ NOT NULL, not_after TIMESTAMPTZ NOT NULL,
            pfx_storage_path TEXT NOT NULL, pfx_file_name TEXT NOT NULL,
            cpf TEXT, crm_number TEXT,
            is_valid BOOLEAN NOT NULL DEFAULT true, is_revoked BOOLEAN NOT NULL DEFAULT false,
            revoked_at TIMESTAMPTZ, revocation_reason TEXT,
            validated_at_registration BOOLEAN NOT NULL DEFAULT false,
            last_validation_date TIMESTAMPTZ, last_validation_result TEXT,
            uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(), uploaded_by_ip TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        """,
        "CREATE INDEX IF NOT EXISTS idx_doctor_certificates_doctor ON public.doctor_certificates(doctor_profile_id)",
        "CREATE INDEX IF NOT EXISTS idx_doctor_certificates_valid ON public.doctor_certificates(is_valid, is_revoked)",
        "ALTER TABLE public.doctor_profiles ADD COLUMN IF NOT EXISTS active_certificate_id UUID REFERENCES public.doctor_certificates(id)",
        "ALTER TABLE public.doctor_profiles ADD COLUMN IF NOT EXISTS crm_validated BOOLEAN NOT NULL DEFAULT false",
        "ALTER TABLE public.doctor_profiles ADD COLUMN IF NOT EXISTS crm_validated_at TIMESTAMPTZ"
    };

    private static readonly string[] AuditLogsMigrations =
    {
        """
        CREATE TABLE IF NOT EXISTS public.audit_logs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
            user_email TEXT, user_role TEXT, action TEXT NOT NULL, entity_type TEXT NOT NULL,
            entity_id TEXT, details TEXT, ip_address TEXT, user_agent TEXT,
            endpoint TEXT, http_method TEXT, status_code INTEGER,
            event_timestamp TIMESTAMPTZ NOT NULL DEFAULT now(), duration BIGINT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        """,
        "CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON public.audit_logs(created_at DESC)"
    };

    private static readonly string[] NotificationsMigrations =
    {
        """
        CREATE TABLE IF NOT EXISTS public.notifications (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
            title TEXT NOT NULL, message TEXT NOT NULL,
            notification_type TEXT NOT NULL DEFAULT 'info',
            read BOOLEAN NOT NULL DEFAULT FALSE, data JSONB,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        """,
        "CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id)",
        "CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(user_id, read)"
    };

    private static readonly string[] VideoRoomsMigrations =
    {
        """
        CREATE TABLE IF NOT EXISTS public.video_rooms (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            request_id UUID NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
            room_name TEXT NOT NULL, room_url TEXT,
            status TEXT NOT NULL DEFAULT 'waiting',
            started_at TIMESTAMPTZ, ended_at TIMESTAMPTZ, duration_seconds INTEGER,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        """,
        "CREATE INDEX IF NOT EXISTS idx_video_rooms_request_id ON public.video_rooms(request_id)"
    };

    private static readonly string[] ConsultationAnamnesisMigrations =
    {
        """
        CREATE TABLE IF NOT EXISTS public.consultation_anamnesis (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            request_id UUID NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
            patient_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
            transcript_text TEXT, anamnesis_json TEXT, ai_suggestions_json TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        """,
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_consultation_anamnesis_request_id ON public.consultation_anamnesis(request_id)",
        "ALTER TABLE public.consultation_anamnesis ADD COLUMN IF NOT EXISTS transcript_file_url TEXT",
        "ALTER TABLE public.consultation_anamnesis ADD COLUMN IF NOT EXISTS evidence_json TEXT",
        "ALTER TABLE public.consultation_anamnesis ADD COLUMN IF NOT EXISTS recording_file_url TEXT",
        "ALTER TABLE public.consultation_anamnesis ADD COLUMN IF NOT EXISTS soap_notes_json TEXT",
        "ALTER TABLE public.consultation_anamnesis ADD COLUMN IF NOT EXISTS soap_notes_generated_at TIMESTAMPTZ"
    };

    private static readonly string[] PushTokensMigrations =
    {
        """
        CREATE TABLE IF NOT EXISTS public.push_tokens (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
            token TEXT NOT NULL, device_type TEXT NOT NULL DEFAULT 'unknown',
            active BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        """,
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_push_tokens_unique ON public.push_tokens(user_id, token)"
    };

    private static readonly string[] UserPushPreferencesMigrations =
    {
        """
        CREATE TABLE IF NOT EXISTS public.user_push_preferences (
            user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
            requests_enabled BOOLEAN NOT NULL DEFAULT TRUE,
            consultations_enabled BOOLEAN NOT NULL DEFAULT TRUE,
            reminders_enabled BOOLEAN NOT NULL DEFAULT TRUE,
            timezone TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        """,
        // Coluna de pagamento não se aplica
        "ALTER TABLE public.user_push_preferences DROP COLUMN IF EXISTS payments_enabled"
    };

    private static readonly string[] DoctorApprovalStatusMigrations =
    {
        "ALTER TABLE public.doctor_profiles ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'pending'",
        "UPDATE public.doctor_profiles SET approval_status = 'approved' WHERE approval_status IS NULL OR approval_status = ''"
    };

    private static readonly string[] DoctorPatientNotesMigrations =
    {
        """
        CREATE TABLE IF NOT EXISTS public.doctor_patient_notes (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            doctor_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
            patient_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
            note_type TEXT NOT NULL DEFAULT 'progress_note',
            content TEXT NOT NULL,
            request_id UUID REFERENCES public.requests(id) ON DELETE SET NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        """,
        "CREATE INDEX IF NOT EXISTS idx_doctor_patient_notes_doctor_patient ON public.doctor_patient_notes(doctor_id, patient_id)"
    };

    private static readonly string[] AiInteractionLogsMigrations =
    {
        """
        CREATE TABLE IF NOT EXISTS public.ai_interaction_logs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            request_id UUID REFERENCES public.requests(id) ON DELETE SET NULL,
            user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
            provider TEXT NOT NULL, model TEXT NOT NULL,
            prompt_tokens INTEGER, completion_tokens INTEGER, latency_ms INTEGER,
            success BOOLEAN NOT NULL DEFAULT TRUE, error_message TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        """
    };

    private static readonly string[] ProntuarioMigrations =
    {
        """
        CREATE TABLE IF NOT EXISTS public.patients (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
            name TEXT NOT NULL, cpf TEXT NOT NULL, birth_date TIMESTAMPTZ,
            sex VARCHAR(20), social_name TEXT, phone TEXT, email TEXT,
            address_line1 TEXT, city VARCHAR(100), state VARCHAR(2), zip_code VARCHAR(10),
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        """,
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_patients_user_id ON public.patients(user_id)",
        """
        CREATE TABLE IF NOT EXISTS public.encounters (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
            practitioner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
            source_request_id UUID REFERENCES public.requests(id) ON DELETE SET NULL,
            type TEXT NOT NULL DEFAULT 'teleconsultation', status TEXT NOT NULL DEFAULT 'draft',
            started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), finished_at TIMESTAMPTZ,
            channel TEXT, reason TEXT, anamnesis TEXT, physical_exam TEXT, plan TEXT,
            main_icd10_code VARCHAR(10), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        """,
        "CREATE INDEX IF NOT EXISTS idx_encounters_patient_id ON public.encounters(patient_id)",
        "CREATE INDEX IF NOT EXISTS idx_encounters_practitioner_id ON public.encounters(practitioner_id)",
        """
        CREATE TABLE IF NOT EXISTS public.medical_documents (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
            practitioner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
            encounter_id UUID REFERENCES public.encounters(id) ON DELETE SET NULL,
            source_request_id UUID REFERENCES public.requests(id) ON DELETE SET NULL,
            signed_document_url TEXT, signature_id TEXT,
            document_type TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'draft',
            previous_document_id UUID REFERENCES public.medical_documents(id) ON DELETE SET NULL,
            medications JSONB DEFAULT '[]', exams JSONB DEFAULT '[]',
            report_body TEXT, clinical_justification TEXT, priority TEXT,
            icd10_code VARCHAR(10), leave_days INTEGER, general_instructions TEXT,
            signature_hash TEXT, signature_algorithm TEXT, signature_certificate TEXT,
            signed_at TIMESTAMPTZ, signature_is_valid BOOLEAN,
            signature_validation_result TEXT, signature_policy_oid TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        """,
        "CREATE INDEX IF NOT EXISTS idx_medical_documents_patient_id ON public.medical_documents(patient_id)",
        "CREATE INDEX IF NOT EXISTS idx_medical_documents_encounter_id ON public.medical_documents(encounter_id)",
        "CREATE INDEX IF NOT EXISTS idx_requests_doctor_id ON public.requests(doctor_id)",
        "CREATE INDEX IF NOT EXISTS idx_requests_patient_id ON public.requests(patient_id)",
        "CREATE INDEX IF NOT EXISTS idx_requests_status ON public.requests(status)",
        """
        CREATE TABLE IF NOT EXISTS public.consent_records (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
            consent_type TEXT NOT NULL, legal_basis TEXT NOT NULL, purpose TEXT NOT NULL,
            accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), channel TEXT NOT NULL,
            text_version TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS public.audit_events (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
            action TEXT NOT NULL, entity_type TEXT NOT NULL, entity_id UUID,
            channel TEXT, ip_address TEXT, user_agent TEXT, correlation_id TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS public.patient_allergies (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
            type TEXT, description TEXT NOT NULL, severity TEXT,
            is_active BOOLEAN NOT NULL DEFAULT true,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS public.patient_conditions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
            icd10_code VARCHAR(10), description TEXT NOT NULL,
            start_date TIMESTAMPTZ, end_date TIMESTAMPTZ,
            is_active BOOLEAN NOT NULL DEFAULT true,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS public.patient_medications (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
            drug TEXT NOT NULL, dose TEXT, form TEXT, posology TEXT,
            start_date TIMESTAMPTZ, end_date TIMESTAMPTZ,
            is_active BOOLEAN NOT NULL DEFAULT true,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS public.patient_clinical_events (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
            description TEXT NOT NULL, occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        """
    };

    private static readonly string[] CarePlanMigrations =
    {
        """
        CREATE TABLE IF NOT EXISTS public.ai_suggestions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            consultation_id UUID NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
            patient_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
            doctor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
            type TEXT NOT NULL DEFAULT 'exam_suggestion', status TEXT NOT NULL DEFAULT 'generated',
            model TEXT NOT NULL, payload_json JSONB NOT NULL, payload_hash TEXT NOT NULL,
            correlation_id TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        """,
        "ALTER TABLE public.ai_suggestions ADD COLUMN IF NOT EXISTS patient_id UUID REFERENCES public.users(id) ON DELETE CASCADE",
        "ALTER TABLE public.ai_suggestions ADD COLUMN IF NOT EXISTS doctor_id UUID REFERENCES public.users(id) ON DELETE SET NULL",
        """
        CREATE TABLE IF NOT EXISTS public.care_plans (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            consultation_id UUID NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
            patient_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
            responsible_doctor_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
            status TEXT NOT NULL DEFAULT 'active',
            created_from_ai_suggestion_id UUID NOT NULL REFERENCES public.ai_suggestions(id) ON DELETE RESTRICT,
            correlation_id TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            closed_at TIMESTAMPTZ
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS public.care_plan_tasks (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            care_plan_id UUID NOT NULL REFERENCES public.care_plans(id) ON DELETE CASCADE,
            assigned_doctor_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
            type TEXT NOT NULL, state TEXT NOT NULL DEFAULT 'pending',
            title TEXT NOT NULL, description TEXT,
            payload_json JSONB NOT NULL DEFAULT '{}'::jsonb, due_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS public.care_plan_task_files (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            task_id UUID NOT NULL REFERENCES public.care_plan_tasks(id) ON DELETE CASCADE,
            storage_path TEXT NOT NULL, file_url TEXT NOT NULL, content_type TEXT NOT NULL,
            uploaded_by_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS public.outbox_events (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            aggregate_type TEXT NOT NULL, aggregate_id UUID NOT NULL,
            event_type TEXT NOT NULL, payload_json JSONB NOT NULL,
            idempotency_key TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending',
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), processed_at TIMESTAMPTZ
        )
        """,
        "CREATE UNIQUE INDEX IF NOT EXISTS ux_outbox_events_idempotency_key ON public.outbox_events(idempotency_key)"
    };

    /// <summary>Limpa URLs legadas de storage externo que ficaram gravadas no banco RDS.</summary>
    private static readonly string[] CleanupLegacyStorageUrlsMigrations =
    {
        "UPDATE public.users SET avatar_url = NULL WHERE avatar_url LIKE '%supabase.co%'",
        "UPDATE public.requests SET signed_document_url = NULL WHERE signed_document_url LIKE '%supabase.co%'",
        "UPDATE public.requests SET prescription_images = '[]' WHERE prescription_images::text LIKE '%supabase.co%'",
        "UPDATE public.requests SET exam_images = '[]' WHERE exam_images::text LIKE '%supabase.co%'"
    };

    /// <summary>
    /// Corrige encounters: FK patient_id deve referenciar patients(id), não users(id).
    /// Erro 23503 ocorre quando encounters_patient_id_fkey aponta para users.
    /// Ordem: 1) drop FK 2) corrigir dados 3) recriar FK para patients.
    /// </summary>
    private static readonly string[] FixEncounterPatientIdMigrations =
    {
        // 1. Remover FK incorreta (se existir e apontar para users)
        "ALTER TABLE public.encounters DROP CONSTRAINT IF EXISTS encounters_patient_id_fkey",
        // 2. Corrigir encounters: trocar users.id → patients.id onde o FK estava quebrado
        """
        UPDATE public.encounters e
        SET patient_id = p.id
        FROM public.patients p
        WHERE e.patient_id = p.user_id
          AND e.patient_id != p.id
          AND NOT EXISTS (SELECT 1 FROM public.patients px WHERE px.id = e.patient_id)
        """,
        // 3. Recriar FK correta: encounters.patient_id → patients(id)
        """
        ALTER TABLE public.encounters
          ADD CONSTRAINT encounters_patient_id_fkey
          FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE
        """,
        // 4. Remover FK incorreta de medical_documents (se apontar para users)
        """
        DO $$
        DECLARE fk_name TEXT;
        BEGIN
            SELECT conname INTO fk_name FROM pg_constraint
            WHERE conrelid = 'public.medical_documents'::regclass
              AND contype = 'f' AND conname LIKE '%patient_id%';
            IF fk_name IS NOT NULL THEN
                EXECUTE format('ALTER TABLE public.medical_documents DROP CONSTRAINT %I', fk_name);
            END IF;
        END $$
        """,
        // 5. Corrigir medical_documents que herdaram o patient_id errado
        """
        UPDATE public.medical_documents md
        SET patient_id = p.id
        FROM public.patients p
        WHERE md.patient_id = p.user_id
          AND md.patient_id != p.id
          AND NOT EXISTS (SELECT 1 FROM public.patients px WHERE px.id = md.patient_id)
        """,
        // 6. Recriar FK correta: medical_documents.patient_id → patients(id)
        """
        ALTER TABLE public.medical_documents
          ADD CONSTRAINT medical_documents_patient_id_fkey
          FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE
        """
    };

    /// <summary>
    /// Adiciona campos de enriquecimento ao encounter para compliance CFM 1.638/2002
    /// e suporte à emissão pós-consulta com IA.
    /// </summary>
    private static readonly string[] EncounterEnrichmentMigrations =
    {
        """
        ALTER TABLE public.encounters
          ADD COLUMN IF NOT EXISTS differential_diagnosis TEXT,
          ADD COLUMN IF NOT EXISTS patient_instructions TEXT,
          ADD COLUMN IF NOT EXISTS red_flags TEXT,
          ADD COLUMN IF NOT EXISTS structured_anamnesis TEXT
        """
    };

    /// <summary>
    /// Segurança e controle antifraude de documentos médicos.
    /// </summary>
    private static readonly string[] DocumentSecurityMigrations =
    {
        "ALTER TABLE public.medical_documents ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ",
        "ALTER TABLE public.medical_documents ADD COLUMN IF NOT EXISTS dispensed_at TIMESTAMPTZ",
        "ALTER TABLE public.medical_documents ADD COLUMN IF NOT EXISTS dispensed_by TEXT",
        "ALTER TABLE public.medical_documents ADD COLUMN IF NOT EXISTS dispensed_count INTEGER NOT NULL DEFAULT 0",
        "ALTER TABLE public.medical_documents ADD COLUMN IF NOT EXISTS max_dispenses INTEGER NOT NULL DEFAULT 1",
        "ALTER TABLE public.medical_documents ADD COLUMN IF NOT EXISTS verify_code_hash TEXT",
        "ALTER TABLE public.medical_documents ADD COLUMN IF NOT EXISTS access_code TEXT",
        "ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ",
        "ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS dispensed_at TIMESTAMPTZ",
        "ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS dispensed_count INTEGER NOT NULL DEFAULT 0",
        """
        CREATE TABLE IF NOT EXISTS public.document_access_log (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            document_id UUID,
            request_id UUID,
            user_id UUID,
            action TEXT NOT NULL,
            actor_type TEXT NOT NULL DEFAULT 'patient',
            ip_address TEXT,
            user_agent TEXT,
            metadata JSONB,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        """,
        "CREATE INDEX IF NOT EXISTS idx_doc_access_log_doc ON public.document_access_log(document_id)",
        "CREATE INDEX IF NOT EXISTS idx_doc_access_log_req ON public.document_access_log(request_id)",
        "CREATE INDEX IF NOT EXISTS idx_doc_access_log_date ON public.document_access_log(created_at DESC)",
        "CREATE INDEX IF NOT EXISTS idx_med_docs_expires ON public.medical_documents(expires_at) WHERE expires_at IS NOT NULL",
        "CREATE INDEX IF NOT EXISTS idx_requests_expires ON public.requests(expires_at) WHERE expires_at IS NOT NULL",
    };

    /// <summary>
    /// Log de verificações e downloads de receitas (anti-fraude, auditoria LGPD).
    /// </summary>
    private static readonly string[] PrescriptionsTableMigrations =
    {
        """
        CREATE TABLE IF NOT EXISTS public.prescriptions (
            id UUID PRIMARY KEY,
            status TEXT NOT NULL DEFAULT 'active',
            issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            issued_date_str TEXT NOT NULL DEFAULT '',
            patient_initials TEXT NOT NULL DEFAULT '',
            prescriber_crm_uf TEXT NOT NULL DEFAULT '',
            prescriber_crm_last4 TEXT NOT NULL DEFAULT '',
            verify_code_hash TEXT NOT NULL DEFAULT '',
            pdf_storage_path TEXT NOT NULL DEFAULT '',
            pdf_hash TEXT,
            dispensed_at TIMESTAMPTZ,
            dispensed_pharmacy TEXT,
            dispensed_pharmacist TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        """,
        "CREATE INDEX IF NOT EXISTS idx_prescriptions_verify_code_hash ON public.prescriptions(verify_code_hash) WHERE verify_code_hash != ''",
        "ALTER TABLE public.prescriptions ADD COLUMN IF NOT EXISTS dispensed_pharmacist_crf TEXT"
    };

    private static readonly string[] ChronicConditionMigrations =
    {
        "ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS has_chronic_condition BOOLEAN NOT NULL DEFAULT FALSE",
        "ALTER TABLE public.encounters ADD COLUMN IF NOT EXISTS is_presential BOOLEAN NOT NULL DEFAULT false",
    };

    private static readonly string[] PrescriptionVerificationLogsMigrations =
    {
        """
        CREATE TABLE IF NOT EXISTS public.prescription_verification_logs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            prescription_id UUID NOT NULL,
            action TEXT NOT NULL,
            outcome TEXT NOT NULL,
            ip_address TEXT,
            user_agent TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        """,
        "CREATE INDEX IF NOT EXISTS idx_prescription_verification_logs_prescription ON public.prescription_verification_logs(prescription_id)",
        "CREATE INDEX IF NOT EXISTS idx_prescription_verification_logs_created ON public.prescription_verification_logs(created_at DESC)",
    };

    /// <summary>
    /// Corrige audit_logs: adiciona colunas que AuditLogModel espera mas que a DDL original não tinha.
    /// old_values/new_values/correlation_id são TEXT; metadata é JSONB (PostgresClient já emite ::jsonb cast).
    /// Colunas legadas (user_email, user_role, details, endpoint, http_method, status_code,
    /// event_timestamp, duration) permanecem intactas — remoção seria DDL destrutiva.
    /// </summary>
    private static readonly string[] AuditLogsSchemaFixMigrations =
    {
        "ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS old_values TEXT",
        "ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS new_values TEXT",
        "ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS correlation_id TEXT",
        // metadata: adicionar como JSONB se não existir; se já existir como JSONB, o IF NOT EXISTS é no-op
        "ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS metadata JSONB",
        "CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id) WHERE user_id IS NOT NULL",
        "CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id) WHERE entity_id IS NOT NULL",
    };

    // consent_type is stored as TEXT in consent_records, so adding TelemedicineSession = 5
    // to the ConsentType enum requires no schema migration — the new value is persisted as text.

    // ICD-10 codes are max ~7 chars (e.g. "A01.23") but AI may produce longer values;
    // widen from VARCHAR(10) to VARCHAR(20) to accommodate edge cases.
    private static readonly string[] Icd10ColumnWidenMigrations =
    {
        "ALTER TABLE public.medical_documents ALTER COLUMN icd10_code TYPE VARCHAR(20)",
        "ALTER TABLE public.encounters ALTER COLUMN main_icd10_code TYPE VARCHAR(20)",
        "ALTER TABLE public.patient_conditions ALTER COLUMN icd10_code TYPE VARCHAR(20)",
    };

    /// <summary>Campo RQE (Registro de Qualificação de Especialista) — CFM 2.314/2022 Art. 3.</summary>
    private static readonly string[] DoctorRqeMigrations =
    {
        "ALTER TABLE public.doctor_profiles ADD COLUMN IF NOT EXISTS rqe VARCHAR(20)"
    };

    /// <summary>
    /// Persistência de análises IA de candidatos (módulo RH).
    /// FK → doctor_profiles(id): o "candidato" do RH é um doctor_profile.
    /// Histórico preservado: uma nova linha por re-análise; query busca a mais recente.
    /// pontos_fortes / pontos_fracos são arrays de strings em JSONB.
    /// </summary>
    private static readonly string[] DoctorAiAnalysesMigrations =
    {
        """
        CREATE TABLE IF NOT EXISTS public.doctor_ai_analyses (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            doctor_profile_id UUID NOT NULL REFERENCES public.doctor_profiles(id) ON DELETE CASCADE,
            score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
            resumo TEXT NOT NULL,
            pontos_fortes JSONB NOT NULL DEFAULT '[]'::jsonb,
            pontos_fracos JSONB NOT NULL DEFAULT '[]'::jsonb,
            recomendacao TEXT NOT NULL CHECK (recomendacao IN ('aprovar','entrevistar','analisar_mais','rejeitar')),
            recomendacao_texto TEXT NOT NULL DEFAULT '',
            model TEXT NOT NULL,
            analyzed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        """,
        "CREATE INDEX IF NOT EXISTS idx_doctor_ai_analyses_doctor_latest ON public.doctor_ai_analyses(doctor_profile_id, created_at DESC)"
    };

    /// <summary>
    /// Notas internas do RH sobre candidatos (módulo RH).
    /// FK → doctor_profiles(id). Histórico preservado: cada nota é uma linha imutável.
    /// Distinta de doctor_patient_notes (que são notas clínicas sobre pacientes).
    /// </summary>
    private static readonly string[] DoctorAdminNotesMigrations =
    {
        """
        CREATE TABLE IF NOT EXISTS public.doctor_admin_notes (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            doctor_profile_id UUID NOT NULL REFERENCES public.doctor_profiles(id) ON DELETE CASCADE,
            author_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
            author_name TEXT NOT NULL,
            text TEXT NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        """,
        "CREATE INDEX IF NOT EXISTS idx_doctor_admin_notes_doctor_created ON public.doctor_admin_notes(doctor_profile_id, created_at DESC)"
    };

    /// <summary>
    /// Roteamento inteligente de fila (Phase A):
    /// - required_specialty em requests: especialidade exigida para atender (null = qualquer).
    ///   Mitiga risco assistencial de caso cardiológico cair com dermatologista.
    /// - last_assigned_at em doctor_profiles: usado para balanceamento de carga.
    ///   ORDER BY total_consultations ASC, last_assigned_at ASC NULLS FIRST => round-robin justo.
    /// Ambas colunas são retrocompatíveis (NULL = comportamento atual preservado).
    /// </summary>
    private static readonly string[] RequestRoutingMigrations =
    {
        "ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS required_specialty VARCHAR(100)",
        "ALTER TABLE public.doctor_profiles ADD COLUMN IF NOT EXISTS last_assigned_at TIMESTAMPTZ",
        "CREATE INDEX IF NOT EXISTS idx_requests_required_specialty ON public.requests(required_specialty) WHERE required_specialty IS NOT NULL",
        "CREATE INDEX IF NOT EXISTS idx_doctor_profiles_routing ON public.doctor_profiles(available, approval_status, specialty, total_consultations, last_assigned_at)"
    };

    /// <summary>
    /// Phase C — Sensibilidade de notas clínicas (compliance CFM/CFP).
    ///
    /// Regulamentação:
    ///   - CFP Resolução 001/2009: documentos escritos por psicólogos (psicoterapia)
    ///     têm restrição de acesso; outros profissionais só podem ver resumo clínico.
    ///   - Lei 10.216/2001: anotações de saúde mental têm proteção adicional.
    ///   - CFM 1.638/2002: prontuário único admite diferentes níveis de acesso.
    ///   - LGPD Art. 11: dados sensíveis de saúde exigem base legal + minimização.
    ///
    /// Colunas adicionadas em doctor_patient_notes:
    ///   - sensitivity: 'general' | 'specialty_only' | 'author_only'
    ///     (default 'general' preserva comportamento atual — retrocompatível)
    ///   - author_specialty: especialidade do médico autor (para filtro SpecialtyOnly)
    ///   - summary_for_team: resumo seguro compartilhável quando sensitivity = author_only
    ///     (ex.: "em acompanhamento psiquiátrico, estável")
    ///
    /// Tabela adicional note_access_audit: registra quem leu uma nota sensível,
    /// quando e por qual motivo clínico (trilha exigida pela CFP/LGPD).
    /// </summary>
    private static readonly string[] NoteSensitivityMigrations =
    {
        "ALTER TABLE public.doctor_patient_notes ADD COLUMN IF NOT EXISTS sensitivity TEXT NOT NULL DEFAULT 'general'",
        "ALTER TABLE public.doctor_patient_notes ADD COLUMN IF NOT EXISTS author_specialty VARCHAR(100)",
        "ALTER TABLE public.doctor_patient_notes ADD COLUMN IF NOT EXISTS summary_for_team TEXT",
        """
        DO $$ BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'chk_doctor_patient_notes_sensitivity'
          ) THEN
            ALTER TABLE public.doctor_patient_notes
              ADD CONSTRAINT chk_doctor_patient_notes_sensitivity
              CHECK (sensitivity IN ('general', 'specialty_only', 'author_only'));
          END IF;
        END $$
        """,
        "CREATE INDEX IF NOT EXISTS idx_doctor_patient_notes_sensitivity ON public.doctor_patient_notes(patient_id, sensitivity)",
        """
        CREATE TABLE IF NOT EXISTS public.note_access_audit (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            note_id UUID NOT NULL REFERENCES public.doctor_patient_notes(id) ON DELETE CASCADE,
            viewer_doctor_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
            viewer_specialty VARCHAR(100),
            access_reason TEXT,
            accessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        """,
        "CREATE INDEX IF NOT EXISTS idx_note_access_audit_note ON public.note_access_audit(note_id)",
        "CREATE INDEX IF NOT EXISTS idx_note_access_audit_viewer ON public.note_access_audit(viewer_doctor_id, accessed_at DESC)"
    };

    /// <summary>
    /// Phase B — Prioridade clínica em requests.
    /// Permite que a seleção de médicos considere urgência: urgent > high > normal > low.
    /// Default 'normal' preserva comportamento atual (retrocompatível).
    /// Índice composto acelera ORDER BY priority DESC, created_at ASC na fila.
    /// </summary>
    private static readonly string[] RequestPriorityMigrations =
    {
        "ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'normal'",
        """
        DO $$ BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'chk_requests_priority'
          ) THEN
            ALTER TABLE public.requests
              ADD CONSTRAINT chk_requests_priority
              CHECK (priority IN ('low', 'normal', 'high', 'urgent'));
          END IF;
        END $$
        """,
        "CREATE INDEX IF NOT EXISTS idx_requests_priority_created ON public.requests(priority, created_at)"
    };

    /// <summary>
    /// Proteção contra DELETE acidental em tabelas de prontuário (CFM 1.821/2007 — retenção 20 anos).
    /// Trigger bloqueia DELETE hard; usar soft-delete (status = 'cancelled') para inativar registros.
    /// </summary>
    private static readonly string[] DoctorGraduationYearMigrations =
    {
        "ALTER TABLE public.doctor_profiles ADD COLUMN IF NOT EXISTS graduation_year INT NULL"
    };

    /// <summary>
    /// HR onboarding: credenciais (URL de currículo + diploma no S3) + protocolo humano-legível.
    /// O protocolo é gerado por uma SEQUENCE dedicada para que ele seja:
    ///   (a) sequencial e monotônico mesmo sob concorrência,
    ///   (b) curto o suficiente para aparecer na tela de confirmação ("Protocolo RJ-2026-000042"),
    ///   (c) independente do UUID (que é feio e não é citável por telefone).
    /// O DEFAULT é calculado no banco no momento do INSERT — o .NET não precisa gerar nada:
    /// basta omitir a coluna e ler o valor de volta via RETURNING * (que o InsertAsync já faz).
    /// </summary>
    private static readonly string[] DoctorHrCredentialsMigrations =
    {
        "CREATE SEQUENCE IF NOT EXISTS public.rh_protocol_seq START 1 INCREMENT 1",
        "ALTER TABLE public.doctor_profiles ADD COLUMN IF NOT EXISTS curriculum_url VARCHAR(2048) NULL",
        "ALTER TABLE public.doctor_profiles ADD COLUMN IF NOT EXISTS diploma_url    VARCHAR(2048) NULL",
        """
        ALTER TABLE public.doctor_profiles
        ADD COLUMN IF NOT EXISTS hr_protocol VARCHAR(32) NULL
        """,
        """
        ALTER TABLE public.doctor_profiles
        ALTER COLUMN hr_protocol SET DEFAULT (
          'RJ-' || EXTRACT(YEAR FROM NOW())::text || '-' ||
          LPAD(NEXTVAL('public.rh_protocol_seq')::text, 6, '0')
        )
        """,
        // Back-fill: para médicos já existentes criados antes dessa migration,
        // gera o protocolo agora usando a mesma sequence (monotônica).
        """
        UPDATE public.doctor_profiles
           SET hr_protocol = 'RJ-' || EXTRACT(YEAR FROM created_at)::text || '-' ||
                             LPAD(NEXTVAL('public.rh_protocol_seq')::text, 6, '0')
         WHERE hr_protocol IS NULL
        """,
        "CREATE UNIQUE INDEX IF NOT EXISTS ix_doctor_profiles_hr_protocol ON public.doctor_profiles(hr_protocol)"
    };

    /// <summary>
    /// First-come-first-serve claim: médico "pega" um request atomicamente.
    /// claimed_at marca o instante do claim; NULL = disponível na fila.
    /// Índice parcial acelera a query de listagem de requests não-expirados.
    /// </summary>
    private static readonly string[] RequestClaimMigrations =
    {
        "ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ NULL",
        @"CREATE INDEX IF NOT EXISTS idx_requests_claimed_at
         ON public.requests (claimed_at)
       WHERE claimed_at IS NOT NULL AND doctor_id IS NOT NULL"
    };

    /// <summary>
    /// Baseline defensivo de colunas em <c>public.requests</c> que o Monitor de
    /// Produtividade (portal RH) referencia diretamente em queries agregadas e
    /// índices. Em bancos de produção essas colunas já existem (foram criadas
    /// por migrations SQL históricas aplicadas fora do MigrationRunner), mas
    /// bancos novos (dev local, staging, clones) quebravam todas as 4 páginas
    /// do portal RH (Produtividade / Fila ao vivo / Relatórios / Precificação)
    /// com 500s porque as colunas estavam ausentes. Depois do commit a43d8f46
    /// as migrations falham loud, então a lista seguinte de CREATE INDEX em
    /// <c>ProductivityIndexesMigrations</c> bloqueava o startup inteiro.
    ///
    /// Todas idempotentes via <c>IF NOT EXISTS</c>, seguras de rodar em prod.
    /// DEVE rodar ANTES de <c>product_prices</c>, <c>doctor_contracts</c> e
    /// <c>productivity_indexes</c> — que dependem dessas colunas.
    /// </summary>
    private static readonly string[] ProductivityBaselineSchemaMigrations =
    {
        // Timestamp de assinatura — coluna "mãe" de toda a métrica p50/p95/receita
        "ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS signed_at TIMESTAMPTZ",
        // URLs curtas (12 hex) — usado por live queue, drilldown e verificação pública
        "ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS short_code TEXT",
        // Nome do médico denormalizado — usado por live queue pra não precisar de JOIN
        "ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS doctor_name TEXT",
        // Minutos contratados (consultas por minuto) — multiplicador de receita
        "ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS contracted_minutes INTEGER",
        // Valor por minuto em centavos — usado quando consultation_type = 'per_minute'
        "ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS price_per_minute INTEGER",
        // Modalidade de consulta: 'flat' | 'per_minute'
        "ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS consultation_type TEXT",
        // Timestamps da sessão de consulta — usado em índice de busca
        "ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS consultation_started_at TIMESTAMPTZ",
        "ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS consultation_finished_at TIMESTAMPTZ"
    };

    /// <summary>
    /// Tabela de preços por tipo de atendimento — usada pelo Monitor de Produtividade
    /// do portal RH para calcular "receita gerada" por médico. O valor é editado
    /// pelo admin no próprio portal (tela /admin/precificacao).
    /// Ver: docs/superpowers/specs/2026-04-09-monitor-produtividade-medica-design.md
    /// </summary>
    private static readonly string[] ProductPricesMigrations =
    {
        """
        CREATE TABLE IF NOT EXISTS public.product_prices (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            product_key TEXT NOT NULL UNIQUE,
            label TEXT NOT NULL,
            unit TEXT NOT NULL CHECK (unit IN ('unit','minute')),
            price_cents BIGINT NOT NULL CHECK (price_cents >= 0),
            currency CHAR(3) NOT NULL DEFAULT 'BRL',
            active BOOLEAN NOT NULL DEFAULT true,
            notes TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_by UUID
        )
        """,
        // Seeds iniciais com preço 0 — admin edita no portal depois.
        //
        // Defensive: o seed só roda se a coluna `product_key` existir. Em
        // 2026-04-09 21:44 prod migrou manualmente para o schema novo
        // (product_type/subtype/price_brl/is_active) sem atualizar este
        // arquivo. O INSERT antigo passou a quebrar todo deploy do backend
        // com 42703 ("column product_key does not exist") em loop, bloqueando
        // qualquer hotfix subsequente — incluindo o do CORS. O DO $$ abaixo
        // detecta o schema legado e só seeda nele; em prod (schema novo já
        // semeado manualmente com prescription/simples, prescription/azul,
        // etc.) o bloco vira no-op e o startup completa.
        """
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = 'product_prices'
                  AND column_name = 'product_key'
            ) THEN
                INSERT INTO public.product_prices (product_key, label, unit, price_cents) VALUES
                    ('prescription_simple',        'Receita simples',                       'unit',   0),
                    ('prescription_antimicrobial', 'Receita de antimicrobiano',             'unit',   0),
                    ('prescription_controlled',    'Receita controlada (azul/especial)',    'unit',   0),
                    ('exam_request',               'Solicitação de exame',                  'unit',   0),
                    ('consultation_minute',        'Consulta por minuto',                   'minute', 0),
                    ('consultation_flat',          'Consulta fixa (sem tempo contratado)',  'unit',   0)
                ON CONFLICT (product_key) DO NOTHING;
            END IF;
        END $$
        """,
        // O índice referencia a coluna `active`, que não existe no schema novo
        // (que usa `is_active`). Wrap defensivo: só cria o índice se a coluna
        // `active` existir. Prod já tem `idx_product_prices_active` criado
        // sobre `is_active` desde a migração manual de 2026-04-09.
        """
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = 'product_prices'
                  AND column_name = 'active'
            ) THEN
                CREATE INDEX IF NOT EXISTS idx_product_prices_active
                    ON public.product_prices(active)
                    WHERE active = true;
            END IF;
        END $$
        """
    };

    /// <summary>
    /// Contrato de horas por médico — opcional. Quando presente, permite o portal RH
    /// calcular utilização e custo de ociosidade (horas contratadas - horas ativas) × valor hora.
    /// </summary>
    private static readonly string[] DoctorContractsMigrations =
    {
        """
        CREATE TABLE IF NOT EXISTS public.doctor_contracts (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            doctor_profile_id UUID NOT NULL REFERENCES public.doctor_profiles(id) ON DELETE CASCADE,
            hours_per_month INTEGER NOT NULL CHECK (hours_per_month >= 0),
            hourly_rate_cents BIGINT NOT NULL DEFAULT 0 CHECK (hourly_rate_cents >= 0),
            currency CHAR(3) NOT NULL DEFAULT 'BRL',
            availability_window JSONB,
            starts_at DATE NOT NULL,
            ends_at DATE,
            active BOOLEAN NOT NULL DEFAULT true,
            notes TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            created_by UUID,
            updated_by UUID
        )
        """,
        """
        CREATE INDEX IF NOT EXISTS idx_doctor_contracts_profile_active
            ON public.doctor_contracts(doctor_profile_id)
            WHERE active = true
        """
    };

    /// <summary>
    /// Índices compostos para acelerar as queries agregadas do dashboard de produtividade.
    /// Todos parciais (WHERE ...) para não ocupar espaço com linhas irrelevantes.
    /// </summary>
    private static readonly string[] ProductivityIndexesMigrations =
    {
        """
        CREATE INDEX IF NOT EXISTS idx_requests_doctor_status_created
            ON public.requests(doctor_id, status, created_at DESC)
            WHERE doctor_id IS NOT NULL
        """,
        """
        CREATE INDEX IF NOT EXISTS idx_doc_access_log_user_action_created
            ON public.document_access_log(user_id, action, created_at DESC)
            WHERE user_id IS NOT NULL
        """,
        """
        CREATE INDEX IF NOT EXISTS idx_requests_queue_pending
            ON public.requests(status, priority, created_at)
            WHERE status IN ('submitted','searching_doctor','in_review') AND doctor_id IS NULL
        """,
        """
        CREATE INDEX IF NOT EXISTS idx_requests_consultation_started
            ON public.requests(consultation_started_at)
            WHERE consultation_started_at IS NOT NULL
        """,
        """
        CREATE INDEX IF NOT EXISTS idx_requests_signed_at
            ON public.requests(signed_at DESC)
            WHERE signed_at IS NOT NULL
        """
    };

    private static readonly string[] ClinicalRecordRetentionMigrations =
    {
        """
        CREATE OR REPLACE FUNCTION prevent_clinical_delete() RETURNS trigger AS $$
        BEGIN
          RAISE EXCEPTION 'DELETE bloqueado: registros clínicos devem ser retidos por 20 anos (CFM 1.821/2007). Use soft-delete.';
        END;
        $$ LANGUAGE plpgsql
        """,
        """
        DO $$ BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_no_delete_encounters') THEN
            CREATE TRIGGER trg_no_delete_encounters BEFORE DELETE ON public.encounters
              FOR EACH ROW EXECUTE FUNCTION prevent_clinical_delete();
          END IF;
        END $$
        """,
        """
        DO $$ BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_no_delete_medical_documents') THEN
            CREATE TRIGGER trg_no_delete_medical_documents BEFORE DELETE ON public.medical_documents
              FOR EACH ROW EXECUTE FUNCTION prevent_clinical_delete();
          END IF;
        END $$
        """,
        """
        DO $$ BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_no_delete_consultation_anamnesis') THEN
            CREATE TRIGGER trg_no_delete_consultation_anamnesis BEFORE DELETE ON public.consultation_anamnesis
              FOR EACH ROW EXECUTE FUNCTION prevent_clinical_delete();
          END IF;
        END $$
        """
    };

    /// <summary>
    /// Executa todas as migrations. Só roda se DatabaseUrl estiver definida.
    /// </summary>
    public static async Task RunAsync(IServiceProvider serviceProvider, CancellationToken cancellationToken = default)
    {
        var config = serviceProvider.GetService<IOptions<DatabaseConfig>>()?.Value;
        var logger = serviceProvider.GetService<ILogger<MigrationRunnerLogger>>();

        if (config == null || string.IsNullOrWhiteSpace(config.DatabaseUrl))
        {
            logger?.LogInformation("DatabaseUrl not configured, skipping migrations");
            return;
        }

        var connectionString = config.DatabaseUrl.Trim();
        await using var conn = new NpgsqlConnection(connectionString);
        await conn.OpenAsync(cancellationToken);

        const long advisoryLockId = 867530901;
        bool lockAcquired;
        await using (var lockCmd = conn.CreateCommand())
        {
            lockCmd.CommandText = $"SELECT pg_try_advisory_lock({advisoryLockId})";
            lockAcquired = (bool)(await lockCmd.ExecuteScalarAsync(cancellationToken))!;
        }

        if (!lockAcquired)
        {
            logger?.LogInformation("Another instance is running migrations, skipping");
            return;
        }

        try
        {

        logger?.LogInformation("Running Database migrations...");

        var allMigrations = new (string Name, string[] Sqls)[]
        {
            ("refresh_tokens", RefreshTokenMigrations),
            ("password_reset_tokens", PasswordResetTokensMigrations),
            ("request_ai_columns", RequestAiColumns),
            ("prescription_profile_fields", PrescriptionProfileFieldsMigrations),
            ("doctor_certificates", DoctorCertificatesMigrations),
            ("audit_logs", AuditLogsMigrations),
            ("notifications", NotificationsMigrations),
            ("video_rooms", VideoRoomsMigrations),
            ("consultation_anamnesis", ConsultationAnamnesisMigrations),
            ("push_tokens", PushTokensMigrations),
            ("user_push_preferences", UserPushPreferencesMigrations),
            ("doctor_approval_status", DoctorApprovalStatusMigrations),
            ("doctor_patient_notes", DoctorPatientNotesMigrations),

            ("ai_interaction_logs", AiInteractionLogsMigrations),
            ("prontuario", ProntuarioMigrations),
            ("care_plans", CarePlanMigrations),
            ("encounter_enrichment", EncounterEnrichmentMigrations),
            ("document_security", DocumentSecurityMigrations),
            ("prescription_verification_logs", PrescriptionVerificationLogsMigrations),
            ("cleanup_legacy_storage_urls", CleanupLegacyStorageUrlsMigrations),
            ("fix_encounter_patient_id", FixEncounterPatientIdMigrations),
            ("chronic_condition", ChronicConditionMigrations),
            ("prescriptions_table", PrescriptionsTableMigrations),
            ("audit_logs_schema_fix", AuditLogsSchemaFixMigrations),
            ("icd10_column_widen", Icd10ColumnWidenMigrations),
            ("doctor_rqe", DoctorRqeMigrations),
            ("request_routing", RequestRoutingMigrations),
            ("note_sensitivity", NoteSensitivityMigrations),
            ("request_priority", RequestPriorityMigrations),
            ("clinical_record_retention", ClinicalRecordRetentionMigrations),
            ("doctor_graduation_year", DoctorGraduationYearMigrations),
            ("doctor_hr_credentials", DoctorHrCredentialsMigrations),
            ("doctor_ai_analyses", DoctorAiAnalysesMigrations),
            ("doctor_admin_notes", DoctorAdminNotesMigrations),
            ("request_ai_rejection", RequestAiRejectionColumns),
            ("request_claim", RequestClaimMigrations),
            // ATENÇÃO: baseline_schema DEVE vir antes das três migrations de produtividade
            // abaixo, porque elas criam índices/queries que dependem destas colunas.
            // Ver comentário na definição de ProductivityBaselineSchemaMigrations.
            ("productivity_baseline_schema", ProductivityBaselineSchemaMigrations),
            ("product_prices", ProductPricesMigrations),
            ("doctor_contracts", DoctorContractsMigrations),
            ("productivity_indexes", ProductivityIndexesMigrations)
        };

        // Todas as migrations são idempotentes por construção:
        // CREATE TABLE IF NOT EXISTS, ALTER TABLE ADD COLUMN IF NOT EXISTS,
        // CREATE INDEX IF NOT EXISTS, ON CONFLICT DO NOTHING, CREATE OR REPLACE,
        // e DO $$ ... IF NOT EXISTS $$ nos triggers. Portanto, qualquer exceção
        // levantada aqui é um erro REAL (coluna que não existe, permissão, FK
        // inválida, etc.) e não pode ser engolida — senão o app sobe com schema
        // incompleto e endpoints caem com 500 difíceis de diagnosticar em prod
        // (foi exatamente o que aconteceu com as migrations de produtividade em
        // 2026-04-09: product_prices/doctor_contracts falharam silenciosamente
        // e só descobrimos pelos 500s no console do RH).
        foreach (var (name, sqls) in allMigrations)
        {
            for (var i = 0; i < sqls.Length; i++)
            {
                try
                {
                    await using var cmd = conn.CreateCommand();
                    cmd.CommandText = sqls[i];
                    await cmd.ExecuteNonQueryAsync(cancellationToken);
                }
                catch (Exception ex)
                {
                    logger?.LogError(ex,
                        "Migration {Name} failed at statement #{Index}. Aborting startup — schema is in an inconsistent state.",
                        name, i);
                    throw new InvalidOperationException(
                        $"Database migration '{name}' failed at statement #{i}. See inner exception for details.",
                        ex);
                }
            }
            logger?.LogInformation("Migration {Name} completed", name);
        }

        logger?.LogInformation("All Database migrations completed successfully");

        }
        finally
        {
            await using var unlockCmd = conn.CreateCommand();
            unlockCmd.CommandText = $"SELECT pg_advisory_unlock({advisoryLockId})";
            await unlockCmd.ExecuteScalarAsync(cancellationToken);
        }
    }
}
