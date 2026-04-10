// Categorias profissionais suportadas no banco de talentos.
//
// Todas são profissões de saúde de nível superior com regulamentação ativa
// para telemedicina/teleatendimento no Brasil (2020-2025). Adicionar uma
// nova categoria aqui cascateia via TypeScript para:
//   - lib/constants.ts          (especialidades + COUNCIL_LABEL_MAP)
//   - lib/validators.ts         (enum do step 2)
//   - lib/admin-api.ts          (VALID_CATEGORIES + GRADUATION_BY_CATEGORY + inferências)
//   - lib/candidate-store.ts    (mocks + stats agregadas)
//   - pages/CadastroPage.tsx    (categoryOptions)
//   - components/admin/candidates/CandidatesFilterBar.tsx (filtro)
//   - components/sections/Hero.tsx (cards de landing)
//
// Sem esquecer nenhum desses locais, o TS vai quebrar o build.
export type ProfessionalCategory =
  | 'medico'
  | 'enfermeiro'
  | 'dentista'
  | 'psicologo'
  | 'nutricionista'
  | 'fisioterapeuta'
  | 'fonoaudiologo'
  | 'terapeuta_ocupacional'
  | 'farmaceutico'
  | 'biomedico'
  | 'educador_fisico'
  | 'assistente_social';

export type Gender = 'masculino' | 'feminino' | 'nao_binario' | 'prefiro_nao_informar';

export type ExperienceYears = 'menos_1' | '1_3' | '3_5' | '5_10' | 'mais_10';

export type TelemedicineExperience = 'sim' | 'nao';

export interface CandidateFormData {
  // Step 0: Acesso (novo) — definido ANTES dos dados pessoais.
  // O médico escolhe um dos dois caminhos:
  //   a) email + senha + confirmarSenha (senha tradicional)
  //   b) googleIdToken (login via Google)
  // O backend rejeita se nenhum dos dois for enviado.
  senha?: string;
  confirmarSenha?: string;
  googleIdToken?: string;
  // Nome e email quando vindos do Google são pré-preenchidos e bloqueados
  // na UI — essa flag marca a origem para a UI saber se deve travar os campos
  // de "Dados Pessoais". Não é enviada ao backend.
  viaGoogle?: boolean;

  // Step 1: Personal
  nome: string;
  cpf: string;
  nascimento: string;
  email: string;
  telefone: string;
  genero?: Gender;
  cep: string;
  estado: string;
  cidade: string;
  bairro?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;

  // Step 2: Professional
  categoria: ProfessionalCategory;
  conselho: string;
  ufRegistro: string;
  especialidade: string;
  outraEspecialidade?: string;
  anosExperiencia: ExperienceYears;
  expTelemedicina?: TelemedicineExperience;
  sobre?: string;

  // Certificado A1 (ICP-Brasil .pfx) — obrigatório para assinar prescrições
  // no app. Aqui no cadastro só perguntamos se a pessoa já possui; o upload
  // do .pfx será feito depois, no menu de configurações do app do médico.
  possuiCertificadoA1: 'sim' | 'nao';

  // Step 3: Academic
  graduacao: string;
  universidade: string;
  anoConclusao: number;
  posGraduacao?: string;
  residencia?: string;

  // Step 4: Consent
  consentimentoLGPD: boolean;
  consentimentoIA: boolean;
}

export interface ApiResponse {
  id: string;
  protocolo: string;
  message: string;
}
