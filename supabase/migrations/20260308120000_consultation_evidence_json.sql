-- Adiciona coluna evidence_json para armazenar artigos científicos (biblioteca, url, título, relevância)
-- que apoiam o CID sugerido durante a consulta.
-- Estrutura: array de objetos com provider, url, title, source, translatedAbstract, clinicalRelevance, relevantExcerpts

ALTER TABLE public.consultation_anamnesis
   ADD COLUMN IF NOT EXISTS evidence_json TEXT;

COMMENT ON COLUMN public.consultation_anamnesis.evidence_json IS 'JSON com artigos científicos (PubMed, Europe PMC, Semantic Scholar) que apoiam o CID sugerido: provider, url, title, source, clinicalRelevance.';
