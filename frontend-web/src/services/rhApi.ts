/**
 * rhApi — camada de serviço do Portal RH.
 * Backend .NET ainda não expõe esses endpoints, então esta
 * implementação opera sobre dados mock em memória com latência
 * artificial determinística, permitindo que a UI rode standalone.
 */

import {
  seedAvaliacoes,
  seedCandidatos,
  seedColaboradores,
  seedDepartamentos,
  seedFerias,
  seedFolhas,
  seedPontos,
  seedVagas,
} from '@/data/rhMockData';
import type {
  AvaliacaoDesempenho,
  BancoHoras,
  Candidato,
  CandidatoEtapa,
  Colaborador,
  ColaboradorStatus,
  Departamento,
  FeriasStatus,
  FolhaPagamento,
  PontoRegistro,
  RhKpi,
  SolicitacaoFerias,
  Vaga,
  VagaStatus,
} from '@/types/rh';

// Estado mutável em memória (clone dos seeds para permitir CRUD).
let colaboradoresStore: Colaborador[] | null = null;
let candidatosStore: Candidato[] | null = null;
let feriasStore: SolicitacaoFerias[] | null = null;

function ensureColaboradores(): Colaborador[] {
  if (!colaboradoresStore) colaboradoresStore = [...seedColaboradores()];
  return colaboradoresStore;
}
function ensureCandidatos(): Candidato[] {
  if (!candidatosStore) candidatosStore = [...seedCandidatos()];
  return candidatosStore;
}
function ensureFerias(): SolicitacaoFerias[] {
  if (!feriasStore) feriasStore = [...seedFerias()];
  return feriasStore;
}

function delay<T>(value: T): Promise<T> {
  const ms = 200 + Math.random() * 400;
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export interface ListColaboradoresParams {
  search?: string;
  departamento?: string;
  status?: ColaboradorStatus;
  page?: number;
  pageSize?: number;
}

export function listColaboradores(
  params: ListColaboradoresParams = {}
): Promise<{ items: Colaborador[]; totalCount: number }> {
  const { search, departamento, status, page = 1, pageSize = 20 } = params;
  let items = ensureColaboradores();
  if (search) {
    const q = search.toLowerCase();
    items = items.filter(
      (c) =>
        c.nome.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.cargo.toLowerCase().includes(q)
    );
  }
  if (departamento)
    items = items.filter((c) => c.departamento === departamento);
  if (status) items = items.filter((c) => c.status === status);
  const totalCount = items.length;
  const start = (page - 1) * pageSize;
  const paged = items.slice(start, start + pageSize);
  return delay({ items: paged, totalCount });
}

export function getColaborador(id: string): Promise<Colaborador> {
  const found = ensureColaboradores().find((c) => c.id === id);
  if (!found)
    return Promise.reject(new Error(`Colaborador ${id} não encontrado`));
  return delay(found);
}

export function createColaborador(
  data: Omit<Colaborador, 'id'>
): Promise<Colaborador> {
  const store = ensureColaboradores();
  const novo: Colaborador = {
    ...data,
    id: `col-${String(store.length + 1).padStart(3, '0')}`,
  };
  store.unshift(novo);
  return delay(novo);
}

export function updateColaborador(
  id: string,
  data: Partial<Colaborador>
): Promise<Colaborador> {
  const store = ensureColaboradores();
  const idx = store.findIndex((c) => c.id === id);
  if (idx === -1)
    return Promise.reject(new Error(`Colaborador ${id} não encontrado`));
  const updated = { ...store[idx]!, ...data, id };
  store[idx] = updated;
  return delay(updated);
}

export function deleteColaborador(id: string): Promise<void> {
  const store = ensureColaboradores();
  const idx = store.findIndex((c) => c.id === id);
  if (idx === -1)
    return Promise.reject(new Error(`Colaborador ${id} não encontrado`));
  store.splice(idx, 1);
  return delay(undefined);
}

export function listDepartamentos(): Promise<Departamento[]> {
  return delay(seedDepartamentos());
}

export interface ListVagasParams {
  status?: VagaStatus;
  departamento?: string;
}

export function listVagas(params: ListVagasParams = {}): Promise<Vaga[]> {
  let vagas = seedVagas();
  if (params.status) vagas = vagas.filter((v) => v.status === params.status);
  if (params.departamento)
    vagas = vagas.filter((v) => v.departamento === params.departamento);
  return delay(vagas);
}

export function listCandidatos(vagaId?: string): Promise<Candidato[]> {
  const all = ensureCandidatos();
  return delay(vagaId ? all.filter((c) => c.vagaId === vagaId) : all);
}

export function moverCandidatoEtapa(
  id: string,
  etapa: CandidatoEtapa
): Promise<Candidato> {
  const store = ensureCandidatos();
  const idx = store.findIndex((c) => c.id === id);
  if (idx === -1)
    return Promise.reject(new Error(`Candidato ${id} não encontrado`));
  const updated = { ...store[idx]!, etapa };
  store[idx] = updated;
  return delay(updated);
}

export function listPontos(
  colaboradorId?: string,
  periodo?: string
): Promise<PontoRegistro[]> {
  let items = seedPontos();
  if (colaboradorId)
    items = items.filter((p) => p.colaboradorId === colaboradorId);
  if (periodo) items = items.filter((p) => p.data.startsWith(periodo));
  return delay(items);
}

export function getBancoHoras(colaboradorId: string): Promise<BancoHoras> {
  const pontos = seedPontos().filter((p) => p.colaboradorId === colaboradorId);
  const saldoHoras = pontos.reduce((acc, p) => {
    if (p.status === 'hora_extra') return acc + (p.horasTrabalhadas - 8);
    if (p.status === 'falta') return acc - 8;
    if (p.status === 'atraso') return acc - 0.25;
    return acc;
  }, 0);
  return delay({
    colaboradorId,
    saldoMinutos: Math.round(saldoHoras * 60),
    ultimaAtualizacao: new Date().toISOString(),
  });
}

export function listFerias(
  status?: FeriasStatus
): Promise<SolicitacaoFerias[]> {
  const all = ensureFerias();
  return delay(status ? all.filter((f) => f.status === status) : all);
}

export function aprovarFerias(id: string): Promise<SolicitacaoFerias> {
  const store = ensureFerias();
  const idx = store.findIndex((f) => f.id === id);
  if (idx === -1)
    return Promise.reject(new Error(`Solicitação ${id} não encontrada`));
  const updated: SolicitacaoFerias = {
    ...store[idx]!,
    status: 'aprovada',
    aprovadorId: 'col-001',
  };
  store[idx] = updated;
  return delay(updated);
}

export function rejeitarFerias(
  id: string,
  motivo: string
): Promise<SolicitacaoFerias> {
  const store = ensureFerias();
  const idx = store.findIndex((f) => f.id === id);
  if (idx === -1)
    return Promise.reject(new Error(`Solicitação ${id} não encontrada`));
  const updated: SolicitacaoFerias = {
    ...store[idx]!,
    status: 'rejeitada',
    motivoRejeicao: motivo,
    aprovadorId: 'col-001',
  };
  store[idx] = updated;
  return delay(updated);
}

export function listAvaliacoes(
  colaboradorId?: string
): Promise<AvaliacaoDesempenho[]> {
  const all = seedAvaliacoes();
  return delay(
    colaboradorId ? all.filter((a) => a.colaboradorId === colaboradorId) : all
  );
}

export function getFolha(mes: string): Promise<FolhaPagamento> {
  const folha = seedFolhas().find((f) => f.mes === mes) ?? seedFolhas()[0]!;
  return delay(folha);
}

export function getRhKpis(): Promise<RhKpi[]> {
  const cols = seedColaboradores();
  const ativos = cols.filter((c) => c.status !== 'desligado').length;
  const desligados = cols.filter((c) => c.status === 'desligado').length;
  const turnover = Math.round((desligados / cols.length) * 1000) / 10;
  const folha = seedFolhas()[0]!;
  const vagasAbertas = seedVagas().filter((v) => v.status === 'aberta').length;
  const pontos = seedPontos();
  const faltas = pontos.filter((p) => p.status === 'falta').length;
  const ausenteismo = Math.round((faltas / pontos.length) * 1000) / 10;
  const horasExtras = pontos.filter((p) => p.status === 'hora_extra').length;

  const spark = (base: number, amp: number): number[] =>
    Array.from({ length: 12 }, (_, i) =>
      Math.round(base + Math.sin(i / 2) * amp)
    );

  const kpis: RhKpi[] = [
    {
      label: 'Headcount Total',
      valor: ativos,
      delta: 2.3,
      trend: 'up',
      sparkline: spark(ativos, 3),
    },
    {
      label: 'Turnover %',
      valor: turnover,
      delta: -0.8,
      trend: 'down',
      sparkline: spark(turnover, 1),
    },
    {
      label: 'Custo Folha',
      valor: folha.totalBruto,
      delta: 1.5,
      trend: 'up',
      sparkline: spark(folha.totalBruto / 1000, 20),
    },
    {
      label: 'Contratações 30d',
      valor: 7,
      delta: 40,
      trend: 'up',
      sparkline: spark(6, 2),
    },
    {
      label: 'Ausenteísmo %',
      valor: ausenteismo,
      delta: 0.4,
      trend: 'up',
      sparkline: spark(ausenteismo, 0.8),
    },
    {
      label: 'Horas Extras',
      valor: horasExtras,
      delta: -5,
      trend: 'down',
      sparkline: spark(horasExtras, 5),
    },
    {
      label: 'Vagas Abertas',
      valor: vagasAbertas,
      delta: 0,
      trend: 'stable',
      sparkline: spark(vagasAbertas, 1),
    },
    {
      label: 'NPS Interno',
      valor: 72,
      delta: 3,
      trend: 'up',
      sparkline: spark(70, 4),
    },
  ];
  return delay(kpis);
}
