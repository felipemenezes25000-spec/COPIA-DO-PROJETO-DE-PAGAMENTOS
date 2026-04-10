/**
 * Tipos do Portal RH (RenoveJá+).
 * Camada de dados/tipos — sem dependências de UI.
 */

export type ColaboradorStatus = 'ativo' | 'ferias' | 'afastado' | 'desligado';
export type ContratoTipo = 'CLT' | 'PJ' | 'Estagio';
export type Genero = 'masculino' | 'feminino' | 'outro' | 'nao_informado';

export interface Colaborador {
  id: string;
  nome: string;
  email: string;
  cpfMask: string;
  cargo: string;
  departamento: string;
  dataAdmissao: string; // ISO date
  salario: number;
  status: ColaboradorStatus;
  avatarUrl?: string;
  telefone: string;
  endereco: string;
  contratoTipo: ContratoTipo;
  genero: Genero;
  dataNascimento: string; // ISO date
  gestorId?: string;
}

export interface Departamento {
  id: string;
  nome: string;
  headcount: number;
  orcamento: number;
  gestor: string;
}

export type CandidatoEtapa =
  | 'triagem'
  | 'entrevista_rh'
  | 'entrevista_tecnica'
  | 'proposta'
  | 'contratado'
  | 'rejeitado';

export interface Candidato {
  id: string;
  nome: string;
  email: string;
  vagaId: string;
  etapa: CandidatoEtapa;
  scoreIa: number; // 0-100
  linkedin?: string;
  resumoIa: string;
  skills: string[];
  experienciaAnos: number;
  pretensaoSalarial: number;
  disponibilidade: string;
  createdAt: string; // ISO
}

export type VagaNivel = 'junior' | 'pleno' | 'senior' | 'lead';
export type VagaModalidade = 'presencial' | 'hibrido' | 'remoto';
export type VagaStatus = 'aberta' | 'pausada' | 'fechada';

export interface Vaga {
  id: string;
  titulo: string;
  departamento: string;
  nivel: VagaNivel;
  modalidade: VagaModalidade;
  status: VagaStatus;
  candidatosCount: number;
  diasAberta: number;
  salarioMin: number;
  salarioMax: number;
}

export type PontoStatus =
  | 'ok'
  | 'atraso'
  | 'falta'
  | 'hora_extra'
  | 'justificado';

export interface PontoRegistro {
  id: string;
  colaboradorId: string;
  data: string; // ISO date (YYYY-MM-DD)
  entrada: string; // HH:mm
  saidaAlmoco: string;
  voltaAlmoco: string;
  saida: string;
  horasTrabalhadas: number;
  status: PontoStatus;
}

export interface BancoHoras {
  colaboradorId: string;
  saldoMinutos: number;
  ultimaAtualizacao: string; // ISO
}

export type FeriasStatus =
  | 'pendente'
  | 'aprovada'
  | 'rejeitada'
  | 'em_andamento'
  | 'concluida';

export interface SolicitacaoFerias {
  id: string;
  colaboradorId: string;
  dataInicio: string; // ISO date
  dataFim: string; // ISO date
  diasUteis: number;
  status: FeriasStatus;
  motivoRejeicao?: string;
  aprovadorId?: string;
  createdAt: string; // ISO
}

export type SentimentoAvaliacao = 'positivo' | 'neutro' | 'negativo';

export interface AvaliacaoDesempenho {
  id: string;
  colaboradorId: string;
  periodo: string; // ex "2026-Q1"
  notaGeral: number; // 0-5
  notaLideranca: number;
  notaTecnica: number;
  notaComportamental: number;
  feedbackIa: string;
  sentimento: SentimentoAvaliacao;
  comentariosPares: string[];
  objetivosAtingidos: number;
  objetivosTotais: number;
}

export interface FolhaItem {
  colaboradorId: string;
  bruto: number;
  liquido: number;
  inss: number;
  irrf: number;
  fgts: number;
  beneficios: number;
}

export interface FolhaPagamento {
  mes: string; // YYYY-MM
  totalBruto: number;
  totalLiquido: number;
  totalDescontos: number;
  totalEncargos: number;
  colaboradores: number;
  itens: FolhaItem[];
}

export type KpiTrend = 'up' | 'down' | 'stable';

export interface RhKpi {
  label: string;
  valor: number;
  delta: number;
  trend: KpiTrend;
  sparkline: number[];
}
