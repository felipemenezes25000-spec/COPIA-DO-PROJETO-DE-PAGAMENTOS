/**
 * RH AI features — proxied through the .NET backend.
 *
 * Security: NO API keys in the browser. All OpenAI/Gemini calls go through
 * `/api/rh/ai/*` endpoints on the backend, which holds the secret.
 */

import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL as string | undefined;

const api = API_URL
  ? axios.create({ baseURL: API_URL, timeout: 60000 })
  : null;

function authHeaders(token?: string | null) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function isAIAvailable(): boolean {
  // AI features are available whenever the backend is configured.
  return Boolean(api);
}

/* ------------------------------------------------------------------ */
/* 1. Gerar "Sobre você" para o candidato                              */
/* ------------------------------------------------------------------ */

interface GenerateBioParams {
  categoria: string;
  especialidade: string;
  anosExperiencia: string;
  expTelemedicina?: string;
  graduacao?: string;
  universidade?: string;
  posGraduacao?: string;
  residencia?: string;
}

export async function generateBio(params: GenerateBioParams): Promise<string> {
  if (!api) {
    throw new Error('Backend não configurado (VITE_API_URL).');
  }

  const { data } = await api.post('/api/rh/ai/generate-bio', {
    categoria: params.categoria,
    especialidade: params.especialidade,
    anosExperiencia: params.anosExperiencia,
    expTelemedicina: params.expTelemedicina,
    graduacao: params.graduacao,
    universidade: params.universidade,
    posGraduacao: params.posGraduacao,
    residencia: params.residencia,
  });

  return (data?.bio ?? '').trim();
}

/* ------------------------------------------------------------------ */
/* 2. Análise IA de candidato (painel admin)                           */
/* ------------------------------------------------------------------ */

export interface AIAnalysis {
  score: number;
  resumo: string;
  pontosFortes: string[];
  pontosFracos: string[];
  recomendacao: 'aprovar' | 'entrevistar' | 'analisar_mais' | 'rejeitar';
  recomendacaoTexto: string;
}

interface AnalyzeCandidateParams {
  nome: string;
  categoria: string;
  especialidade: string;
  anosExperiencia: string;
  expTelemedicina?: string;
  sobre?: string;
  graduacao: string;
  universidade: string;
  anoConclusao: number;
  posGraduacao?: string;
  residencia?: string;
}

export async function analyzeCandidate(
  params: AnalyzeCandidateParams,
  token?: string | null,
): Promise<AIAnalysis> {
  if (!api) {
    throw new Error('Backend não configurado (VITE_API_URL).');
  }

  try {
    const { data } = await api.post(
      '/api/rh/ai/analyze-candidate',
      {
        nome: params.nome,
        categoria: params.categoria,
        especialidade: params.especialidade,
        anosExperiencia: params.anosExperiencia,
        expTelemedicina: params.expTelemedicina,
        sobre: params.sobre,
        graduacao: params.graduacao,
        universidade: params.universidade,
        anoConclusao: params.anoConclusao,
        posGraduacao: params.posGraduacao,
        residencia: params.residencia,
      },
      { headers: authHeaders(token) },
    );

    return {
      score: data.score,
      resumo: data.resumo,
      pontosFortes: data.pontosFortes ?? [],
      pontosFracos: data.pontosFracos ?? [],
      recomendacao: data.recomendacao,
      recomendacaoTexto: data.recomendacaoTexto,
    };
  } catch {
    return {
      score: 50,
      resumo: 'Não foi possível gerar análise detalhada. Revise manualmente.',
      pontosFortes: ['Perfil registrado com sucesso'],
      pontosFracos: ['Análise automática indisponível'],
      recomendacao: 'analisar_mais',
      recomendacaoTexto: 'Recomenda-se análise manual do perfil.',
    };
  }
}
