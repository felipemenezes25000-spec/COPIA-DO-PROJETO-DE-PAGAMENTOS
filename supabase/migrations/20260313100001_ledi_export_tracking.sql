-- ============================================================
-- Migration: Tabela de controle de exportação LEDI e-SUS APS
-- Rastreia lotes, fichas individuais, erros e reenvios
-- ============================================================

CREATE TABLE IF NOT EXISTS public.exportacoes_ledi (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo_ficha          TEXT NOT NULL,       -- cadastro_individual, atendimento_individual, etc.
    entidade_id         UUID NOT NULL,       -- ID do atendimento/cidadão de origem
    entidade_tipo       TEXT NOT NULL,       -- atendimentos_aps, cidadaos, etc.
    ledi_uuid           TEXT NOT NULL UNIQUE,
    arquivo_nome        TEXT NOT NULL,       -- uuid.esus
    arquivo_tamanho     INT,
    
    -- Status de envio
    status              TEXT NOT NULL DEFAULT 'pendente'
                        CHECK (status IN ('pendente','enviando','sucesso','erro','reenvio_pendente')),
    tentativas          INT NOT NULL DEFAULT 0,
    
    -- Resposta do PEC
    http_status         INT,
    erro_codigo         TEXT,
    erro_mensagem       TEXT,
    
    -- Rastreabilidade
    unidade_saude_id    UUID REFERENCES public.unidades_saude(id),
    profissional_id     UUID REFERENCES public.profissionais_sus(id),
    periodo_referencia  DATE,
    
    -- Timestamps
    gerado_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    enviado_at          TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exportacoes_status ON public.exportacoes_ledi (status) WHERE status != 'sucesso';
CREATE INDEX IF NOT EXISTS idx_exportacoes_entidade ON public.exportacoes_ledi (entidade_tipo, entidade_id);
CREATE INDEX IF NOT EXISTS idx_exportacoes_unidade ON public.exportacoes_ledi (unidade_saude_id, periodo_referencia);
CREATE INDEX IF NOT EXISTS idx_exportacoes_ledi_uuid ON public.exportacoes_ledi (ledi_uuid);

ALTER TABLE public.exportacoes_ledi ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON public.exportacoes_ledi FOR ALL TO service_role USING (true) WITH CHECK (true);
