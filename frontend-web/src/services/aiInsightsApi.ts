/**
 * aiInsightsApi — insights "gerados por IA" com templates mock.
 * Usado pelo AdminDashboard e Portal RH. Sem chamadas externas.
 */

export type AiInsightType =
  | 'oportunidade'
  | 'alerta'
  | 'anomalia'
  | 'tendencia'
  | 'recomendacao';

export type AiInsightImpacto = 'alto' | 'medio' | 'baixo';

export interface AiInsight {
  id: string;
  type: AiInsightType;
  titulo: string;
  descricao: string;
  impacto: AiInsightImpacto;
  acaoSugerida?: string;
  metricaRelacionada?: string;
  confianca: number; // 0-1
  timestamp: string; // ISO
}

function delay<T>(value: T): Promise<T> {
  const ms = 200 + Math.random() * 400;
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

const NOW = '2026-04-08T09:00:00-03:00';

const ADMIN_INSIGHTS: AiInsight[] = [
  {
    id: 'ai-adm-001',
    type: 'oportunidade',
    titulo: 'Pico de cadastros sexta à noite',
    descricao:
      'Sextas-feiras entre 19h e 22h concentram 23% dos cadastros semanais — maior pico histórico.',
    impacto: 'alto',
    acaoSugerida:
      'Programar campanha paga de mídia social nesse horário com foco em capitais.',
    metricaRelacionada: 'Cadastros/hora',
    confianca: 0.91,
    timestamp: NOW,
  },
  {
    id: 'ai-adm-002',
    type: 'anomalia',
    titulo: 'Cancelamentos anômalos em SP',
    descricao:
      'Em 02/04, cancelamentos subiram 38% acima da média móvel de 14 dias na região metropolitana de SP.',
    impacto: 'alto',
    acaoSugerida:
      'Investigar fila de regulação e integração com SUS Digital SP.',
    metricaRelacionada: 'Taxa de cancelamento',
    confianca: 0.87,
    timestamp: NOW,
  },
  {
    id: 'ai-adm-003',
    type: 'tendencia',
    titulo: 'Crescimento sustentado em pacientes 60+',
    descricao:
      'Faixa 60-74 cresceu 14% no trimestre — 3º período consecutivo de alta.',
    impacto: 'medio',
    acaoSugerida:
      'Reforçar acessibilidade e tutoriais em vídeo no onboarding sênior.',
    metricaRelacionada: 'Pacientes por faixa etária',
    confianca: 0.82,
    timestamp: NOW,
  },
  {
    id: 'ai-adm-004',
    type: 'alerta',
    titulo: 'Tempo médio de consulta em alta',
    descricao:
      'Cardiologia passou de 19min para 24min em 10 dias — possível gargalo na anamnese digital.',
    impacto: 'medio',
    acaoSugerida:
      'Revisar template de prontuário e habilitar sugestões IA inline.',
    metricaRelacionada: 'Duração consulta (Cardio)',
    confianca: 0.78,
    timestamp: NOW,
  },
  {
    id: 'ai-adm-005',
    type: 'recomendacao',
    titulo: 'Expandir capacidade no Nordeste',
    descricao:
      'BA, PE e CE concentram 16% da demanda mas apenas 9% dos médicos ativos.',
    impacto: 'alto',
    acaoSugerida: 'Abrir 12 vagas regionais e campanha de recrutamento focal.',
    metricaRelacionada: 'Razão demanda/oferta',
    confianca: 0.84,
    timestamp: NOW,
  },
  {
    id: 'ai-adm-006',
    type: 'oportunidade',
    titulo: 'Conversão mobile 2x maior',
    descricao:
      'Fluxo de cadastro mobile converte 62% vs 31% do web — priorizar mobile-first.',
    impacto: 'alto',
    metricaRelacionada: 'Funil de cadastro',
    confianca: 0.93,
    timestamp: NOW,
  },
  {
    id: 'ai-adm-007',
    type: 'tendencia',
    titulo: 'NPS em alta com pacientes recorrentes',
    descricao:
      'Pacientes com 3+ consultas têm NPS 88 vs 74 dos novos — fidelização funciona.',
    impacto: 'medio',
    confianca: 0.8,
    timestamp: NOW,
  },
];

const RH_INSIGHTS: AiInsight[] = [
  {
    id: 'ai-rh-001',
    type: 'alerta',
    titulo: 'Departamento Tecnologia perdendo talentos',
    descricao:
      'Tecnologia teve 3 demissões em 60 dias — turnover local 18% vs meta 9%.',
    impacto: 'alto',
    acaoSugerida:
      'Aplicar pesquisa de clima e revisar bandas salariais do squad.',
    metricaRelacionada: 'Turnover por área',
    confianca: 0.89,
    timestamp: NOW,
  },
  {
    id: 'ai-rh-002',
    type: 'tendencia',
    titulo: 'Turnover projetado acima da meta',
    descricao:
      'Modelo prevê turnover 12% em Q2/2026 — 3pp acima da meta anual.',
    impacto: 'alto',
    acaoSugerida:
      'Acionar plano de retenção antecipado com foco em cargos críticos.',
    metricaRelacionada: 'Turnover %',
    confianca: 0.81,
    timestamp: NOW,
  },
  {
    id: 'ai-rh-003',
    type: 'alerta',
    titulo: 'Concentração de férias em dezembro',
    descricao:
      '78% das solicitações de férias de 2026 apontam para dezembro — risco operacional.',
    impacto: 'medio',
    acaoSugerida:
      'Implementar política de escalonamento com bônus para férias fora de pico.',
    metricaRelacionada: 'Distribuição de férias',
    confianca: 0.95,
    timestamp: NOW,
  },
  {
    id: 'ai-rh-004',
    type: 'oportunidade',
    titulo: 'Candidatos de alta performance em espera',
    descricao:
      '7 candidatos com score IA ≥ 85 estão há mais de 14 dias sem movimentação.',
    impacto: 'medio',
    acaoSugerida: 'Priorizar contato e agendar entrevistas ainda esta semana.',
    metricaRelacionada: 'Pipeline de recrutamento',
    confianca: 0.86,
    timestamp: NOW,
  },
  {
    id: 'ai-rh-005',
    type: 'anomalia',
    titulo: 'Ausenteísmo fora do padrão em Operações',
    descricao: 'Faltas na área de Operações subiram 42% vs média trimestral.',
    impacto: 'medio',
    acaoSugerida:
      'Agendar conversa 1:1 com líderes de turno e revisar escalas.',
    metricaRelacionada: 'Ausenteísmo %',
    confianca: 0.79,
    timestamp: NOW,
  },
  {
    id: 'ai-rh-006',
    type: 'recomendacao',
    titulo: 'Programa de mentoria com impacto no NPS',
    descricao: 'Colaboradores com mentor têm NPS interno 87 vs 68 sem mentor.',
    impacto: 'medio',
    acaoSugerida: 'Expandir programa de mentoria para 100% dos juniores.',
    metricaRelacionada: 'NPS Interno',
    confianca: 0.83,
    timestamp: NOW,
  },
  {
    id: 'ai-rh-007',
    type: 'tendencia',
    titulo: 'Avaliações de liderança melhorando',
    descricao: 'Nota média de liderança subiu de 3.6 para 4.1 em 2 trimestres.',
    impacto: 'baixo',
    confianca: 0.77,
    timestamp: NOW,
  },
  {
    id: 'ai-rh-008',
    type: 'alerta',
    titulo: 'Horas extras concentradas em 5 colaboradores',
    descricao:
      '5 colaboradores respondem por 61% das horas extras do mês — risco de burnout.',
    impacto: 'alto',
    acaoSugerida: 'Redistribuir demanda e conversar com gestores diretos.',
    metricaRelacionada: 'Banco de horas',
    confianca: 0.9,
    timestamp: NOW,
  },
];

export function getAdminInsights(): Promise<AiInsight[]> {
  return delay(ADMIN_INSIGHTS);
}

export function getRhInsights(): Promise<AiInsight[]> {
  return delay(RH_INSIGHTS);
}
