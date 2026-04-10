/**
 * Dataset mock determinístico para o Portal RH.
 * Toda aleatoriedade usa um PRNG com seed fixa, portanto as funções
 * seed* retornam exatamente os mesmos dados entre execuções.
 */

import { addDays, format, subDays, subMonths, startOfMonth } from 'date-fns';
import type {
  AvaliacaoDesempenho,
  Candidato,
  CandidatoEtapa,
  Colaborador,
  ColaboradorStatus,
  ContratoTipo,
  Departamento,
  FolhaItem,
  FolhaPagamento,
  Genero,
  PontoRegistro,
  PontoStatus,
  SolicitacaoFerias,
  Vaga,
  VagaModalidade,
  VagaNivel,
  VagaStatus,
} from '@/types/rh';

// PRNG determinístico (mulberry32)
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

const rng = makeRng(20260408);
function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)]!;
}
function range(min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}
function rangeF(min: number, max: number): number {
  return rng() * (max - min) + min;
}

const NOMES = [
  'Ana Beatriz Oliveira',
  'Bruno Almeida Silva',
  'Carolina Ferreira Souza',
  'Daniel Rocha Lima',
  'Eduarda Nogueira Pinto',
  'Felipe Cardoso Martins',
  'Gabriela Mendes Araujo',
  'Henrique Barbosa Dias',
  'Isabela Ribeiro Costa',
  'João Pedro Carvalho',
  'Karina Moreira Teixeira',
  'Lucas Nascimento Pires',
  'Mariana Gomes Ramos',
  'Nicolas Batista Freitas',
  'Olivia Marques Correia',
  'Paulo Henrique Moura',
  'Quezia Santana Rocha',
  'Rafael Tavares Melo',
  'Sabrina Viana Nunes',
  'Thiago Monteiro Lopes',
  'Ursula Campos Peixoto',
  'Vinicius Azevedo Brito',
  'Wesley Cunha Macedo',
  'Xavier Pacheco Duarte',
  'Yasmin Farias Reis',
  'Zuleika Guimarães Prado',
  'Amanda Castro Borges',
  'Bianca Leite Sampaio',
  'Caio Bezerra Xavier',
  'Débora Santos Prado',
  'Elaine Moraes Guedes',
  'Fábio Queiroz Branco',
  'Giovana Teles Rangel',
  'Hugo Antunes Lima',
  'Iara Miranda Vasconcelos',
  'Julio César Amaral',
  'Larissa Fonseca Maia',
  'Marcelo Siqueira Tavares',
  'Natália Caldas Pires',
  'Otávio Rezende Franco',
  'Priscila Alves Figueiredo',
  'Renata Barros Coelho',
];

const DEPARTAMENTOS_INFO: Array<{
  nome: string;
  gestor: string;
  cargos: string[];
  orcamento: number;
}> = [
  {
    nome: 'Tecnologia',
    gestor: 'Marcelo Siqueira Tavares',
    cargos: [
      'Engenheiro de Software',
      'SRE',
      'Tech Lead',
      'QA Engineer',
      'Arquiteto Cloud',
    ],
    orcamento: 2_400_000,
  },
  {
    nome: 'Saúde',
    gestor: 'Débora Santos Prado',
    cargos: [
      'Médico Coordenador',
      'Enfermeiro',
      'Analista Clínico',
      'Farmacêutico',
    ],
    orcamento: 3_100_000,
  },
  {
    nome: 'Operações',
    gestor: 'Hugo Antunes Lima',
    cargos: [
      'Analista de Ops',
      'Coordenador de Ops',
      'Supervisor',
      'Analista de Processos',
    ],
    orcamento: 1_600_000,
  },
  {
    nome: 'Marketing',
    gestor: 'Giovana Teles Rangel',
    cargos: ['Social Media', 'Analista de Growth', 'Designer', 'Content Lead'],
    orcamento: 900_000,
  },
  {
    nome: 'RH',
    gestor: 'Priscila Alves Figueiredo',
    cargos: [
      'Analista de RH',
      'Business Partner',
      'Recrutador Tech',
      'Analista de DP',
    ],
    orcamento: 780_000,
  },
  {
    nome: 'Financeiro',
    gestor: 'Otávio Rezende Franco',
    cargos: [
      'Analista Financeiro',
      'Controller',
      'Contador',
      'Analista Fiscal',
    ],
    orcamento: 1_050_000,
  },
];

const STATUS_COL: ColaboradorStatus[] = [
  'ativo',
  'ativo',
  'ativo',
  'ativo',
  'ferias',
  'afastado',
  'desligado',
];
const CONTRATOS: ContratoTipo[] = ['CLT', 'CLT', 'CLT', 'PJ', 'Estagio'];
const GENEROS: Genero[] = [
  'masculino',
  'feminino',
  'feminino',
  'masculino',
  'outro',
];
const CIDADES = [
  'São Paulo - SP',
  'Campinas - SP',
  'Rio de Janeiro - RJ',
  'Belo Horizonte - MG',
  'Curitiba - PR',
  'Porto Alegre - RS',
  'Recife - PE',
  'Florianópolis - SC',
];

function cpfMask(seed: number): string {
  const n = (seed * 9973) % 1_000_000_000;
  const s = n.toString().padStart(9, '0');
  return `${s.slice(0, 3)}.${s.slice(3, 6)}.${s.slice(6, 9)}-**`;
}

function telMask(seed: number): string {
  const n = ((seed * 7919) % 900_000_000) + 100_000_000;
  const s = n.toString();
  return `(${s.slice(0, 2)}) 9${s.slice(2, 6)}-${s.slice(6, 10)}`;
}

// Cache para manter o dataset estável entre chamadas.
let _colaboradores: Colaborador[] | null = null;
let _vagas: Vaga[] | null = null;
let _candidatos: Candidato[] | null = null;
let _pontos: PontoRegistro[] | null = null;
let _ferias: SolicitacaoFerias[] | null = null;
let _avaliacoes: AvaliacaoDesempenho[] | null = null;
let _folhas: FolhaPagamento[] | null = null;
let _departamentos: Departamento[] | null = null;

export function seedColaboradores(): Colaborador[] {
  if (_colaboradores) return _colaboradores;
  const hoje = new Date('2026-04-08');
  const list: Colaborador[] = NOMES.map((nome, i) => {
    const depInfo = DEPARTAMENTOS_INFO[i % DEPARTAMENTOS_INFO.length]!;
    const admDias = range(30, 2400);
    const nascDias = range(8000, 20000);
    const status = STATUS_COL[i % STATUS_COL.length]!;
    const contrato = CONTRATOS[i % CONTRATOS.length]!;
    const genero = GENEROS[i % GENEROS.length]!;
    const salarioBase =
      depInfo.nome === 'Tecnologia' || depInfo.nome === 'Saúde' ? 9000 : 5500;
    return {
      id: `col-${String(i + 1).padStart(3, '0')}`,
      nome,
      email: `${nome
        .toLowerCase()
        .replace(/\s+/g, '.')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')}@renoveja.gov.br`,
      cpfMask: cpfMask(i + 1),
      cargo: depInfo.cargos[i % depInfo.cargos.length]!,
      departamento: depInfo.nome,
      dataAdmissao: format(subDays(hoje, admDias), 'yyyy-MM-dd'),
      salario: Math.round(salarioBase + rangeF(-1500, 9500)),
      status,
      avatarUrl: undefined,
      telefone: telMask(i + 1),
      endereco: CIDADES[i % CIDADES.length]!,
      contratoTipo: contrato,
      genero,
      dataNascimento: format(subDays(hoje, nascDias), 'yyyy-MM-dd'),
      gestorId:
        i > 5 ? `col-${String((i % 5) + 1).padStart(3, '0')}` : undefined,
    };
  });
  _colaboradores = list;
  return list;
}

export function seedDepartamentos(): Departamento[] {
  if (_departamentos) return _departamentos;
  const cols = seedColaboradores();
  _departamentos = DEPARTAMENTOS_INFO.map((d, i) => ({
    id: `dep-${i + 1}`,
    nome: d.nome,
    headcount: cols.filter(
      (c) => c.departamento === d.nome && c.status !== 'desligado'
    ).length,
    orcamento: d.orcamento,
    gestor: d.gestor,
  }));
  return _departamentos;
}

const VAGA_TITULOS = [
  'Engenheiro Backend .NET',
  'Engenheiro Frontend React',
  'Mobile Developer React Native',
  'Product Designer',
  'Médico Regulador',
  'Enfermeiro(a) de Telemedicina',
  'Analista de Dados',
  'Data Scientist',
  'Tech Lead Cloud',
  'SRE Pleno',
  'Recrutador Tech',
  'Growth Marketer',
  'Content Strategist',
  'Analista Fiscal',
  'Controller',
  'Analista de Compliance',
  'Coordenador de Operações',
  'Farmacêutico Clínico',
];
const NIVEIS: VagaNivel[] = ['junior', 'pleno', 'senior', 'lead'];
const MODALIDADES: VagaModalidade[] = ['remoto', 'hibrido', 'presencial'];
const VAGA_STATUS: VagaStatus[] = [
  'aberta',
  'aberta',
  'aberta',
  'pausada',
  'fechada',
];

export function seedVagas(): Vaga[] {
  if (_vagas) return _vagas;
  _vagas = VAGA_TITULOS.map((titulo, i) => {
    const dep = DEPARTAMENTOS_INFO[i % DEPARTAMENTOS_INFO.length]!;
    const nivel = NIVEIS[i % NIVEIS.length]!;
    const salarioBase =
      nivel === 'junior'
        ? 4500
        : nivel === 'pleno'
          ? 8000
          : nivel === 'senior'
            ? 14000
            : 22000;
    return {
      id: `vaga-${String(i + 1).padStart(3, '0')}`,
      titulo,
      departamento: dep.nome,
      nivel,
      modalidade: MODALIDADES[i % MODALIDADES.length]!,
      status: VAGA_STATUS[i % VAGA_STATUS.length]!,
      candidatosCount: range(3, 42),
      diasAberta: range(2, 120),
      salarioMin: salarioBase,
      salarioMax: Math.round(salarioBase * 1.6),
    };
  });
  return _vagas;
}

const ETAPAS: CandidatoEtapa[] = [
  'triagem',
  'triagem',
  'entrevista_rh',
  'entrevista_tecnica',
  'proposta',
  'contratado',
  'rejeitado',
];
const SKILLS_POOL = [
  'TypeScript',
  'React',
  'Node.js',
  '.NET',
  'C#',
  'PostgreSQL',
  'AWS',
  'Docker',
  'Kubernetes',
  'Python',
  'SQL',
  'Figma',
  'UX Research',
  'Power BI',
  'Growth',
  'SEO',
];

const CANDIDATO_NOMES = [
  'Aline Fortunato',
  'Bernardo Rocha',
  'Camila Aguiar',
  'Diego Valente',
  'Elis Montenegro',
  'Fernando Salles',
  'Gisele Prado',
  'Heitor Paiva',
  'Ingrid Coelho',
  'Juliano Viana',
  'Kátia Rezende',
  'Leonardo Brito',
  'Mirela Assis',
  'Nelson Queiroz',
  'Oswaldo Leal',
  'Patricia Sá',
  'Rodrigo Pimenta',
  'Sueli Bittencourt',
  'Tatiana Marques',
  'Ubiratan Goes',
  'Vanessa Lara',
  'Wagner Tolentino',
  'Xênia Vilar',
  'Yuri Amorim',
  'Zélia Monteiro',
  'Alexandre Pontes',
  'Beatriz Mello',
  'Cassio Fernandes',
  'Daniela Bastos',
  'Emerson Nogueira',
  'Fátima Luz',
  'Giovani Peçanha',
  'Helena Drummond',
  'Igor Figueira',
  'Jéssica Amaro',
  'Klaus Becker',
  'Letícia Guedes',
  'Murilo Caldeira',
  'Nádia Mascarenhas',
  'Orlando Tavares',
  'Paula Serrano',
  'Quintino Brandão',
  'Roberta Palmeira',
  'Samir Estevão',
  'Talita Lobão',
  'Ulisses Zanetti',
  'Valéria Frazão',
  'Waldemar Guerra',
  'Xisto Caetano',
  'Yolanda Nóbrega',
  'Zoraide Peluso',
  'Aurora Benício',
  'Bento Ferraz',
  'Célia Marinho',
  'Dionísio Vilela',
  'Eloá Machado',
];

export function seedCandidatos(): Candidato[] {
  if (_candidatos) return _candidatos;
  const vagas = seedVagas();
  const hoje = new Date('2026-04-08');
  _candidatos = CANDIDATO_NOMES.slice(0, 56).map((nome, i) => {
    const vaga = vagas[i % vagas.length]!;
    const etapa = ETAPAS[i % ETAPAS.length]!;
    const skills = Array.from({ length: range(3, 6) }, () => pick(SKILLS_POOL));
    return {
      id: `cand-${String(i + 1).padStart(3, '0')}`,
      nome,
      email: `${nome
        .toLowerCase()
        .replace(/\s+/g, '.')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')}@mail.com`,
      vagaId: vaga.id,
      etapa,
      scoreIa: range(42, 98),
      linkedin: `https://linkedin.com/in/${nome.toLowerCase().replace(/\s+/g, '-')}`,
      resumoIa: `Profissional com ${range(2, 15)} anos de experiência. Perfil ${
        rng() > 0.5 ? 'analítico' : 'colaborativo'
      } com fit cultural ${rng() > 0.3 ? 'alto' : 'médio'} para ${vaga.titulo}.`,
      skills: Array.from(new Set(skills)),
      experienciaAnos: range(1, 18),
      pretensaoSalarial: Math.round(vaga.salarioMin * rangeF(0.9, 1.25)),
      disponibilidade: pick(['Imediata', '15 dias', '30 dias', '45 dias']),
      createdAt: format(
        subDays(hoje, range(1, 90)),
        "yyyy-MM-dd'T'HH:mm:ssXXX"
      ),
    };
  });
  return _candidatos;
}

function calcHoras(entrada: string, saida: string, pausa = 60): number {
  const [he, me] = entrada.split(':').map(Number) as [number, number];
  const [hs, ms] = saida.split(':').map(Number) as [number, number];
  const total = hs * 60 + ms - (he * 60 + me) - pausa;
  return Math.max(0, Math.round((total / 60) * 100) / 100);
}

export function seedPontos(): PontoRegistro[] {
  if (_pontos) return _pontos;
  const cols = seedColaboradores()
    .filter((c) => c.status !== 'desligado')
    .slice(0, 20);
  const hoje = new Date('2026-04-08');
  const result: PontoRegistro[] = [];
  let idSeq = 1;
  for (let d = 0; d < 30; d++) {
    const data = subDays(hoje, d);
    const dow = data.getDay();
    if (dow === 0 || dow === 6) continue;
    for (const col of cols) {
      const r = rng();
      let status: PontoStatus = 'ok';
      let entrada = '09:00';
      let saida = '18:00';
      if (r < 0.05) {
        status = 'falta';
        entrada = '--:--';
        saida = '--:--';
      } else if (r < 0.15) {
        status = 'atraso';
        entrada = `09:${String(range(10, 45)).padStart(2, '0')}`;
      } else if (r < 0.28) {
        status = 'hora_extra';
        saida = `${range(19, 21)}:${String(range(0, 59)).padStart(2, '0')}`;
      } else if (r < 0.33) {
        status = 'justificado';
      }
      const horas = status === 'falta' ? 0 : calcHoras(entrada, saida);
      result.push({
        id: `pto-${idSeq++}`,
        colaboradorId: col.id,
        data: format(data, 'yyyy-MM-dd'),
        entrada,
        saidaAlmoco: status === 'falta' ? '--:--' : '12:00',
        voltaAlmoco: status === 'falta' ? '--:--' : '13:00',
        saida,
        horasTrabalhadas: horas,
        status,
      });
    }
  }
  _pontos = result;
  return result;
}

export function seedFerias(): SolicitacaoFerias[] {
  if (_ferias) return _ferias;
  const cols = seedColaboradores();
  const hoje = new Date('2026-04-08');
  const statuses: SolicitacaoFerias['status'][] = [
    'pendente',
    'pendente',
    'aprovada',
    'aprovada',
    'em_andamento',
    'concluida',
    'rejeitada',
  ];
  _ferias = Array.from({ length: 12 }, (_, i) => {
    const col = cols[i * 3]!;
    const inicio = addDays(hoje, range(-60, 120));
    const dias = range(5, 30);
    const fim = addDays(inicio, dias);
    const status = statuses[i % statuses.length]!;
    return {
      id: `fer-${String(i + 1).padStart(3, '0')}`,
      colaboradorId: col.id,
      dataInicio: format(inicio, 'yyyy-MM-dd'),
      dataFim: format(fim, 'yyyy-MM-dd'),
      diasUteis: Math.max(1, Math.round((dias / 7) * 5)),
      status,
      motivoRejeicao:
        status === 'rejeitada'
          ? 'Conflito com fechamento trimestral'
          : undefined,
      aprovadorId: status !== 'pendente' ? 'col-001' : undefined,
      createdAt: format(
        subDays(hoje, range(1, 45)),
        "yyyy-MM-dd'T'HH:mm:ssXXX"
      ),
    };
  });
  return _ferias;
}

export function seedAvaliacoes(): AvaliacaoDesempenho[] {
  if (_avaliacoes) return _avaliacoes;
  const cols = seedColaboradores().slice(0, 24);
  _avaliacoes = cols.map((col, i) => {
    const nota = Math.round(rangeF(2.5, 5) * 10) / 10;
    const sentimento: AvaliacaoDesempenho['sentimento'] =
      nota >= 4 ? 'positivo' : nota >= 3 ? 'neutro' : 'negativo';
    return {
      id: `ava-${String(i + 1).padStart(3, '0')}`,
      colaboradorId: col.id,
      periodo: '2026-Q1',
      notaGeral: nota,
      notaLideranca: Math.round(rangeF(2, 5) * 10) / 10,
      notaTecnica: Math.round(rangeF(3, 5) * 10) / 10,
      notaComportamental: Math.round(rangeF(2.5, 5) * 10) / 10,
      feedbackIa: `Colaborador demonstra ${
        sentimento === 'positivo'
          ? 'excelente'
          : sentimento === 'neutro'
            ? 'adequada'
            : 'necessidade de melhora na'
      } entrega de resultados. IA identifica ${
        sentimento === 'positivo'
          ? 'potencial para promoção'
          : 'oportunidades de desenvolvimento'
      }.`,
      sentimento,
      comentariosPares: [
        'Colabora bem com o time.',
        'Proativo em reuniões.',
        'Entregas consistentes.',
      ],
      objetivosAtingidos: range(2, 8),
      objetivosTotais: 8,
    };
  });
  return _avaliacoes;
}

export function seedFolhas(): FolhaPagamento[] {
  if (_folhas) return _folhas;
  const cols = seedColaboradores().filter((c) => c.status !== 'desligado');
  const hoje = new Date('2026-04-08');
  _folhas = Array.from({ length: 6 }, (_, k) => {
    const mesDate = startOfMonth(subMonths(hoje, k));
    const itens: FolhaItem[] = cols.map((c) => {
      const bruto = c.salario;
      const inss = Math.round(bruto * 0.11);
      const irrf = Math.round(Math.max(0, bruto - 3000) * 0.15);
      const fgts = Math.round(bruto * 0.08);
      const beneficios = Math.round(bruto * 0.12);
      const liquido = bruto - inss - irrf;
      return {
        colaboradorId: c.id,
        bruto,
        liquido,
        inss,
        irrf,
        fgts,
        beneficios,
      };
    });
    const totalBruto = itens.reduce((s, i) => s + i.bruto, 0);
    const totalLiquido = itens.reduce((s, i) => s + i.liquido, 0);
    const totalDescontos = itens.reduce((s, i) => s + i.inss + i.irrf, 0);
    const totalEncargos = itens.reduce((s, i) => s + i.fgts + i.beneficios, 0);
    return {
      mes: format(mesDate, 'yyyy-MM'),
      totalBruto,
      totalLiquido,
      totalDescontos,
      totalEncargos,
      colaboradores: itens.length,
      itens,
    };
  });
  return _folhas;
}
