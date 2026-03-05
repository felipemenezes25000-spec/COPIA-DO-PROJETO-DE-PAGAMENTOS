-- Migration: Care Plans (ai_suggestions, care_plans, care_plan_tasks, care_plan_task_files, outbox_events)
-- Execute manualmente no Supabase SQL Editor ou via: psql $DATABASE_URL -f supabase/migrations/20250304000000_care_plans.sql

-- ai_suggestions
CREATE TABLE IF NOT EXISTS public.ai_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consultation_id UUID NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    doctor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    type TEXT NOT NULL DEFAULT 'exam_suggestion',
    status TEXT NOT NULL DEFAULT 'generated',
    model TEXT NOT NULL,
    payload_json JSONB NOT NULL,
    payload_hash TEXT NOT NULL,
    correlation_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_consultation_id ON public.ai_suggestions(consultation_id);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_patient_id ON public.ai_suggestions(patient_id);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_doctor_id ON public.ai_suggestions(doctor_id);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_status ON public.ai_suggestions(status);
CREATE UNIQUE INDEX IF NOT EXISTS ux_ai_suggestions_idempotency
ON public.ai_suggestions (consultation_id, COALESCE(doctor_id, '00000000-0000-0000-0000-000000000000'::uuid), payload_hash);
ALTER TABLE public.ai_suggestions DROP CONSTRAINT IF EXISTS ai_suggestions_status_check;
ALTER TABLE public.ai_suggestions
ADD CONSTRAINT ai_suggestions_status_check CHECK (status IN ('generated','reviewed','approved','rejected','superseded'));

-- care_plans
CREATE TABLE IF NOT EXISTS public.care_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consultation_id UUID NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    responsible_doctor_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    status TEXT NOT NULL DEFAULT 'active',
    created_from_ai_suggestion_id UUID NOT NULL REFERENCES public.ai_suggestions(id) ON DELETE RESTRICT,
    correlation_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    closed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_care_plans_consultation_id ON public.care_plans(consultation_id);
CREATE INDEX IF NOT EXISTS idx_care_plans_patient_id ON public.care_plans(patient_id);
CREATE INDEX IF NOT EXISTS idx_care_plans_responsible_doctor_id ON public.care_plans(responsible_doctor_id);
CREATE INDEX IF NOT EXISTS idx_care_plans_status ON public.care_plans(status);
CREATE UNIQUE INDEX IF NOT EXISTS ux_care_plan_active_per_consultation
ON public.care_plans(consultation_id)
WHERE status IN ('active','waiting_patient','waiting_results','ready_for_review');
ALTER TABLE public.care_plans DROP CONSTRAINT IF EXISTS care_plans_status_check;
ALTER TABLE public.care_plans
ADD CONSTRAINT care_plans_status_check CHECK (status IN ('active','waiting_patient','waiting_results','ready_for_review','closed','escalated'));

-- care_plan_tasks
CREATE TABLE IF NOT EXISTS public.care_plan_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    care_plan_id UUID NOT NULL REFERENCES public.care_plans(id) ON DELETE CASCADE,
    assigned_doctor_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    type TEXT NOT NULL,
    state TEXT NOT NULL DEFAULT 'pending',
    title TEXT NOT NULL,
    description TEXT,
    payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    due_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_care_plan_tasks_care_plan_id ON public.care_plan_tasks(care_plan_id);
CREATE INDEX IF NOT EXISTS idx_care_plan_tasks_assigned_doctor_id ON public.care_plan_tasks(assigned_doctor_id);
CREATE INDEX IF NOT EXISTS idx_care_plan_tasks_state ON public.care_plan_tasks(state);
ALTER TABLE public.care_plan_tasks DROP CONSTRAINT IF EXISTS care_plan_tasks_type_check;
ALTER TABLE public.care_plan_tasks
ADD CONSTRAINT care_plan_tasks_type_check CHECK (type IN ('exam_order','upload_result','follow_up','in_person_guidance','instruction'));
ALTER TABLE public.care_plan_tasks DROP CONSTRAINT IF EXISTS care_plan_tasks_state_check;
ALTER TABLE public.care_plan_tasks
ADD CONSTRAINT care_plan_tasks_state_check CHECK (state IN ('pending','in_progress','done_by_patient','submitted','reviewed','rejected','closed'));

-- care_plan_task_files
CREATE TABLE IF NOT EXISTS public.care_plan_task_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.care_plan_tasks(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,
    file_url TEXT NOT NULL,
    content_type TEXT NOT NULL,
    uploaded_by_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_care_plan_task_files_task_id ON public.care_plan_task_files(task_id);

-- outbox_events
CREATE TABLE IF NOT EXISTS public.outbox_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aggregate_type TEXT NOT NULL,
    aggregate_id UUID NOT NULL,
    event_type TEXT NOT NULL,
    payload_json JSONB NOT NULL,
    idempotency_key TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_outbox_events_idempotency_key ON public.outbox_events(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_outbox_events_status_created_at ON public.outbox_events(status, created_at);

-- RLS
ALTER TABLE IF EXISTS public.care_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.care_plan_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.care_plan_task_files ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='care_plans' AND policyname='care_plans_patient_select') THEN
        CREATE POLICY care_plans_patient_select ON public.care_plans FOR SELECT USING (patient_id = auth.uid());
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='care_plans' AND policyname='care_plans_doctor_select') THEN
        CREATE POLICY care_plans_doctor_select ON public.care_plans FOR SELECT USING (responsible_doctor_id = auth.uid());
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='care_plan_tasks' AND policyname='care_plan_tasks_patient_select') THEN
        CREATE POLICY care_plan_tasks_patient_select ON public.care_plan_tasks FOR SELECT USING (
            EXISTS (
                SELECT 1 FROM public.care_plans cp
                WHERE cp.id = care_plan_tasks.care_plan_id
                AND cp.patient_id = auth.uid()
            )
        );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='care_plan_tasks' AND policyname='care_plan_tasks_doctor_select') THEN
        CREATE POLICY care_plan_tasks_doctor_select ON public.care_plan_tasks FOR SELECT USING (
            EXISTS (
                SELECT 1 FROM public.care_plans cp
                WHERE cp.id = care_plan_tasks.care_plan_id
                AND cp.responsible_doctor_id = auth.uid()
            )
        );
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='care_plan_task_files' AND policyname='care_plan_task_files_patient_select') THEN
        CREATE POLICY care_plan_task_files_patient_select ON public.care_plan_task_files FOR SELECT USING (
            EXISTS (
                SELECT 1
                FROM public.care_plan_tasks t
                JOIN public.care_plans cp ON cp.id = t.care_plan_id
                WHERE t.id = care_plan_task_files.task_id
                AND cp.patient_id = auth.uid()
            )
        );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='care_plan_task_files' AND policyname='care_plan_task_files_doctor_select') THEN
        CREATE POLICY care_plan_task_files_doctor_select ON public.care_plan_task_files FOR SELECT USING (
            EXISTS (
                SELECT 1
                FROM public.care_plan_tasks t
                JOIN public.care_plans cp ON cp.id = t.care_plan_id
                WHERE t.id = care_plan_task_files.task_id
                AND cp.responsible_doctor_id = auth.uid()
            )
        );
    END IF;
END $$;
