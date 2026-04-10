/**
 * Admin API layer.
 *
 * Production-only: requires VITE_API_URL to be set. There is NO mock fallback —
 * the RH panel must always talk to the real backend so a recruiter never sees
 * fake data. If VITE_API_URL is missing, every call throws immediately.
 */

import axios, { AxiosError, type AxiosInstance } from 'axios';
import { z } from 'zod';
import type {
  AdminCandidate,
  AdminStats,
  AdminNote,
  AIAnalysisResult,
  CandidateStatus,
  AdminUser,
  DashboardAnalytics,
} from '../types/admin';
import type { ProfessionalCategory } from '../types';
import { COUNCIL_LABEL_MAP } from './constants';

/**
 * Extrai a categoria profissional (medico | enfermeiro | dentista | psicologo | nutricionista)
 * do Bio. O backend persiste `Categoria: <valor>` dentro do Bio no onboarding do RH
 * (ver HrDoctorOnboardingMapper.BuildBio) porque RegisterDoctorRequestDto ainda não
 * tem um campo Category. Sem isso, médicos cadastrados como dentista/enfermeiro eram
 * exibidos como "medico/CRM" no portal — bug 2026-04-08.
 *
 * Fallback: "medico" (comportamento legado) para candidatos cadastrados antes do fix,
 * quando o prefixo ainda não era gravado.
 */
const VALID_CATEGORIES: ReadonlySet<ProfessionalCategory> = new Set([
  'medico',
  'enfermeiro',
  'dentista',
  'psicologo',
  'nutricionista',
  'fisioterapeuta',
  'fonoaudiologo',
  'terapeuta_ocupacional',
  'farmaceutico',
  'biomedico',
  'educador_fisico',
  'assistente_social',
]);

const GRADUATION_BY_CATEGORY: Record<ProfessionalCategory, string> = {
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

function parseCategoriaFromBio(bio: string | null | undefined): ProfessionalCategory | null {
  if (!bio) return null;
  // Formato gravado pelo backend: "Categoria: enfermeiro" (dentro da linha de "exp").
  // Inclui underscore no regex para aceitar categorias compostas como
  // "terapeuta_ocupacional", "educador_fisico" e "assistente_social" —
  // sem isso, o match pararia no primeiro underscore e devolveria
  // "terapeuta" (inválido), caindo no fallback "medico".
  const match = bio.match(/Categoria:\s*([a-záéíóúâêô_]+)/i);
  if (!match) return null;
  const value = match[1].toLowerCase() as ProfessionalCategory;
  return VALID_CATEGORIES.has(value) ? value : null;
}

/**
 * Inferência de categoria a partir do VALOR da especialidade persistida no banco.
 * Usado como fallback para registros LEGADOS (cadastrados antes de 2026-04-08)
 * em que o backend não gravava a categoria — o valor da especialidade tem
 * prefixos distintos por categoria (enfermagem_*, nutricao_*, psicologia_*, etc.),
 * então dá pra recuperar a categoria original da grande maioria dos candidatos
 * sem precisar de migration ou intervenção manual no banco.
 *
 * Ordem de prioridade: 1) Bio (novo padrão) 2) specialty (legado) 3) "medico" (fallback final).
 *
 * Casos ambíguos: "acupuntura", "homeopatia" e "outra" existem em mais de uma
 * categoria. Para esses o fallback cai em "medico" — comportamento legado.
 */
function inferCategoriaFromSpecialty(specialty: string | null | undefined): ProfessionalCategory | null {
  if (!specialty) return null;
  const s = specialty.toLowerCase().trim();

  // Enfermagem — todos os valores começam com "enfermagem_"
  if (s.startsWith('enfermagem_')) return 'enfermeiro';

  // Nutrição — "nutricao_*" + valores específicos
  if (s.startsWith('nutricao_')) return 'nutricionista';
  if (s === 'transtornos_alimentares' || s === 'fitoterapia' || s === 'marketing_nutricao') {
    return 'nutricionista';
  }

  // Psicologia — "psicologia_*", "psico_*", "neuropsicologia*", "terapia_*", etc.
  if (
    s.startsWith('psicologia_') ||
    s.startsWith('psico_') ||
    s.startsWith('neuropsicologia') ||
    s === 'psicopedagogia' ||
    s.startsWith('terapia_') ||
    s === 'dbt' ||
    s === 'emdr' ||
    s === 'gestalt_terapia' ||
    s === 'psicanalise' ||
    s === 'avaliacao_psicologica' ||
    s === 'dependencia_quimica' ||
    s === 'luto' ||
    s === 'sexualidade'
  ) {
    return 'psicologo';
  }

  // Odontologia — "odonto*", "protese_*", + valores específicos da CFO 253/2023
  if (s.startsWith('odonto') || s.startsWith('protese_')) return 'dentista';
  const dentistrySpecifics = new Set([
    'cirurgia_bucomaxilofacial',
    'dentistica',
    'disfuncao_temporomandibular',
    'endodontia',
    'estomatologia',
    'harmonizacao_orofacial',
    'implantodontia',
    'ortodontia',
    'ortopedia_funcional',
    'patologia_oral',
    'periodontia',
    'radiologia_odontologica',
  ]);
  if (dentistrySpecifics.has(s)) return 'dentista';

  // Fisioterapia — todos os valores começam com "fisioterapia_"
  if (s.startsWith('fisioterapia_')) return 'fisioterapeuta';

  // Fonoaudiologia — todos os valores começam com "fonoaudiologia_"
  if (s.startsWith('fonoaudiologia_')) return 'fonoaudiologo';

  // Terapia Ocupacional — todos os valores começam com "to_"
  // O prefixo é curto (2 chars) de propósito para manter as chaves de
  // especialidade legíveis no DB ("to_saude_mental" vs. "terapia_ocupacional_saude_mental").
  if (s.startsWith('to_')) return 'terapeuta_ocupacional';

  // Farmácia — todos os valores começam com "farmacia_"
  if (s.startsWith('farmacia_')) return 'farmaceutico';

  // Biomedicina — todos os valores começam com "biomedicina_"
  if (s.startsWith('biomedicina_')) return 'biomedico';

  // Educação Física — todos os valores começam com "ef_"
  if (s.startsWith('ef_')) return 'educador_fisico';

  // Serviço Social — todos os valores começam com "servico_social_"
  if (s.startsWith('servico_social_')) return 'assistente_social';

  // Resto — medicina (ou ambíguo acupuntura/homeopatia/outra — caem no fallback legado)
  return null;
}

/**
 * Inferência de último recurso a partir de texto livre (email, nome, bio/sobre).
 *
 * Usado APENAS quando o Bio não tem "Categoria: ..." (registro legado) E a
 * especialidade também não é classificável — ex.: especialidade "outra" com
 * OutraEspecialidade livre como "Clínico geral", que é ambíguo.
 *
 * Caso real que motivou (2026-04-08): Ana Beatriz Lemos Souza, email
 * "draanabeatrizodontologia@gmail.com", especialidade "outra (Clínico geral)".
 * Sem esse fallback, aparecia como "medico/CRM" no portal RH mesmo sendo
 * claramente dentista (email + contexto).
 *
 * Critérios (todos sobre texto em lowercase sem acentos):
 *   - "odonto" / "dentist" / "cirurgiao-dentista" / "cro-" → dentista
 *   - "enfermag" / "enfermeir" / "coren-"                  → enfermeiro
 *   - "nutric" / "nutrolog" / "crn-"                       → nutricionista
 *   - "psicolog" / "crp-"                                  → psicologo
 *   - "fisioterap" / "crefito-"                            → fisioterapeuta
 *   - "fonoaudiolog" / "fonoaud" / "crfa-"                 → fonoaudiologo
 *   - "terapeuta-ocupacional" / "terapiaocupacional" / "to-" → terapeuta_ocupacional
 *   - "farmaceutico" / "farmacia" / "crf-"                 → farmaceutico
 *   - "biomedic" / "crbm-"                                 → biomedico
 *   - "educacao-fisica" / "educador-fisico" / "cref-"      → educador_fisico
 *   - "servico-social" / "assistente-social" / "cress-"    → assistente_social
 *
 * Por que NÃO olhar a especialidade aqui: termos como "psico" aparecem em
 * "psiquiatria" (médica), e "nutri" em "nutrição clínica" (médica).
 * Para não introduzir falsos positivos, só olhamos email/nome/bio livre —
 * onde a auto-identificação profissional é praticamente sempre correta.
 */
function normalizeForMatch(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // strip diacritics: "médico" → "medico"
}

function inferCategoriaFromFreeText(
  email: string | null | undefined,
  name: string | null | undefined,
  bio: string | null | undefined,
): ProfessionalCategory | null {
  const parts = [email, name, bio].filter((v): v is string => !!v && v.length > 0);
  if (parts.length === 0) return null;
  const blob = normalizeForMatch(parts.join(' '));

  // ORDEM IMPORTA. Padrões mais específicos/distintivos ANTES dos menos
  // específicos para evitar falsos positivos:
  //
  //  1. "odonto" é o sinal mais distintivo (não colide com ninguém).
  //  2. "fisioterap*" precisa vir ANTES de qualquer coisa que tenha "terap",
  //     para não ser capturado por "terapeuta-ocupacional" (improvável mas
  //     possível se o usuário escrever errado).
  //  3. "terapeuta-ocupacional"/"terapia-ocupacional" VEM ANTES de "psicolog"
  //     porque alguns TOs se identificam como "terapeuta" e o "terapeuta"
  //     sozinho é ambíguo (podia ser psicoterapeuta).
  //  4. "educador-fisico" ANTES de qualquer coisa com "fisio" para não
  //     ser capturado como fisioterapeuta.
  //  5. "servico-social"/"assistente-social" isolados — sem colisão.
  //  6. "biomedic" antes de "medic*" para não cair em médico.
  //  7. "farmac*" isolado, sem colisão.
  //  8. "fonoaudiolog" isolado, sem colisão.
  //
  // O regex de conselho (\bcrefito-xx\b, \bcrfa-xx\b, etc.) é o sinal mais
  // forte e fecha o caso mesmo se o texto livre tiver outras pistas.

  // CREFITO cobre fisio E TO — ambos são COFFITO. Nesse caso a inferência
  // por conselho sozinho é AMBÍGUA, então só classifica se houver outra
  // pista. Por isso checamos padrões textuais primeiro.
  if (/fisioterap|\bcrefito-[a-z]{1,3}\b/.test(blob) && !/terapia-?ocupacional|\bto-/.test(blob)) {
    return 'fisioterapeuta';
  }
  if (/terapia-?ocupacional|terapeuta-?ocupacional|\bto[- /](?:reabilita|saude|autis|geriat|criancas|pediatr)/.test(blob)) {
    return 'terapeuta_ocupacional';
  }
  if (/\bcrefito-[a-z]{1,3}\b/.test(blob)) {
    // CREFITO puro sem pista textual — por volume histórico, fisio é maioria.
    return 'fisioterapeuta';
  }

  if (/fonoaudiolog|fonoaud|\bcrfa-[a-z]{1,3}\b/.test(blob)) return 'fonoaudiologo';

  if (/biomedic|\bcrbm-[a-z]{1,3}\b/.test(blob)) return 'biomedico';

  if (/farmac(?:i|eu)|\bcrf-[a-z]{1,3}\b/.test(blob)) return 'farmaceutico';

  if (/educador-?fisico|educacao-?fisica|personal-?trainer|\bcref-[a-z]{1,3}\b|\bcref\d/.test(blob)) {
    return 'educador_fisico';
  }

  if (/servico-?social|assistente-?social|\bcress-[a-z]{1,3}\b/.test(blob)) {
    return 'assistente_social';
  }

  if (/odonto|dentist|cirurgiao-?dentista|\bcro-[a-z]{2}\b/.test(blob)) return 'dentista';
  if (/enfermag|enfermeir|\bcoren-[a-z]{2}\b/.test(blob)) return 'enfermeiro';
  if (/nutricion|nutrolog|\bcrn-[a-z]{2}\b/.test(blob)) return 'nutricionista';
  if (/psicolog|\bcrp-[a-z]{2}\b/.test(blob)) return 'psicologo';

  return null;
}

function resolveCategoria(
  bio: string | null | undefined,
  specialty: string | null | undefined,
  email: string | null | undefined,
  name: string | null | undefined,
): ProfessionalCategory {
  return (
    parseCategoriaFromBio(bio) ??
    inferCategoriaFromSpecialty(specialty) ??
    inferCategoriaFromFreeText(email, name, bio) ??
    'medico'
  );
}

/* ------------------------------------------------------------------ */
/* Runtime validation schemas (Zod)                                    */
/* ------------------------------------------------------------------ */

/**
 * Zod schemas provide a runtime safety net on top of the compile-time
 * TypeScript types. They are intentionally permissive on optional/unknown
 * fields (`.passthrough()` where appropriate) so a benign backend field
 * addition does not break the RH panel — but they DO enforce the presence
 * and primitive type of the fields this UI depends on.
 *
 * On validation failure we log to console in dev and throw a descriptive
 * error so the caller's try/catch surfaces a clear message to the user
 * instead of a cryptic downstream crash.
 */

const isDev = import.meta.env?.DEV === true;

// FIX M5: sanitiza PII antes de logar em dev. Sem isso, um parse falhado
// de candidato (ex: campo novo no backend sem update no schema Zod) logava
// o objeto cru no console — incluindo CPF, nome, email, telefone. Em dev
// isso é tolerável no console do browser, mas se alguém rodar com DEV=true
// em staging, ou se algum colaborador screenshar o console, PII vaza.
// Agora logamos apenas o formato dos issues + as chaves do raw, nunca os valores.
const PII_KEYS = new Set(['cpf', 'cnpj', 'rg', 'email', 'phone', 'name', 'fullName', 'address', 'birthDate', 'birth_date']);

function sanitizeForLog(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(sanitizeForLog);
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (PII_KEYS.has(k)) {
        out[k] = typeof v === 'string' ? `<redacted:${v.length}ch>` : '<redacted>';
      } else {
        out[k] = sanitizeForLog(v);
      }
    }
    return out;
  }
  return value;
}

function validate<T>(schema: z.ZodType<T>, raw: unknown, label: string): T {
  const result = schema.safeParse(raw);
  if (result.success) return result.data;
  if (isDev) {
    console.error(`[admin-api] Validation failed for ${label}:`, result.error.issues, sanitizeForLog(raw));
  }
  throw new Error(`Resposta inválida do servidor (${label}).`);
}

const AuthResponseSchema = z.object({
  token: z.string().min(1),
  user: z
    .object({
      id: z.string().optional(),
      name: z.string().optional(),
      email: z.string().email().optional(),
      role: z.string(),
    })
    .passthrough(),
  refreshToken: z.string().optional(),
});

// NOTE: several of these fields are `string?` on the backend
// (DoctorListResponseDto) — notably `phone`, which comes from
// `user.Phone?.Value` and is null for any doctor that never saved one.
// Keep the schema aligned with what the backend can actually send,
// otherwise ONE doctor with a null field blows up the whole list and
// the RH panel shows "Resposta inválida do servidor".
const DoctorListItemSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    phone: z.string().nullable().optional(),
    crm: z.string(),
    crmState: z.string(),
    specialty: z.string(),
    rating: z.number(),
    totalConsultations: z.number(),
    available: z.boolean(),
    approvalStatus: z.string(),
    curriculumUrl: z.string().nullable().optional(),
    diplomaUrl: z.string().nullable().optional(),
  })
  .passthrough();

const DoctorListResponseSchema = z.union([
  z.array(DoctorListItemSchema),
  z
    .object({
      items: z.array(DoctorListItemSchema),
    })
    .passthrough(),
]);

const AdminNoteResponseSchema = z
  .object({
    id: z.string(),
    doctorProfileId: z.string(),
    authorUserId: z.string(),
    authorName: z.string(),
    text: z.string(),
    createdAt: z.string(),
  })
  .passthrough();

/* ------------------------------------------------------------------ */
/* Config                                                              */
/* ------------------------------------------------------------------ */

const API_URL = import.meta.env.VITE_API_URL;

/**
 * Custom error thrown when the backend rate-limits us (HTTP 429).
 * Pages can detect this with `instanceof RateLimitError` and back off
 * instead of remounting/refetching in a tight loop.
 */
export class RateLimitError extends Error {
  constructor(message = 'Muitas requisições. Aguarde alguns segundos e tente novamente.') {
    super(message);
    this.name = 'RateLimitError';
  }
}

/** Event name dispatched on the window when the backend returns 401. */
export const ADMIN_UNAUTHORIZED_EVENT = 'admin:unauthorized';

let apiInstance: AxiosInstance | null = null;

/**
 * Lazily-built singleton axios instance.
 *
 * Why a singleton: the previous version created a new AxiosInstance on every
 * call, which made it impossible to attach interceptors (the interceptors
 * would be discarded on the next call). The whole 401/429 handling chain
 * depends on this being a single shared instance.
 *
 * EXPORTED so that productivity-api.ts (Monitor de Produtividade Médica)
 * reaproveita a mesma instância — sem isso, o polling de 10s/30s das 4
 * páginas admin criava novas instâncias sem interceptors a cada chamada,
 * e um token expirado durante polling nunca disparava o evento de logout
 * (AdminAuthContext ficava preso mostrando "Erro ao buscar…" eternamente).
 */
export function getApi(): AxiosInstance {
  if (apiInstance) return apiInstance;

  if (!API_URL) {
    throw new Error(
      'VITE_API_URL não configurado. O painel RH exige um backend real e não opera em modo mock.',
    );
  }

  const instance = axios.create({ baseURL: API_URL, timeout: 30000 });

  // Response interceptor:
  //  - 401  → dispatch global event so AdminAuthContext can logout once
  //  - 429  → throw a typed RateLimitError so callers can show a friendly
  //           message and stop hammering the backend
  instance.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
      const status = error.response?.status;

      if (status === 401) {
        // Don't dispatch on the login endpoint itself — a 401 there is just
        // "wrong password" and should bubble up to the login form.
        const url = error.config?.url ?? '';
        if (!url.includes('/api/auth/login')) {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent(ADMIN_UNAUTHORIZED_EVENT));
          }
        }
      }

      if (status === 429) {
        return Promise.reject(new RateLimitError());
      }

      return Promise.reject(error);
    },
  );

  apiInstance = instance;
  return instance;
}

/** Attach JWT bearer token for real API calls */
export function authHeaders(token?: string | null) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/* ------------------------------------------------------------------ */
/* In-flight request dedupe                                            */
/* ------------------------------------------------------------------ */

/**
 * Defensive in-flight dedupe for `fetchCandidates`. Multiple concurrent
 * callers asking for the same filters share a single underlying request,
 * so even buggy callers (e.g. a useEffect that double-fires) cannot
 * amplify load on the backend.
 *
 * The promise is removed from the cache as soon as it settles — this is
 * NOT a result cache, just a concurrency guard.
 */
const inFlightCandidates = new Map<string, Promise<AdminCandidate[]>>();

function candidatesCacheKey(
  filters: { status?: CandidateStatus; categoria?: ProfessionalCategory; search?: string } | undefined,
  token: string | null | undefined,
): string {
  return JSON.stringify({
    s: filters?.status ?? null,
    c: filters?.categoria ?? null,
    q: filters?.search ?? null,
    t: token ?? null,
  });
}

/* ------------------------------------------------------------------ */
/* Test-doctor denylist                                                */
/*                                                                     */
/* O backend .NET hoje devolve TODOS os médicos cadastrados em         */
/* /api/admin/doctors, inclusive contas de teste/seed que o time usa   */
/* no app principal. Elas entravam no portal RH e inflavam os          */
/* contadores (headcount de candidatos, taxa de aprovação, KPIs do     */
/* dashboard). Até o backend ganhar uma flag `isTest`, filtramos       */
/* aqui no front por e-mail, de forma centralizada:                    */
/*                                                                     */
/*   1. Denylist explícita — contas internas/pessoais que não são      */
/*      candidatos reais mas usam domínio "normal".                    */
/*   2. Padrões — qualquer coisa em @example.com e e-mails com         */
/*      ".seed@" ou ".teste@" (convenção dos seeds de dev).            */
/*                                                                     */
/* Para adicionar novos testes no futuro, basta incluir o e-mail em    */
/* lowercase no Set abaixo. É intencionalmente só o e-mail (não id)    */
/* porque ids de banco mudam entre ambientes, e-mail é estável.        */
/* ------------------------------------------------------------------ */

const TEST_DOCTOR_EMAILS = new Set<string>([
  'medico.teste.seed@example.com',
  'medico.fake.seed@example.com',
  'renato@gmail.com',
  'contato@renovejasaude.com.br',
  'administracao@renovejasaude.com.br',
]);

function isTestDoctorEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  if (TEST_DOCTOR_EMAILS.has(normalized)) return true;
  if (normalized.endsWith('@example.com')) return true;
  if (normalized.includes('.seed@')) return true;
  if (normalized.includes('.teste@')) return true;
  return false;
}

/* ------------------------------------------------------------------ */
/* Backend DTO → Frontend mapping                                      */
/* ------------------------------------------------------------------ */

/** Shape returned by GET /api/admin/doctors from the .NET backend */
interface DoctorListResponseDto {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  avatarUrl?: string;
  crm: string;
  crmState: string;
  specialty: string;
  bio?: string;
  rating: number;
  totalConsultations: number;
  available: boolean;
  approvalStatus: string; // "pending" | "approved" | "rejected"
  birthDate?: string;
  gender?: string;
  graduationYear?: number;
  cpf?: string;
  street?: string;
  number?: string;
  neighborhood?: string;
  complement?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  university?: string;
  courses?: string;
  hospitalsServices?: string;
  createdAt?: string;
  curriculumUrl?: string | null;
  diplomaUrl?: string | null;
}

interface AdminNoteDto {
  id: string;
  doctorProfileId: string;
  authorUserId: string;
  authorName: string;
  text: string;
  createdAt: string;
}

const BACKEND_STATUS_MAP: Record<string, CandidateStatus> = {
  pending: 'pendente',
  approved: 'aprovado',
  rejected: 'rejeitado',
};

const BACKEND_GENDER_MAP: Record<string, import('../types').Gender> = {
  M: 'masculino',
  F: 'feminino',
  Outro: 'nao_binario',
  'Não informado': 'prefiro_nao_informar',
};

const FRONTEND_STATUS_MAP: Record<string, string> = {
  pendente: 'pending',
  em_analise: 'pending', // RH-internal → backend still sees "pending"
  entrevista: 'pending',
  aprovado: 'approved',
  rejeitado: 'rejected',
};

function mapDoctorToCandidate(dto: DoctorListResponseDto): AdminCandidate {
  const created = dto.createdAt ?? new Date().toISOString();
  const categoria = resolveCategoria(dto.bio, dto.specialty, dto.email, dto.name);
  const councilLabel = COUNCIL_LABEL_MAP[categoria]; // CRM | COREN | CRO | CRP | CRN
  return {
    id: dto.id,
    protocolo: `APP-${dto.id.slice(0, 8).toUpperCase()}`,
    status: BACKEND_STATUS_MAP[dto.approvalStatus] ?? 'pendente',
    createdAt: created,
    updatedAt: created,

    // Personal
    nome: dto.name,
    cpf: dto.cpf ?? '',
    nascimento: dto.birthDate ?? '',
    genero: dto.gender ? BACKEND_GENDER_MAP[dto.gender] : undefined,
    email: dto.email,
    telefone: dto.phone ?? '',
    estado: dto.state ?? dto.crmState,
    cidade: dto.city ?? '',

    // Professional — categoria lida do Bio (prefixo gravado pelo onboarding do RH).
    // Candidatos antigos, sem o prefixo, caem no fallback "medico" (legado).
    categoria,
    conselho: `${councilLabel}/${dto.crmState} ${dto.crm}`,
    ufRegistro: dto.crmState,
    especialidade: dto.specialty,
    // anosExperiencia / expTelemedicina are NOT collected by the
    // mobile app registration — leave undefined instead of inventing values.
    sobre: dto.bio,

    // Academic — a graduação é derivada da categoria porque o onboarding
    // do RH não coleta o curso de graduação em um campo separado.
    graduacao: GRADUATION_BY_CATEGORY[categoria],
    universidade: dto.university ?? '',
    anoConclusao: dto.graduationYear ?? 0,
    posGraduacao: dto.courses || undefined,
    residencia: dto.hospitalsServices || undefined,

    // Documents — URLs S3 públicas anexadas pelo upload do onboarding
    // (POST /api/doctors/from-hr/{userId}/documents). Podem ser null/ausentes
    // se o candidato pulou o upload ou se a fase 2 falhou silenciosamente.
    curriculoUrl: dto.curriculumUrl ?? undefined,
    diplomaUrl: dto.diplomaUrl ?? undefined,

    // Notes (loaded separately)
    notas: [],
  };
}

function mapNoteDto(dto: AdminNoteDto): AdminNote {
  return {
    id: dto.id,
    autor: dto.authorName,
    texto: dto.text,
    createdAt: dto.createdAt,
  };
}

/* ------------------------------------------------------------------ */
/* Admin Auth                                                          */
/* ------------------------------------------------------------------ */

export async function adminLogin(email: string, password: string): Promise<AdminUser> {
  const api = getApi();

  // Real API — POST /api/auth/login
  // Response shape (AuthResponseDto):
  //   { user: { id, name, email, role, ... }, token: "...", refreshToken: "..." }
  let data: z.infer<typeof AuthResponseSchema>;
  try {
    const response = await api.post('/api/auth/login', { email, password });
    data = validate(AuthResponseSchema, response.data, 'POST /api/auth/login');
  } catch (err) {
    if (typeof err === 'object' && err !== null && 'response' in err) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      const msg = axiosErr.response?.data?.message;
      throw new Error(msg ?? 'E-mail ou senha incorretos.');
    }
    // Preserve validation Error messages produced by `validate(...)` above
    if (err instanceof Error) throw err;
    throw new Error('Não foi possível contatar o servidor. Tente novamente.');
  }

  const role = (data.user?.role ?? '').toLowerCase();
  if (role !== 'admin') {
    throw new Error(
      'Este usuário não tem permissão para acessar o painel RH. ' +
      'Use uma conta de administrador.',
    );
  }

  if (!data.token) {
    throw new Error('Resposta do servidor sem token de autenticação.');
  }

  return {
    email: data.user?.email ?? email,
    nome: data.user?.name ?? 'Administrador RH',
    token: data.token,
  };
}

/* ------------------------------------------------------------------ */
/* Candidates                                                          */
/* ------------------------------------------------------------------ */

export async function fetchCandidates(
  filters?: {
    status?: CandidateStatus;
    categoria?: ProfessionalCategory;
    search?: string;
  },
  token?: string | null,
): Promise<AdminCandidate[]> {
  // Concurrency guard — share a single in-flight promise for identical
  // (filters, token) pairs so a buggy caller cannot amplify backend load.
  const key = candidatesCacheKey(filters, token);
  const existing = inFlightCandidates.get(key);
  if (existing) return existing;

  const promise = (async () => {
    const api = getApi();

    // Real API — GET /api/admin/doctors
    const params: Record<string, string> = { pageSize: '200' };
    if (filters?.status) {
      params.status = FRONTEND_STATUS_MAP[filters.status] ?? 'pending';
    }

    const { data } = await api.get('/api/admin/doctors', {
      params,
      headers: authHeaders(token),
    });

    const parsed = validate(DoctorListResponseSchema, data, 'GET /api/admin/doctors');
    const items = Array.isArray(parsed) ? parsed : parsed.items;
    let candidates: AdminCandidate[] = items
      .filter((item) => !isTestDoctorEmail((item as DoctorListResponseDto).email))
      .map((item) => mapDoctorToCandidate(item as DoctorListResponseDto));

    // Client-side filters the backend doesn't support
    if (filters?.categoria) {
      candidates = candidates.filter((c) => c.categoria === filters.categoria);
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      candidates = candidates.filter(
        (c) =>
          c.nome.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          c.cpf.includes(q) ||
          c.protocolo.toLowerCase().includes(q),
      );
    }

    return candidates;
  })();

  inFlightCandidates.set(key, promise);
  // Clear the slot whether the request succeeds or fails so the next
  // user-driven refresh can hit the backend again.
  promise.finally(() => {
    if (inFlightCandidates.get(key) === promise) {
      inFlightCandidates.delete(key);
    }
  });

  return promise;
}

export async function fetchCandidateById(
  id: string,
  token?: string | null,
): Promise<AdminCandidate | null> {
  const api = getApi();

  // Real API — GET /api/admin/doctors/{id}
  let doctor: DoctorListResponseDto;
  try {
    const { data } = await api.get(`/api/admin/doctors/${id}`, {
      headers: authHeaders(token),
    });
    doctor = validate(
      DoctorListItemSchema,
      data,
      `GET /api/admin/doctors/${id}`,
    ) as DoctorListResponseDto;
  } catch (err) {
    if (typeof err === 'object' && err !== null && 'response' in err) {
      const axiosErr = err as { response?: { status?: number } };
      if (axiosErr.response?.status === 404) return null;
    }
    throw err;
  }

  // Mesma denylist de `fetchCandidates`: um médico de teste acessado
  // por link direto também deve se comportar como "não encontrado"
  // em vez de renderizar a página de detalhe com dados poluídos.
  if (isTestDoctorEmail(doctor.email)) return null;

  const candidate = mapDoctorToCandidate(doctor);

  // Best-effort: merge latest AI analysis.
  // Backend returns 200 with { analysis: null } when never analyzed (avoids console noise);
  // older builds may still reply 404, so we keep the catch for backward compat.
  try {
    const { data: ai } = await api.get(`/api/admin/doctors/${id}/ai-analysis`, {
      headers: authHeaders(token),
    });
    if (ai && typeof ai.score === 'number') {
      candidate.aiAnalysis = {
        score: ai.score,
        resumo: ai.resumo,
        pontosFortes: ai.pontosFortes ?? [],
        pontosFracos: ai.pontosFracos ?? [],
        recomendacao: ai.recomendacao,
        recomendacaoTexto: ai.recomendacaoTexto,
        analyzedAt: ai.analyzedAt ?? ai.createdAt,
      };
    }
  } catch {
    // legacy 404 path — leave aiAnalysis undefined
  }

  // Best-effort: merge admin notes
  try {
    const { data: notes } = await api.get(`/api/admin/doctors/${id}/notes`, {
      headers: authHeaders(token),
    });
    if (Array.isArray(notes)) {
      candidate.notas = notes.map(mapNoteDto);
    }
  } catch {
    // notes endpoint failure shouldn't break candidate detail loading
  }

  return candidate;
}

export async function updateCandidateStatus(
  id: string,
  status: CandidateStatus,
  token?: string | null,
  reason?: string,
): Promise<AdminCandidate> {
  const api = getApi();

  if (status === 'aprovado') {
    await api.post(`/api/admin/doctors/${id}/approve`, null, {
      headers: authHeaders(token),
    });
  } else if (status === 'rejeitado') {
    await api.post(
      `/api/admin/doctors/${id}/reject`,
      reason ? { reason } : {},
      { headers: authHeaders(token) },
    );
  }
  // em_analise and entrevista are RH-internal states — no backend call needed
  // We re-fetch the doctor to return updated data
  const candidate = await fetchCandidateById(id, token);
  if (!candidate) throw new Error('Médico não encontrado');

  // For internal statuses, override with the requested status
  if (status === 'em_analise' || status === 'entrevista') {
    return { ...candidate, status };
  }
  return candidate;
}

export async function addCandidateNote(
  id: string,
  texto: string,
  token?: string | null,
): Promise<AdminNote> {
  const api = getApi();
  const { data } = await api.post(
    `/api/admin/doctors/${id}/notes`,
    { text: texto },
    { headers: authHeaders(token) },
  );
  const note = validate(
    AdminNoteResponseSchema,
    data,
    `POST /api/admin/doctors/${id}/notes`,
  );
  return mapNoteDto(note as AdminNoteDto);
}

/* ------------------------------------------------------------------ */
/* Stats & Analytics                                                   */
/* ------------------------------------------------------------------ */

/**
 * Compute stats from a candidates list.
 *
 * Accepts an optional pre-fetched list to avoid duplicate `/api/admin/doctors`
 * requests when the caller already has the data. Previously this function
 * unconditionally re-fetched, which (combined with `fetchAnalytics` calling
 * BOTH `fetchCandidates` and `fetchStats`) caused 4× amplification per
 * dashboard mount.
 */
export async function fetchStats(
  token?: string | null,
  prefetched?: AdminCandidate[],
): Promise<AdminStats> {
  const candidates = prefetched ?? (await fetchCandidates(undefined, token));
  const stats: AdminStats = {
    total: candidates.length,
    pendentes: 0,
    emAnalise: 0,
    entrevista: 0,
    aprovados: 0,
    rejeitados: 0,
    // Acumulador de contadores por categoria — precisa listar TODAS as
    // categorias válidas, caso contrário o dashboard mostra `undefined`
    // quando algum candidato é de uma categoria faltante no init.
    // O TS valida exaustividade pelo tipo `AdminStats.porCategoria`.
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
    },
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

export async function fetchAnalytics(
  token?: string | null,
  prefetched?: AdminCandidate[],
): Promise<DashboardAnalytics> {
  // Reuse pre-fetched candidates when caller already has them — otherwise
  // fetch once and reuse for both the analytics body and the stats build.
  const candidates = prefetched ?? (await fetchCandidates(undefined, token));
  const stats = await fetchStats(token, candidates);

  const decided = stats.aprovados + stats.rejeitados;
  const taxaAprovacao = decided > 0 ? Math.round((stats.aprovados / decided) * 100) : 0;
  const taxaRejeicao = decided > 0 ? Math.round((stats.rejeitados / decided) * 100) : 0;

  // Age average — parse nascimento as UTC midnight to avoid local-tz off-by-one
  const now = new Date();
  const ages = candidates
    .map((c) => {
      if (!c.nascimento) return 0;
      const birth = new Date(c.nascimento + 'T00:00:00Z');
      if (Number.isNaN(birth.getTime())) return 0;
      let age = now.getUTCFullYear() - birth.getUTCFullYear();
      const m = now.getUTCMonth() - birth.getUTCMonth();
      if (m < 0 || (m === 0 && now.getUTCDate() < birth.getUTCDate())) age--;
      return age;
    })
    .filter((a) => a > 0 && a < 100);
  const mediaIdade = ages.length > 0 ? Math.round(ages.reduce((a, b) => a + b, 0) / ages.length) : 0;

  // By state
  const estadoMap: Record<string, number> = {};
  for (const c of candidates) estadoMap[c.estado] = (estadoMap[c.estado] ?? 0) + 1;
  const porEstado = Object.entries(estadoMap)
    .map(([estado, total]) => ({ estado, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  // Top specialties
  const espMap: Record<string, number> = {};
  for (const c of candidates) espMap[c.especialidade] = (espMap[c.especialidade] ?? 0) + 1;
  const topEspecialidades = Object.entries(espMap)
    .map(([especialidade, total]) => ({ especialidade, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);

  return {
    stats,
    taxaAprovacao,
    taxaRejeicao,
    mediaIdade,
    comTelemedicina: 0,
    porEstado,
    porExperiencia: [],
    porSemana: [],
    topEspecialidades,
  };
}

/* ------------------------------------------------------------------ */
/* AI Analysis                                                         */
/* ------------------------------------------------------------------ */

export async function saveCandidateAIAnalysis(
  candidateId: string,
  analysis: Omit<AIAnalysisResult, 'analyzedAt'>,
  token?: string | null,
): Promise<AIAnalysisResult> {
  const api = getApi();

  const { data } = await api.post(
    `/api/admin/doctors/${candidateId}/ai-analysis`,
    {
      score: analysis.score,
      resumo: analysis.resumo,
      pontosFortes: analysis.pontosFortes,
      pontosFracos: analysis.pontosFracos,
      recomendacao: analysis.recomendacao,
      recomendacaoTexto: analysis.recomendacaoTexto,
      model: 'gpt-4o-mini',
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
    analyzedAt: data.analyzedAt ?? data.createdAt,
  };
}

/**
 * Bulk-fetch all latest AI analyses as a `Map<doctorId, AIAnalysisResult>`.
 *
 * Used by the candidates list page to hydrate scores on every row in ONE
 * request, instead of N individual `GET /api/admin/doctors/{id}/ai-analysis`
 * calls. Returns an empty map on failure so the caller can degrade gracefully.
 */
export async function fetchAllAIAnalyses(
  token?: string | null,
): Promise<Map<string, AIAnalysisResult>> {
  const api = getApi();
  const map = new Map<string, AIAnalysisResult>();
  try {
    const { data } = await api.get('/api/admin/doctors/ai-analyses', {
      headers: authHeaders(token),
    });
    if (!Array.isArray(data)) return map;
    for (const raw of data) {
      const id = raw?.doctorProfileId;
      if (typeof id !== 'string' || id.length === 0) continue;
      map.set(id, {
        score: Number(raw.score) || 0,
        resumo: raw.resumo ?? '',
        pontosFortes: Array.isArray(raw.pontosFortes) ? raw.pontosFortes : [],
        pontosFracos: Array.isArray(raw.pontosFracos) ? raw.pontosFracos : [],
        recomendacao: raw.recomendacao,
        recomendacaoTexto: raw.recomendacaoTexto ?? '',
        analyzedAt: raw.analyzedAt ?? raw.createdAt ?? new Date().toISOString(),
      });
    }
  } catch (err) {
    // Best-effort: log in dev but never break the list page.
    if (isDev) console.warn('[admin-api] fetchAllAIAnalyses failed:', err);
  }
  return map;
}

export async function fetchAIStats(
  token?: string | null,
  prefetched?: AdminCandidate[],
) {
  const api = getApi();

  const { data } = await api.get('/api/admin/doctors/ai-analyses/stats', {
    headers: authHeaders(token),
  });

  // Backend returns distribuicaoScore as a dict; frontend components
  // consume it as an array of { faixa, total }.
  const dist = (data.distribuicaoScore ?? {}) as Record<string, number>;
  const distribuicaoScore = ['0-39', '40-59', '60-79', '80-100'].map((faixa) => ({
    faixa,
    total: dist[faixa] ?? 0,
  }));

  // semAnalise = total candidates - already-analyzed. Reuse the pre-fetched
  // list when available to avoid re-hitting /api/admin/doctors. If the
  // caller didn't provide a list, default to 0 — the dashboard will compute
  // it itself once it has the candidates loaded.
  const totalAnalisados = data.totalAnalisados ?? 0;
  const semAnalise = prefetched
    ? Math.max(0, prefetched.length - totalAnalisados)
    : 0;

  return {
    totalAnalisados,
    semAnalise,
    scoreMedio: data.scoreMedio ?? 0,
    porRecomendacao: data.porRecomendacao ?? {
      aprovar: 0,
      entrevistar: 0,
      analisar_mais: 0,
      rejeitar: 0,
    },
    distribuicaoScore,
  };
}
