-- Modelo rico inspirado em FHIR (ClinicalImpression), Epic/Cerner (progress notes, addendums)
-- e CFM Res. 2.314/2022. Múltiplas notas com metadados: tipo, data/hora, vínculo com atendimento.
-- Substitui schema anterior (doctor_id+patient_id PK) por múltiplas notas por par.

DROP TABLE IF EXISTS public.doctor_patient_notes CASCADE;

CREATE TABLE public.doctor_patient_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    note_type TEXT NOT NULL DEFAULT 'progress_note'
        CHECK (note_type IN ('progress_note', 'clinical_impression', 'addendum', 'observation')),
    content TEXT NOT NULL,
    request_id UUID REFERENCES public.requests(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_dpn_doctor ON public.doctor_patient_notes(doctor_id);
CREATE INDEX idx_dpn_patient ON public.doctor_patient_notes(patient_id);
CREATE INDEX idx_dpn_request ON public.doctor_patient_notes(request_id) WHERE request_id IS NOT NULL;
CREATE INDEX idx_dpn_created ON public.doctor_patient_notes(created_at DESC);

COMMENT ON TABLE public.doctor_patient_notes IS 'Notas clínicas do médico sobre o paciente. Tipos: progress_note, clinical_impression, addendum, observation. Inspirado em FHIR/Epic/Cerner.';
COMMENT ON COLUMN public.doctor_patient_notes.note_type IS 'progress_note=evolução; clinical_impression=impressão diagnóstica; addendum=complemento; observation=observação livre';
COMMENT ON COLUMN public.doctor_patient_notes.request_id IS 'Vínculo opcional com atendimento (receita, exame, consulta)';

ALTER TABLE public.doctor_patient_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY dpn_select ON public.doctor_patient_notes FOR SELECT USING (doctor_id = auth.uid());
CREATE POLICY dpn_insert ON public.doctor_patient_notes FOR INSERT WITH CHECK (doctor_id = auth.uid());
CREATE POLICY dpn_update ON public.doctor_patient_notes FOR UPDATE USING (doctor_id = auth.uid());
CREATE POLICY dpn_delete ON public.doctor_patient_notes FOR DELETE USING (doctor_id = auth.uid());
