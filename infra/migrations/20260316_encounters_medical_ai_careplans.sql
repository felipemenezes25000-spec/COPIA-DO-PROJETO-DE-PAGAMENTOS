-- ============================================================
-- Migration: colunas usadas por EncounterRepository, MedicalDocumentRepository,
-- AiSuggestionRepository, CarePlanRepository (RDS / Postgres).
-- Aplicar em banco já existente. Idempotente (ADD COLUMN IF NOT EXISTS).
-- Data: 2026-03-16
-- ============================================================

-- ----- encounters (EncounterRepository: source_request_id, type, finished_at, reason, anamnesis, etc.) -----
ALTER TABLE public.encounters ADD COLUMN IF NOT EXISTS source_request_id UUID REFERENCES public.requests(id);
ALTER TABLE public.encounters ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'teleconsultation';
ALTER TABLE public.encounters ADD COLUMN IF NOT EXISTS reason TEXT;
ALTER TABLE public.encounters ADD COLUMN IF NOT EXISTS anamnesis TEXT;
ALTER TABLE public.encounters ADD COLUMN IF NOT EXISTS physical_exam TEXT;
ALTER TABLE public.encounters ADD COLUMN IF NOT EXISTS plan TEXT;
ALTER TABLE public.encounters ADD COLUMN IF NOT EXISTS main_icd10_code VARCHAR(10);
ALTER TABLE public.encounters ADD COLUMN IF NOT EXISTS finished_at TIMESTAMPTZ;
ALTER TABLE public.encounters ADD COLUMN IF NOT EXISTS channel TEXT;
CREATE INDEX IF NOT EXISTS idx_encounters_source_request ON public.encounters(source_request_id) WHERE source_request_id IS NOT NULL;

-- ----- medical_documents (MedicalDocumentRepository: source_request_id, signed_document_url, status, etc.) -----
ALTER TABLE public.medical_documents ADD COLUMN IF NOT EXISTS source_request_id UUID REFERENCES public.requests(id);
ALTER TABLE public.medical_documents ADD COLUMN IF NOT EXISTS signed_document_url TEXT;
ALTER TABLE public.medical_documents ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft';
ALTER TABLE public.medical_documents ADD COLUMN IF NOT EXISTS previous_document_id UUID REFERENCES public.medical_documents(id) ON DELETE SET NULL;
ALTER TABLE public.medical_documents ADD COLUMN IF NOT EXISTS medications TEXT;
ALTER TABLE public.medical_documents ADD COLUMN IF NOT EXISTS exams TEXT;
ALTER TABLE public.medical_documents ADD COLUMN IF NOT EXISTS report_body TEXT;
ALTER TABLE public.medical_documents ADD COLUMN IF NOT EXISTS clinical_justification TEXT;
ALTER TABLE public.medical_documents ADD COLUMN IF NOT EXISTS priority TEXT;
ALTER TABLE public.medical_documents ADD COLUMN IF NOT EXISTS icd10_code VARCHAR(10);
ALTER TABLE public.medical_documents ADD COLUMN IF NOT EXISTS leave_days INTEGER;
ALTER TABLE public.medical_documents ADD COLUMN IF NOT EXISTS general_instructions TEXT;
ALTER TABLE public.medical_documents ADD COLUMN IF NOT EXISTS signature_hash TEXT;
ALTER TABLE public.medical_documents ADD COLUMN IF NOT EXISTS signature_algorithm TEXT;
ALTER TABLE public.medical_documents ADD COLUMN IF NOT EXISTS signature_certificate TEXT;
ALTER TABLE public.medical_documents ADD COLUMN IF NOT EXISTS signature_is_valid BOOLEAN;
ALTER TABLE public.medical_documents ADD COLUMN IF NOT EXISTS signature_validation_result TEXT;
ALTER TABLE public.medical_documents ADD COLUMN IF NOT EXISTS signature_policy_oid TEXT;
CREATE INDEX IF NOT EXISTS idx_medical_documents_source_request ON public.medical_documents(source_request_id) WHERE source_request_id IS NOT NULL;

-- ----- ai_suggestions (AiSuggestionRepository: consultation_id, doctor_id, type, status, model, payload_json, etc.) -----
ALTER TABLE public.ai_suggestions ADD COLUMN IF NOT EXISTS consultation_id UUID REFERENCES public.requests(id) ON DELETE CASCADE;
ALTER TABLE public.ai_suggestions ADD COLUMN IF NOT EXISTS patient_id UUID REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.ai_suggestions ADD COLUMN IF NOT EXISTS doctor_id UUID REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.ai_suggestions ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'exam_suggestion';
ALTER TABLE public.ai_suggestions ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'generated';
ALTER TABLE public.ai_suggestions ADD COLUMN IF NOT EXISTS payload_json JSONB DEFAULT '{}';
ALTER TABLE public.ai_suggestions ADD COLUMN IF NOT EXISTS payload_hash TEXT NOT NULL DEFAULT '';
ALTER TABLE public.ai_suggestions ADD COLUMN IF NOT EXISTS model TEXT NOT NULL DEFAULT '';
ALTER TABLE public.ai_suggestions ADD COLUMN IF NOT EXISTS correlation_id TEXT;
ALTER TABLE public.ai_suggestions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_consultation_id ON public.ai_suggestions(consultation_id) WHERE consultation_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_doctor_id ON public.ai_suggestions(doctor_id) WHERE doctor_id IS NOT NULL;

-- ----- care_plans (CarePlanRepository: consultation_id, created_from_ai_suggestion_id, etc.) -----
ALTER TABLE public.care_plans ADD COLUMN IF NOT EXISTS consultation_id UUID REFERENCES public.requests(id) ON DELETE CASCADE;
ALTER TABLE public.care_plans ADD COLUMN IF NOT EXISTS created_from_ai_suggestion_id UUID REFERENCES public.ai_suggestions(id);
ALTER TABLE public.care_plans ADD COLUMN IF NOT EXISTS correlation_id TEXT;
ALTER TABLE public.care_plans ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_care_plans_consultation_id ON public.care_plans(consultation_id) WHERE consultation_id IS NOT NULL;

-- ----- care_plan_tasks (CarePlanTaskRepository: assigned_doctor_id, type, state, payload_json, due_at) -----
ALTER TABLE public.care_plan_tasks ADD COLUMN IF NOT EXISTS assigned_doctor_id UUID REFERENCES public.users(id);
ALTER TABLE public.care_plan_tasks ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'instruction';
ALTER TABLE public.care_plan_tasks ADD COLUMN IF NOT EXISTS state TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE public.care_plan_tasks ADD COLUMN IF NOT EXISTS payload_json JSONB NOT NULL DEFAULT '{}';
ALTER TABLE public.care_plan_tasks ADD COLUMN IF NOT EXISTS due_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_care_plan_tasks_care_plan_id ON public.care_plan_tasks(care_plan_id);

-- ----- care_plan_task_files (storage_path, content_type, uploaded_by_user_id) -----
ALTER TABLE public.care_plan_task_files ADD COLUMN IF NOT EXISTS storage_path TEXT NOT NULL DEFAULT '';
ALTER TABLE public.care_plan_task_files ADD COLUMN IF NOT EXISTS content_type TEXT NOT NULL DEFAULT 'application/octet-stream';
ALTER TABLE public.care_plan_task_files ADD COLUMN IF NOT EXISTS uploaded_by_user_id UUID REFERENCES public.users(id);

SELECT 'Migration 20260316_encounters_medical_ai_careplans aplicada.' AS result;
