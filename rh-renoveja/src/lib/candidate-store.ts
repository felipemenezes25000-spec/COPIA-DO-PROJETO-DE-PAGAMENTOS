/**
 * localStorage-based persistence for candidates.
 * Bridges the public form (/cadastro) with the admin panel (/admin).
 * When a real backend exists, replace this module with API calls.
 */

import type { AdminCandidate, AdminNote, AIAnalysisResult, CandidateStatus } from '../types/admin';
import type { CandidateFormData, ProfessionalCategory } from '../types';

const STORAGE_KEY = 'rh_candidates';
const NOTES_KEY = 'rh_candidate_notes';
const AI_ANALYSIS_KEY = 'rh_candidate_ai_analysis';

/* ------------------------------------------------------------------ */
/* Read / Write helpers                                                */
/* ------------------------------------------------------------------ */

function readCandidates(): AdminCandidate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeCandidates(candidates: AdminCandidate[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(candidates));
}

function readNotes(): Record<string, AdminNote[]> {
  try {
    const raw = localStorage.getItem(NOTES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeNotes(notes: Record<string, AdminNote[]>): void {
  localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
}

function readAIAnalyses(): Record<string, AIAnalysisResult> {
  try {
    const raw = localStorage.getItem(AI_ANALYSIS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeAIAnalyses(analyses: Record<string, AIAnalysisResult>): void {
  localStorage.setItem(AI_ANALYSIS_KEY, JSON.stringify(analyses));
}

/* ------------------------------------------------------------------ */
/* Seed mock data (generated once on first load)                       */
/* ------------------------------------------------------------------ */

const MOCK_SEEDED_KEY = 'rh_mock_seeded';

const NOMES = [
  'Ana Carolina Silva', 'Pedro Henrique Santos', 'Maria Eduarda Oliveira',
  'João Victor Souza', 'Juliana Fernandes Costa', 'Lucas Gabriel Lima',
  'Camila Rodrigues Pereira', 'Rafael Almeida Nascimento', 'Fernanda Barros Araújo',
  'Bruno Carvalho Ribeiro', 'Larissa Mendes Gomes', 'Diego Martins Rocha',
  'Patrícia Teixeira Dias', 'Thiago Correia Batista', 'Amanda Vieira Nunes',
  'Gustavo Lopes Cardoso', 'Beatriz Moreira Freitas', 'Carlos Eduardo Ramos',
  'Daniela Barbosa Monteiro', 'Marcos Paulo Ferreira',
];

const CIDADES = [
  { cidade: 'São Paulo', estado: 'SP' },
  { cidade: 'Rio de Janeiro', estado: 'RJ' },
  { cidade: 'Belo Horizonte', estado: 'MG' },
  { cidade: 'Salvador', estado: 'BA' },
  { cidade: 'Curitiba', estado: 'PR' },
  { cidade: 'Fortaleza', estado: 'CE' },
  { cidade: 'Brasília', estado: 'DF' },
  { cidade: 'Recife', estado: 'PE' },
  { cidade: 'Porto Alegre', estado: 'RS' },
  { cidade: 'Manaus', estado: 'AM' },
];

// Pool de especialidades para o gerador de mocks. Não precisa ser exaustivo
// (o dropdown real usa `getSpecialtiesByCategory` de constants.ts) — aqui só
// queremos um sample representativo para popular a tela de admin em dev.
const ESPECIALIDADES: Record<ProfessionalCategory, string[]> = {
  medico: ['Clínica Médica', 'Cardiologia', 'Dermatologia', 'Pediatria', 'Psiquiatria', 'Endocrinologia e Metabologia', 'Neurologia'],
  enfermeiro: ['Enfermagem em Pós-Consulta / Follow-up', 'Enfermagem em Saúde da Família', 'Enfermagem em Urgência e Emergência', 'Enfermagem em Home Care / Atenção Domiciliar', 'Enfermagem Gerontológica'],
  dentista: ['Ortodontia', 'Endodontia', 'Implantodontia', 'Periodontia', 'Odontopediatria', 'Cirurgia Bucomaxilofacial', 'Dentística Restauradora'],
  psicologo: ['Psicologia Clínica', 'Terapia Cognitivo-Comportamental', 'Neuropsicologia', 'Psicologia da Saúde'],
  nutricionista: ['Nutrição Clínica', 'Nutrição Esportiva', 'Nutrição Funcional', 'Nutrição Comportamental'],
  fisioterapeuta: ['Fisioterapia Traumato-Ortopédica', 'Fisioterapia Neurofuncional', 'Fisioterapia Respiratória', 'Fisioterapia Esportiva', 'Fisioterapia Pediátrica e Neonatal', 'Fisioterapia em Saúde da Mulher', 'Fisioterapia em Terapia Intensiva (UTI)'],
  fonoaudiologo: ['Voz', 'Linguagem', 'Motricidade Orofacial', 'Audiologia', 'Disfagia', 'Fonoaudiologia Neonatal', 'Fluência (Gagueira)'],
  terapeuta_ocupacional: ['Saúde Mental', 'Reabilitação Física', 'Terapia Ocupacional em TEA (Autismo)', 'Gerontologia', 'Neurofuncional', 'Reabilitação Cognitiva'],
  farmaceutico: ['Farmácia Clínica', 'Farmácia Hospitalar', 'Acompanhamento Farmacoterapêutico', 'Farmácia Oncológica', 'Farmácia Comunitária', 'Farmácia Magistral'],
  biomedico: ['Análises Clínicas', 'Biologia Molecular', 'Genética', 'Citologia', 'Imunologia', 'Microbiologia', 'Reprodução Humana Assistida'],
  educador_fisico: ['Treinamento Personalizado (Personal Trainer)', 'Atividade Física para Idosos', 'Reabilitação Cardiovascular', 'Musculação', 'Pilates', 'Atividade Física Adaptada'],
  assistente_social: ['Serviço Social em Saúde', 'Serviço Social Hospitalar', 'Serviço Social em Saúde Mental', 'Serviço Social com Famílias', 'Serviço Social em Cuidados Paliativos'],
};

// Mapeamento categoria → graduação textual usada no mock.
// Mantido como objeto para o TS pegar se alguém esquecer um valor novo.
const GRADUACAO_BY_CATEGORY: Record<ProfessionalCategory, string> = {
  medico: 'Medicina',
  enfermeiro: 'Enfermagem',
  dentista: 'Odontologia',
  psicologo: 'Psicologia',
  nutricionista: 'Nutrição',
  fisioterapeuta: 'Fisioterapia',
  fonoaudiologo: 'Fonoaudiologia',
  terapeuta_ocupacional: 'Terapia Ocupacional',
  farmaceutico: 'Farmácia',
  biomedico: 'Biomedicina',
  educador_fisico: 'Educação Física',
  assistente_social: 'Serviço Social',
};

// Mapeamento categoria → sigla do conselho — duplicado intencionalmente do
// COUNCIL_LABEL_MAP em constants.ts porque candidate-store.ts é um módulo
// mock standalone sem dependência dos constants do formulário. Trocar um
// lado sem trocar o outro não quebra nada (tipos batem), só diverge o label
// no mock. Se precisar sincronizar depois, pode importar de constants.ts.
const CONSELHO_LABEL: Record<ProfessionalCategory, string> = {
  medico: 'CRM',
  enfermeiro: 'COREN',
  dentista: 'CRO',
  psicologo: 'CRP',
  nutricionista: 'CRN',
  fisioterapeuta: 'CREFITO',
  fonoaudiologo: 'CRFa',
  terapeuta_ocupacional: 'CREFITO',
  farmaceutico: 'CRF',
  biomedico: 'CRBM',
  educador_fisico: 'CREF',
  assistente_social: 'CRESS',
};

const UNIVERSIDADES = [
  'USP', 'UNICAMP', 'UFRJ', 'UFMG', 'UnB', 'UFBA', 'UFRGS', 'UFPR', 'PUC-SP', 'PUC-RJ',
  'UNIFESP', 'Santa Casa SP', 'Faculdade Einstein', 'UFPE', 'UFC',
];

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomCPF(): string {
  const digits = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10));
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += digits[i] * (10 - i);
  let d1 = 11 - (sum % 11);
  if (d1 >= 10) d1 = 0;
  digits.push(d1);
  sum = 0;
  for (let i = 0; i < 10; i++) sum += digits[i] * (11 - i);
  let d2 = 11 - (sum % 11);
  if (d2 >= 10) d2 = 0;
  digits.push(d2);
  const s = digits.join('');
  return `${s.slice(0, 3)}.${s.slice(3, 6)}.${s.slice(6, 9)}-${s.slice(9)}`;
}

function randomPhone(): string {
  const ddd = [11, 21, 31, 41, 51, 61, 71, 81, 85, 92][Math.floor(Math.random() * 10)];
  const num = String(Math.floor(Math.random() * 900000000) + 100000000);
  return `(${ddd}) ${num.slice(0, 5)}-${num.slice(5)}`;
}

function randomDate(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - Math.floor(Math.random() * daysAgo));
  return d.toISOString();
}

function seedMockData(): void {
  if (localStorage.getItem(MOCK_SEEDED_KEY)) return;

  // Distribuição ponderada: as 5 categorias históricas (médico, enfermeiro,
  // dentista, psicólogo, nutricionista) têm peso 3, e as 7 novas
  // (fisio, fono, TO, farma, biomed, EF, serv. social) têm peso 1. Isso
  // reflete o volume real esperado nos primeiros meses pós-expansão e
  // garante que o mock mostre exemplos de todas as categorias sem inundar
  // a tela só com as novas.
  const categoriaWeights: ProfessionalCategory[] = [
    'medico', 'medico', 'medico',
    'enfermeiro', 'enfermeiro', 'enfermeiro',
    'dentista', 'dentista', 'dentista',
    'psicologo', 'psicologo', 'psicologo',
    'nutricionista', 'nutricionista', 'nutricionista',
    'fisioterapeuta',
    'fonoaudiologo',
    'terapeuta_ocupacional',
    'farmaceutico',
    'biomedico',
    'educador_fisico',
    'assistente_social',
  ];
  const experiencias = ['menos_1', '1_3', '3_5', '5_10', 'mais_10'] as const;
  const statusWeights: CandidateStatus[] = [
    'pendente', 'pendente', 'pendente', 'pendente',
    'em_analise', 'em_analise', 'em_analise',
    'entrevista', 'entrevista',
    'aprovado',
    'rejeitado',
  ];

  const candidates: AdminCandidate[] = [];

  // 40 candidatos (era 30) para aumentar a chance de ver pelo menos 1 de cada
  // das 7 novas categorias (cada uma tem probabilidade 1/22 ≈ 4.5% por
  // candidato, então 40 * 0.045 ≈ 1.8 — esperado 1-2 por categoria nova).
  for (let i = 0; i < 40; i++) {
    const cat = randomItem(categoriaWeights);
    const local = randomItem(CIDADES);
    const createdAt = randomDate(90);

    candidates.push({
      id: crypto.randomUUID(),
      protocolo: `RH-${(Date.now() - i * 100000).toString(36).toUpperCase()}`,
      status: randomItem(statusWeights),
      createdAt,
      updatedAt: createdAt,
      nome: randomItem(NOMES),
      cpf: randomCPF(),
      nascimento: `${1970 + Math.floor(Math.random() * 30)}-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`,
      email: `candidato${i + 1}@email.com`,
      telefone: randomPhone(),
      genero: randomItem(['masculino', 'feminino', 'nao_binario', 'prefiro_nao_informar'] as const),
      estado: local.estado,
      cidade: local.cidade,
      categoria: cat,
      conselho: `${CONSELHO_LABEL[cat]}/${local.estado} ${10000 + Math.floor(Math.random() * 90000)}`,
      ufRegistro: local.estado,
      especialidade: randomItem(ESPECIALIDADES[cat]),
      anosExperiencia: randomItem([...experiencias]),
      expTelemedicina: randomItem(['sim', 'nao']),
      sobre: 'Profissional dedicado(a) com experiência em atendimento remoto e presencial.',
      graduacao: GRADUACAO_BY_CATEGORY[cat],
      universidade: randomItem(UNIVERSIDADES),
      anoConclusao: 2005 + Math.floor(Math.random() * 18),
      posGraduacao: Math.random() > 0.4 ? 'Especialização em ' + randomItem(ESPECIALIDADES[cat]) : undefined,
      // Residência é praticamente exclusiva de médico (formação pós-grad de
      // 2-5 anos típica da medicina). Farmacêutico e biomédico também podem
      // ter residência em alguns programas (hospitalar/análises clínicas),
      // mas é raro — mantemos só médico para não poluir o mock.
      residencia: cat === 'medico' && Math.random() > 0.3 ? 'Residência em ' + randomItem(ESPECIALIDADES[cat]) : undefined,
      curriculoUrl: '#mock-cv',
      diplomaUrl: '#mock-diploma',
      notas: [],
    });
  }

  writeCandidates(candidates.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
  localStorage.setItem(MOCK_SEEDED_KEY, '1');
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

/** Initialize store — call once on app boot */
export function initCandidateStore(): void {
  seedMockData();
}

/** Save a new candidate from the public form */
export function saveCandidate(data: CandidateFormData): { id: string; protocolo: string } {
  const id = crypto.randomUUID();
  const protocolo = `RH-${Date.now().toString(36).toUpperCase()}`;
  const now = new Date().toISOString();

  const candidate: AdminCandidate = {
    id,
    protocolo,
    status: 'pendente',
    createdAt: now,
    updatedAt: now,
    nome: data.nome,
    cpf: data.cpf,
    nascimento: data.nascimento,
    email: data.email,
    telefone: data.telefone,
    genero: data.genero,
    estado: data.estado,
    cidade: data.cidade,
    categoria: data.categoria,
    conselho: `${CONSELHO_LABEL[data.categoria]}/${data.ufRegistro} ${data.conselho}`,
    ufRegistro: data.ufRegistro,
    especialidade: data.especialidade,
    anosExperiencia: data.anosExperiencia,
    expTelemedicina: data.expTelemedicina,
    sobre: data.sobre,
    graduacao: data.graduacao,
    universidade: data.universidade,
    anoConclusao: data.anoConclusao,
    posGraduacao: data.posGraduacao,
    residencia: data.residencia,
    notas: [],
  };

  const candidates = readCandidates();
  candidates.unshift(candidate);
  writeCandidates(candidates);

  return { id, protocolo };
}

/** Get all candidates, optionally filtered */
export function getCandidates(filters?: {
  status?: CandidateStatus;
  categoria?: ProfessionalCategory;
  search?: string;
}): AdminCandidate[] {
  let result = readCandidates();

  // Attach notes + AI analysis
  const notesMap = readNotes();
  const aiMap = readAIAnalyses();
  result = result.map((c) => ({
    ...c,
    notas: notesMap[c.id] ?? c.notas ?? [],
    aiAnalysis: aiMap[c.id] ?? c.aiAnalysis,
  }));

  if (filters?.status) {
    result = result.filter((c) => c.status === filters.status);
  }
  if (filters?.categoria) {
    result = result.filter((c) => c.categoria === filters.categoria);
  }
  if (filters?.search) {
    const q = filters.search.toLowerCase();
    result = result.filter(
      (c) =>
        c.nome.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.cpf.includes(q) ||
        c.protocolo.toLowerCase().includes(q),
    );
  }

  return result;
}

/** Get a single candidate by ID */
export function getCandidateById(id: string): AdminCandidate | null {
  const candidates = readCandidates();
  const candidate = candidates.find((c) => c.id === id);
  if (!candidate) return null;

  const notesMap = readNotes();
  const aiMap = readAIAnalyses();
  return {
    ...candidate,
    notas: notesMap[id] ?? candidate.notas ?? [],
    aiAnalysis: aiMap[id] ?? candidate.aiAnalysis,
  };
}

/** Update candidate status */
export function setCandidateStatus(id: string, status: CandidateStatus): AdminCandidate {
  const candidates = readCandidates();
  const idx = candidates.findIndex((c) => c.id === id);
  if (idx === -1) throw new Error('Candidato não encontrado');

  candidates[idx] = { ...candidates[idx], status, updatedAt: new Date().toISOString() };
  writeCandidates(candidates);

  const notesMap = readNotes();
  return { ...candidates[idx], notas: notesMap[id] ?? candidates[idx].notas ?? [] };
}

/** Add a note to a candidate */
export function addNote(id: string, texto: string): AdminNote {
  const candidates = readCandidates();
  if (!candidates.some((c) => c.id === id)) throw new Error('Candidato não encontrado');

  const note: AdminNote = {
    id: crypto.randomUUID(),
    autor: 'Administrador RH',
    texto,
    createdAt: new Date().toISOString(),
  };

  const notesMap = readNotes();
  notesMap[id] = [note, ...(notesMap[id] ?? [])];
  writeNotes(notesMap);

  return note;
}

/** Compute extended analytics */
export function getAnalytics() {
  const candidates = readCandidates();
  const stats = getStats();

  // Taxa de aprovação/rejeição
  const decided = stats.aprovados + stats.rejeitados;
  const taxaAprovacao = decided > 0 ? Math.round((stats.aprovados / decided) * 100) : 0;
  const taxaRejeicao = decided > 0 ? Math.round((stats.rejeitados / decided) * 100) : 0;

  // Média de idade
  const now = new Date();
  const ages = candidates
    .map((c) => {
      const birth = new Date(c.nascimento);
      return now.getFullYear() - birth.getFullYear();
    })
    .filter((a) => a > 0 && a < 100);
  const mediaIdade = ages.length > 0 ? Math.round(ages.reduce((a, b) => a + b, 0) / ages.length) : 0;

  // Telemedicina
  const comTelemedicina = candidates.filter((c) => c.expTelemedicina === 'sim').length;

  // Por estado (top 10)
  const estadoMap: Record<string, number> = {};
  for (const c of candidates) {
    estadoMap[c.estado] = (estadoMap[c.estado] ?? 0) + 1;
  }
  const porEstado = Object.entries(estadoMap)
    .map(([estado, total]) => ({ estado, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  // Por experiência
  const expLabels: Record<string, string> = {
    menos_1: '< 1 ano',
    '1_3': '1-3 anos',
    '3_5': '3-5 anos',
    '5_10': '5-10 anos',
    mais_10: '10+ anos',
  };
  const expMap: Record<string, number> = {};
  for (const c of candidates) {
    const key = c.anosExperiencia;
    if (!key) continue;
    expMap[key] = (expMap[key] ?? 0) + 1;
  }
  const porExperiencia = Object.entries(expLabels).map(([key, label]) => ({
    label,
    total: expMap[key] ?? 0,
  }));

  // Por semana (últimas 8 semanas)
  const porSemana: { semana: string; total: number }[] = [];
  for (let i = 7; i >= 0; i--) {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - i * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const label = `${weekStart.getDate().toString().padStart(2, '0')}/${(weekStart.getMonth() + 1).toString().padStart(2, '0')}`;
    const total = candidates.filter((c) => {
      const d = new Date(c.createdAt);
      return d >= weekStart && d < weekEnd;
    }).length;
    porSemana.push({ semana: label, total });
  }

  // Top especialidades
  const espMap: Record<string, number> = {};
  for (const c of candidates) {
    espMap[c.especialidade] = (espMap[c.especialidade] ?? 0) + 1;
  }
  const topEspecialidades = Object.entries(espMap)
    .map(([especialidade, total]) => ({ especialidade, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);

  return {
    stats,
    taxaAprovacao,
    taxaRejeicao,
    mediaIdade,
    comTelemedicina,
    porEstado,
    porExperiencia,
    porSemana,
    topEspecialidades,
  };
}

/** Save AI analysis for a candidate */
export function saveAIAnalysis(candidateId: string, analysis: Omit<AIAnalysisResult, 'analyzedAt'>): AIAnalysisResult {
  const candidates = readCandidates();
  if (!candidates.some((c) => c.id === candidateId)) throw new Error('Candidato não encontrado');

  const result: AIAnalysisResult = {
    ...analysis,
    analyzedAt: new Date().toISOString(),
  };

  const aiMap = readAIAnalyses();
  aiMap[candidateId] = result;
  writeAIAnalyses(aiMap);

  return result;
}

/** Get AI analysis for a specific candidate */
export function getAIAnalysis(candidateId: string): AIAnalysisResult | null {
  const aiMap = readAIAnalyses();
  return aiMap[candidateId] ?? null;
}

/** Get AI stats across all candidates */
export function getAIStats(): {
  totalAnalisados: number;
  semAnalise: number;
  scoreMedio: number;
  porRecomendacao: Record<string, number>;
  distribuicaoScore: { faixa: string; total: number }[];
} {
  const candidates = readCandidates();
  const aiMap = readAIAnalyses();

  const analyzed = candidates.filter((c) => aiMap[c.id]);
  const totalAnalisados = analyzed.length;
  const semAnalise = candidates.length - totalAnalisados;

  const scores = analyzed.map((c) => aiMap[c.id].score);
  const scoreMedio = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

  const porRecomendacao: Record<string, number> = {
    aprovar: 0,
    entrevistar: 0,
    analisar_mais: 0,
    rejeitar: 0,
  };
  for (const c of analyzed) {
    const rec = aiMap[c.id].recomendacao;
    porRecomendacao[rec] = (porRecomendacao[rec] ?? 0) + 1;
  }

  const faixas = [
    { faixa: '0-39', min: 0, max: 39 },
    { faixa: '40-59', min: 40, max: 59 },
    { faixa: '60-79', min: 60, max: 79 },
    { faixa: '80-100', min: 80, max: 100 },
  ];
  const distribuicaoScore = faixas.map(({ faixa, min, max }) => ({
    faixa,
    total: scores.filter((s) => s >= min && s <= max).length,
  }));

  return { totalAnalisados, semAnalise, scoreMedio, porRecomendacao, distribuicaoScore };
}

/** Compute stats from all candidates */
export function getStats(): {
  total: number;
  pendentes: number;
  emAnalise: number;
  entrevista: number;
  aprovados: number;
  rejeitados: number;
  porCategoria: Record<ProfessionalCategory, number>;
} {
  const candidates = readCandidates();
  const stats = {
    total: candidates.length,
    pendentes: 0,
    emAnalise: 0,
    entrevista: 0,
    aprovados: 0,
    rejeitados: 0,
    // Objeto zerado para cada categoria — usado como acumulador.
    // Satisfaz o Record<ProfessionalCategory, number> exigido pelo retorno da
    // função: o TS vai quebrar o build se esquecer de inicializar algum valor
    // do type, garantindo que o dashboard admin nunca mostre `undefined`
    // como contador (bug legado que causava "NaN% do total").
    porCategoria: {
      medico: 0,
      enfermeiro: 0,
      dentista: 0,
      psicologo: 0,
      nutricionista: 0,
      fisioterapeuta: 0,
      fonoaudiologo: 0,
      terapeuta_ocupacional: 0,
      farmaceutico: 0,
      biomedico: 0,
      educador_fisico: 0,
      assistente_social: 0,
    } satisfies Record<ProfessionalCategory, number>,
  };

  for (const c of candidates) {
    if (c.status === 'pendente') stats.pendentes++;
    else if (c.status === 'em_analise') stats.emAnalise++;
    else if (c.status === 'entrevista') stats.entrevista++;
    else if (c.status === 'aprovado') stats.aprovados++;
    else if (c.status === 'rejeitado') stats.rejeitados++;
    stats.porCategoria[c.categoria]++;
  }

  return stats;
}
