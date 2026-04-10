// ============================================
// SUS / APS MODULE TYPES
// ============================================

export type AgendaStatus =
  | 'agendado'
  | 'aguardando'
  | 'chamado'
  | 'em_atendimento'
  | 'finalizado'
  | 'cancelado'
  | 'nao_compareceu';

export interface UnidadeSaudeDto {
  id: string;
  nome: string;
  cnes: string;
  tipo: string | null;
  telefone: string | null;
  email: string | null;
  logradouro: string | null;
  numero: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  ativo: boolean;
  createdAt: string;
}

export interface CidadaoDto {
  id: string;
  nomeCompleto: string;
  cpf: string | null;
  cns: string | null;
  dataNascimento: string | null;
  sexo: string | null;
  telefone: string | null;
  email: string | null;
  nomeMae: string | null;
  nomePai: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  microarea: string | null;
  codigoFamilia: string | null;
  unidadeSaudeId: string | null;
  unidadeSaudeNome: string | null;
  ativo: boolean;
  createdAt: string;
}

export interface ProfissionalSusDto {
  id: string;
  nomeCompleto: string;
  cpf: string | null;
  cns: string | null;
  cbo: string | null;
  conselhoNumero: string | null;
  conselhoUf: string | null;
  conselhoTipo: string | null;
  especialidade: string | null;
  telefone: string | null;
  email: string | null;
  unidadeSaudeId: string;
  unidadeSaudeNome: string | null;
  userId: string | null;
  ativo: boolean;
  createdAt: string;
}

export interface AgendaUbsDto {
  id: string;
  cidadaoId: string;
  cidadaoNome: string | null;
  profissionalId: string;
  profissionalNome: string | null;
  unidadeSaudeId: string;
  dataHora: string;
  status: AgendaStatus;
  tipoAtendimento: string | null;
  observacoes: string | null;
  checkInAt: string | null;
  chamadaAt: string | null;
  inicioAt: string | null;
  fimAt: string | null;
  createdAt: string;
}

export interface AtendimentoApsDto {
  id: string;
  cidadaoId: string;
  cidadaoNome: string | null;
  profissionalId: string;
  profissionalNome: string | null;
  unidadeSaudeId: string;
  agendaId: string | null;
  subjetivo: string | null;
  objetivo: string | null;
  avaliacao: string | null;
  plano: string | null;
  pressaoArterial: string | null;
  temperatura: number | null;
  frequenciaCardiaca: number | null;
  frequenciaRespiratoria: number | null;
  peso: number | null;
  altura: number | null;
  imc: number | null;
  saturacaoO2: number | null;
  glicemia: number | null;
  cid10Principal: string | null;
  cid10Secundario: string | null;
  ciap2: string | null;
  tipoAtendimento: string | null;
  procedimentos: string | null;
  encaminhamento: string | null;
  observacoes: string | null;
  exportadoEsus: boolean;
  dataAtendimento: string;
  createdAt: string;
  prescricoes: PrescricaoApsDto[] | null;
}

export interface PrescricaoApsDto {
  id: string;
  medicamento: string;
  posologia: string | null;
  dose: string | null;
  frequencia: string | null;
  duracao: string | null;
  viaAdministracao: string | null;
  orientacoes: string | null;
  quantidade: number;
  usoContinuo: boolean;
  createdAt: string;
}

export interface RelatorioProducaoDto {
  totalAtendimentos: number;
  totalCidadaos: number;
  totalProfissionais: number;
  porUnidade: { unidadeSaudeId: string; nome: string; total: number }[];
  porProfissional: { profissionalId: string; nome: string; total: number }[];
}

export interface ExportacaoSusDto {
  totalPendentes: number;
  totalExportados: number;
  ultimaExportacao: string | null;
}

// ── Agenda status labels ─────────────────────────────────────
export const AGENDA_STATUS_LABELS: Record<AgendaStatus, string> = {
  agendado: 'Agendado',
  aguardando: 'Aguardando',
  chamado: 'Chamado',
  em_atendimento: 'Em Atendimento',
  finalizado: 'Finalizado',
  cancelado: 'Cancelado',
  nao_compareceu: 'Não Compareceu',
};

export const AGENDA_STATUS_COLORS: Record<AgendaStatus, string> = {
  agendado: '#3B82F6',
  aguardando: '#F59E0B',
  chamado: '#8B5CF6',
  em_atendimento: '#0EA5E9',
  finalizado: '#16A34A',
  cancelado: '#EF4444',
  nao_compareceu: '#94A3B8',
};
