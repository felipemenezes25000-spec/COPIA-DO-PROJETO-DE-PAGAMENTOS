/**
 * adminAnalyticsApi — mocks determinísticos para o AdminDashboard turbinado.
 * Sem chamadas de rede reais; dados em memória com latência artificial.
 */

import type { KpiTrend } from '@/types/rh';

function delay<T>(value: T): Promise<T> {
  const ms = 200 + Math.random() * 400;
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

// PRNG determinístico por chamada — mesma seed -> mesma saída
function makeRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface DashboardKpi {
  label: string;
  value: number;
  delta: number;
  trend: KpiTrend;
  sparkline: number[];
}

export interface DashboardSummary {
  kpis: DashboardKpi[];
  consultasUltimos30Dias: number[];
  topEstados: Array<{ uf: string; count: number; pct: number }>;
  faixaEtaria: Array<{ faixa: string; count: number }>;
  generoSplit: { m: number; f: number; outros: number };
  funilCadastro: Array<{ etapa: string; count: number }>;
}

export function getDashboardSummary(): Promise<DashboardSummary> {
  const rng = makeRng(424242);

  const sparkline = (base: number, amp: number): number[] =>
    Array.from({ length: 14 }, (_, i) =>
      Math.round(base + Math.sin(i / 2) * amp + (rng() - 0.5) * amp * 0.4)
    );

  const kpis: DashboardKpi[] = [
    {
      label: 'Consultas Totais',
      value: 18_432,
      delta: 12.4,
      trend: 'up',
      sparkline: sparkline(600, 60),
    },
    {
      label: 'Pacientes Ativos',
      value: 42_188,
      delta: 4.1,
      trend: 'up',
      sparkline: sparkline(1400, 80),
    },
    {
      label: 'Médicos Verificados',
      value: 1_246,
      delta: 2.8,
      trend: 'up',
      sparkline: sparkline(40, 4),
    },
    {
      label: 'Tempo Médio Consulta',
      value: 18.4,
      delta: -3.2,
      trend: 'down',
      sparkline: sparkline(19, 1.5),
    },
    {
      label: 'NPS Pacientes',
      value: 81,
      delta: 1.9,
      trend: 'up',
      sparkline: sparkline(80, 2),
    },
    {
      label: 'Cancelamentos %',
      value: 4.7,
      delta: -0.6,
      trend: 'down',
      sparkline: sparkline(5, 0.5),
    },
  ];

  const consultasUltimos30Dias = Array.from({ length: 30 }, (_, i) =>
    Math.round(550 + Math.sin(i / 3) * 120 + rng() * 80)
  );

  const topEstados = [
    { uf: 'SP', count: 6_420 },
    { uf: 'RJ', count: 3_180 },
    { uf: 'MG', count: 2_140 },
    { uf: 'BA', count: 1_460 },
    { uf: 'RS', count: 1_380 },
    { uf: 'PR', count: 1_220 },
    { uf: 'PE', count: 980 },
    { uf: 'CE', count: 790 },
  ];
  const totalEstados = topEstados.reduce((s, e) => s + e.count, 0);
  const topEstadosComPct = topEstados.map((e) => ({
    ...e,
    pct: Math.round((e.count / totalEstados) * 1000) / 10,
  }));

  const faixaEtaria = [
    { faixa: '0-17', count: 2_140 },
    { faixa: '18-29', count: 9_860 },
    { faixa: '30-44', count: 14_320 },
    { faixa: '45-59', count: 9_180 },
    { faixa: '60-74', count: 5_140 },
    { faixa: '75+', count: 1_548 },
  ];

  const generoSplit = { m: 19_820, f: 21_440, outros: 928 };

  const funilCadastro = [
    { etapa: 'Landing', count: 120_000 },
    { etapa: 'Cadastro Iniciado', count: 68_400 },
    { etapa: 'Documentos Enviados', count: 49_200 },
    { etapa: 'Verificação OK', count: 42_188 },
    { etapa: 'Primeira Consulta', count: 31_740 },
  ];

  return delay({
    kpis,
    consultasUltimos30Dias,
    topEstados: topEstadosComPct,
    faixaEtaria,
    generoSplit,
    funilCadastro,
  });
}

export interface HeatmapCell {
  dia: number; // 0-6
  hora: number; // 0-23
  intensidade: number; // 0-1
}

export function getHeatmapAtividade(): Promise<HeatmapCell[]> {
  const rng = makeRng(17171717);
  const cells: HeatmapCell[] = [];
  for (let d = 0; d < 7; d++) {
    for (let h = 0; h < 24; h++) {
      // Pico em dias úteis entre 8h-20h
      const isWeekend = d === 0 || d === 6;
      const horaFator = Math.max(0, Math.sin(((h - 8) / 12) * Math.PI));
      const base = isWeekend ? horaFator * 0.35 : horaFator * 0.9;
      const jitter = (rng() - 0.5) * 0.2;
      const intensidade = Math.max(
        0,
        Math.min(1, Math.round((base + jitter) * 100) / 100)
      );
      cells.push({ dia: d, hora: h, intensidade });
    }
  }
  return delay(cells);
}

export type AnomaliaSeveridade = 'baixa' | 'media' | 'alta';

export interface Anomalia {
  data: string;
  metrica: string;
  severidade: AnomaliaSeveridade;
  descricao: string;
}

export interface PredicoesIa {
  forecastConsultas30d: number[];
  confidence: number;
  anomalias: Anomalia[];
}

export function getPredicoesIa(): Promise<PredicoesIa> {
  const rng = makeRng(999);
  const forecastConsultas30d = Array.from({ length: 30 }, (_, i) =>
    Math.round(620 + i * 4 + Math.sin(i / 3) * 90 + (rng() - 0.5) * 40)
  );
  const anomalias: Anomalia[] = [
    {
      data: '2026-04-02',
      metrica: 'Cancelamentos',
      severidade: 'alta',
      descricao:
        'Cancelamentos 38% acima da média em SP — investigar fila de regulação.',
    },
    {
      data: '2026-04-04',
      metrica: 'Tempo de Consulta',
      severidade: 'media',
      descricao: 'Duração média subiu para 24min na especialidade Cardiologia.',
    },
    {
      data: '2026-04-05',
      metrica: 'Cadastros',
      severidade: 'baixa',
      descricao:
        'Leve queda de cadastros mobile no iOS — possível bug de onboarding.',
    },
    {
      data: '2026-04-06',
      metrica: 'NPS',
      severidade: 'media',
      descricao:
        'NPS caiu 4 pontos entre pacientes 60+ — revisar acessibilidade.',
    },
  ];
  return delay({ forecastConsultas30d, confidence: 0.86, anomalias });
}
