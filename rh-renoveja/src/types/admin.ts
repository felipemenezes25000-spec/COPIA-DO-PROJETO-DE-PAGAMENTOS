import type { ProfessionalCategory, Gender, ExperienceYears } from './index';

export type CandidateStatus =
  | 'pendente'
  | 'em_analise'
  | 'entrevista'
  | 'aprovado'
  | 'rejeitado';

export interface AdminCandidate {
  id: string;
  protocolo: string;
  status: CandidateStatus;
  createdAt: string;
  updatedAt: string;

  // Personal
  nome: string;
  cpf: string;
  nascimento: string;
  email: string;
  telefone: string;
  genero?: Gender;
  estado: string;
  cidade: string;

  // Professional
  categoria: ProfessionalCategory;
  conselho: string;
  ufRegistro: string;
  especialidade: string;
  /** Optional: not collected by the mobile app's doctor registration flow. */
  anosExperiencia?: ExperienceYears;
  expTelemedicina?: string;
  sobre?: string;

  // Academic
  graduacao: string;
  universidade: string;
  anoConclusao: number;
  posGraduacao?: string;
  residencia?: string;

  // Documents
  curriculoUrl?: string;
  diplomaUrl?: string;

  // Notes
  notas: AdminNote[];

  // AI Analysis (persisted)
  aiAnalysis?: AIAnalysisResult;
}

export type AIRecommendation = 'aprovar' | 'entrevistar' | 'analisar_mais' | 'rejeitar';

export interface AIAnalysisResult {
  score: number;
  resumo: string;
  pontosFortes: string[];
  pontosFracos: string[];
  recomendacao: AIRecommendation;
  recomendacaoTexto: string;
  analyzedAt: string;
}

export interface AdminNote {
  id: string;
  autor: string;
  texto: string;
  createdAt: string;
}

export interface AdminStats {
  total: number;
  pendentes: number;
  emAnalise: number;
  entrevista: number;
  aprovados: number;
  rejeitados: number;
  porCategoria: Record<ProfessionalCategory, number>;
}

export interface AdminUser {
  email: string;
  nome: string;
  token?: string;
}

/** Extended dashboard analytics */
export interface DashboardAnalytics {
  stats: AdminStats;
  taxaAprovacao: number;
  taxaRejeicao: number;
  mediaIdade: number;
  comTelemedicina: number;
  porEstado: { estado: string; total: number }[];
  porExperiencia: { label: string; total: number }[];
  porSemana: { semana: string; total: number }[];
  topEspecialidades: { especialidade: string; total: number }[];
}
