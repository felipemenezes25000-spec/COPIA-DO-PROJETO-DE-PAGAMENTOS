import { apiClient } from '../api-client';
import type {
  UnidadeSaudeDto, CidadaoDto, ProfissionalSusDto,
  AgendaUbsDto, AtendimentoApsDto, RelatorioProducaoDto, ExportacaoSusDto,
} from '../../types/sus';

// ── Unidades de Saúde ────────────────────────────────────────
export const fetchUnidades = () =>
  apiClient.get<UnidadeSaudeDto[]>('/api/sus/unidades');

export const fetchUnidade = (id: string) =>
  apiClient.get<UnidadeSaudeDto>(`/api/sus/unidades/${id}`);

export const createUnidade = (data: Partial<UnidadeSaudeDto>) =>
  apiClient.post<UnidadeSaudeDto>('/api/sus/unidades', data);

// ── Cidadãos ─────────────────────────────────────────────────
export const fetchCidadaos = (search?: string, unidadeId?: string) => {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (unidadeId) params.set('unidadeId', unidadeId);
  const qs = params.toString();
  return apiClient.get<CidadaoDto[]>(`/api/sus/cidadaos${qs ? `?${qs}` : ''}`);
};

export const fetchCidadao = (id: string) =>
  apiClient.get<CidadaoDto>(`/api/sus/cidadaos/${id}`);

export const createCidadao = (data: Partial<CidadaoDto>) =>
  apiClient.post<CidadaoDto>('/api/sus/cidadaos', data);

export const updateCidadao = (id: string, data: Partial<CidadaoDto>) =>
  apiClient.put<CidadaoDto>(`/api/sus/cidadaos/${id}`, data);

export const searchCidadaoByCpf = (cpf: string) =>
  apiClient.get<CidadaoDto | null>(`/api/sus/cidadaos/cpf/${cpf}`);

// ── Profissionais ────────────────────────────────────────────
export const fetchProfissionais = (unidadeId?: string) => {
  const qs = unidadeId ? `?unidadeId=${unidadeId}` : '';
  return apiClient.get<ProfissionalSusDto[]>(`/api/sus/profissionais${qs}`);
};

export const createProfissional = (data: Partial<ProfissionalSusDto>) =>
  apiClient.post<ProfissionalSusDto>('/api/sus/profissionais', data);

// ── Agenda ───────────────────────────────────────────────────
export const fetchAgendaDia = (unidadeId: string, data: string) =>
  apiClient.get<AgendaUbsDto[]>(`/api/sus/agenda?unidadeId=${unidadeId}&data=${data}`);

export const createAgenda = (data: {
  cidadaoId: string; profissionalId: string; unidadeSaudeId: string;
  dataHora: string; tipoAtendimento?: string; observacoes?: string;
}) =>
  apiClient.post<AgendaUbsDto>('/api/sus/agenda', data);

export const agendaCheckIn = (id: string) =>
  apiClient.post<AgendaUbsDto>(`/api/sus/agenda/${id}/checkin`);

export const agendaChamar = (id: string) =>
  apiClient.post<AgendaUbsDto>(`/api/sus/agenda/${id}/chamar`);

export const agendaIniciar = (id: string) =>
  apiClient.post<AgendaUbsDto>(`/api/sus/agenda/${id}/iniciar`);

export const agendaFinalizar = (id: string) =>
  apiClient.post<AgendaUbsDto>(`/api/sus/agenda/${id}/finalizar`);

// ── Atendimentos ─────────────────────────────────────────────
export const fetchAtendimentos = (unidadeId: string, dataInicio?: string, dataFim?: string) => {
  const params = new URLSearchParams({ unidadeId });
  if (dataInicio) params.set('dataInicio', dataInicio);
  if (dataFim) params.set('dataFim', dataFim);
  return apiClient.get<AtendimentoApsDto[]>(`/api/sus/atendimentos?${params}`);
};

export const fetchAtendimento = (id: string) =>
  apiClient.get<AtendimentoApsDto>(`/api/sus/atendimentos/${id}`);

export const createAtendimento = (data: Record<string, unknown>) =>
  apiClient.post<AtendimentoApsDto>('/api/sus/atendimentos', data);

export const fetchAtendimentosCidadao = (cidadaoId: string) =>
  apiClient.get<AtendimentoApsDto[]>(`/api/sus/atendimentos/cidadao/${cidadaoId}`);

// ── Relatórios ───────────────────────────────────────────────
export const fetchRelatorioProducao = (unidadeId?: string, dataInicio?: string, dataFim?: string) => {
  const params = new URLSearchParams();
  if (unidadeId) params.set('unidadeId', unidadeId);
  if (dataInicio) params.set('dataInicio', dataInicio);
  if (dataFim) params.set('dataFim', dataFim);
  return apiClient.get<RelatorioProducaoDto>(`/api/sus/relatorios/producao?${params}`);
};

// ── Exportação e-SUS ─────────────────────────────────────────
export const fetchExportacaoStatus = () =>
  apiClient.get<ExportacaoSusDto>('/api/sus/exportacao/status');

export const executarExportacao = () =>
  apiClient.post<{ exportados: number; erros: number; mensagens?: string[] }>('/api/sus/exportacao/executar');
