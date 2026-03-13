-- ============================================================
-- Migration: SUS / APS Module — Atenção Primária à Saúde
-- Tabelas: unidades_saude, cidadaos, profissionais_sus,
--          agenda_ubs, atendimentos_aps, prescricoes_aps
-- ============================================================

-- ── 1. Unidades de Saúde ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.unidades_saude (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome        TEXT NOT NULL,
    cnes        TEXT NOT NULL UNIQUE,
    tipo        TEXT,                -- UBS, UPA, CAPS, etc.
    telefone    TEXT,
    email       TEXT,
    logradouro  TEXT,
    numero      TEXT,
    bairro      TEXT,
    cidade      TEXT,
    estado      TEXT,
    cep         TEXT,
    ativo       BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_unidades_saude_cnes ON public.unidades_saude (cnes);
CREATE INDEX IF NOT EXISTS idx_unidades_saude_ativo ON public.unidades_saude (ativo) WHERE ativo = true;

-- ── 2. Cidadãos (pacientes SUS) ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.cidadaos (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome_completo       TEXT NOT NULL,
    cpf                 TEXT,
    cns                 TEXT,
    data_nascimento     DATE,
    sexo                TEXT CHECK (sexo IN ('M', 'F', 'I')),
    telefone            TEXT,
    email               TEXT,
    nome_mae            TEXT,
    nome_pai            TEXT,
    logradouro          TEXT,
    numero              TEXT,
    complemento         TEXT,
    bairro              TEXT,
    cidade              TEXT,
    estado              TEXT,
    cep                 TEXT,
    microarea           TEXT,
    codigo_familia      TEXT,
    unidade_saude_id    UUID REFERENCES public.unidades_saude(id),
    ativo               BOOLEAN NOT NULL DEFAULT true,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_cidadaos_cpf ON public.cidadaos (cpf) WHERE cpf IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cidadaos_cns ON public.cidadaos (cns) WHERE cns IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cidadaos_nome ON public.cidadaos USING gin (nome_completo gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_cidadaos_unidade ON public.cidadaos (unidade_saude_id);

-- ── 3. Profissionais SUS ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profissionais_sus (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome_completo       TEXT NOT NULL,
    cpf                 TEXT,
    cns                 TEXT,
    cbo                 TEXT,
    conselho_numero     TEXT,
    conselho_uf         TEXT,
    conselho_tipo       TEXT,       -- CRM, COREN, etc.
    especialidade       TEXT,
    telefone            TEXT,
    email               TEXT,
    unidade_saude_id    UUID NOT NULL REFERENCES public.unidades_saude(id),
    user_id             UUID REFERENCES auth.users(id),
    ativo               BOOLEAN NOT NULL DEFAULT true,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profissionais_unidade ON public.profissionais_sus (unidade_saude_id);
CREATE INDEX IF NOT EXISTS idx_profissionais_user ON public.profissionais_sus (user_id) WHERE user_id IS NOT NULL;

-- ── 4. Agenda UBS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.agenda_ubs (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cidadao_id          UUID NOT NULL REFERENCES public.cidadaos(id),
    cidadao_nome        TEXT,
    profissional_id     UUID NOT NULL REFERENCES public.profissionais_sus(id),
    profissional_nome   TEXT,
    unidade_saude_id    UUID NOT NULL REFERENCES public.unidades_saude(id),
    data_hora           TIMESTAMPTZ NOT NULL,
    status              TEXT NOT NULL DEFAULT 'agendado'
                        CHECK (status IN ('agendado','aguardando','chamado','em_atendimento','finalizado','cancelado','nao_compareceu')),
    tipo_atendimento    TEXT,
    observacoes         TEXT,
    check_in_at         TIMESTAMPTZ,
    chamada_at          TIMESTAMPTZ,
    inicio_at           TIMESTAMPTZ,
    fim_at              TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agenda_data ON public.agenda_ubs (data_hora);
CREATE INDEX IF NOT EXISTS idx_agenda_unidade_data ON public.agenda_ubs (unidade_saude_id, data_hora);
CREATE INDEX IF NOT EXISTS idx_agenda_profissional ON public.agenda_ubs (profissional_id, data_hora);
CREATE INDEX IF NOT EXISTS idx_agenda_cidadao ON public.agenda_ubs (cidadao_id);
CREATE INDEX IF NOT EXISTS idx_agenda_status ON public.agenda_ubs (status) WHERE status NOT IN ('finalizado','cancelado');

-- ── 5. Atendimentos APS (SOAP) ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.atendimentos_aps (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cidadao_id              UUID NOT NULL REFERENCES public.cidadaos(id),
    cidadao_nome            TEXT,
    profissional_id         UUID NOT NULL REFERENCES public.profissionais_sus(id),
    profissional_nome       TEXT,
    unidade_saude_id        UUID NOT NULL REFERENCES public.unidades_saude(id),
    agenda_id               UUID REFERENCES public.agenda_ubs(id),

    -- SOAP
    subjetivo               TEXT,
    objetivo                TEXT,
    avaliacao               TEXT,
    plano                   TEXT,

    -- Sinais vitais
    pressao_arterial        TEXT,
    temperatura             NUMERIC(4,1),
    frequencia_cardiaca     INT,
    frequencia_respiratoria INT,
    peso                    NUMERIC(5,2),
    altura                  NUMERIC(3,2),
    imc                     NUMERIC(5,2),
    saturacao_o2            INT,
    glicemia                NUMERIC(6,1),

    -- Classificação
    cid10_principal         TEXT,
    cid10_secundario        TEXT,
    ciap2                   TEXT,
    tipo_atendimento        TEXT,
    procedimentos           TEXT,

    -- Encaminhamento
    encaminhamento          TEXT,
    observacoes             TEXT,

    -- Exportação e-SUS
    exportado_esus          BOOLEAN NOT NULL DEFAULT false,
    exportado_esus_at       TIMESTAMPTZ,
    ledi_uuid               TEXT,

    data_atendimento        TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_atendimentos_cidadao ON public.atendimentos_aps (cidadao_id);
CREATE INDEX IF NOT EXISTS idx_atendimentos_profissional ON public.atendimentos_aps (profissional_id);
CREATE INDEX IF NOT EXISTS idx_atendimentos_unidade ON public.atendimentos_aps (unidade_saude_id, data_atendimento);
CREATE INDEX IF NOT EXISTS idx_atendimentos_exportacao ON public.atendimentos_aps (exportado_esus) WHERE exportado_esus = false;

-- ── 6. Prescrições APS ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.prescricoes_aps (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    atendimento_id      UUID NOT NULL REFERENCES public.atendimentos_aps(id) ON DELETE CASCADE,
    cidadao_id          UUID NOT NULL REFERENCES public.cidadaos(id),
    profissional_id     UUID NOT NULL REFERENCES public.profissionais_sus(id),
    unidade_saude_id    UUID NOT NULL REFERENCES public.unidades_saude(id),
    medicamento         TEXT NOT NULL,
    posologia           TEXT,
    dose                TEXT,
    frequencia          TEXT,
    duracao             TEXT,
    via_administracao   TEXT,
    orientacoes         TEXT,
    quantidade          INT NOT NULL DEFAULT 1,
    uso_continuo        BOOLEAN NOT NULL DEFAULT false,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prescricoes_atendimento ON public.prescricoes_aps (atendimento_id);
CREATE INDEX IF NOT EXISTS idx_prescricoes_cidadao ON public.prescricoes_aps (cidadao_id);

-- ── Extensão trigram para busca por nome ─────────────────────
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ── RLS básico (service_role bypass) ─────────────────────────
ALTER TABLE public.unidades_saude ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cidadaos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profissionais_sus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agenda_ubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atendimentos_aps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescricoes_aps ENABLE ROW LEVEL SECURITY;

-- Permitir service_role (backend) acesso total
CREATE POLICY "service_role_all" ON public.unidades_saude FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON public.cidadaos FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON public.profissionais_sus FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON public.agenda_ubs FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON public.atendimentos_aps FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON public.prescricoes_aps FOR ALL TO service_role USING (true) WITH CHECK (true);
