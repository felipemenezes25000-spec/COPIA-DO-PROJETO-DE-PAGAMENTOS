import { z } from 'zod';

// ---------- CPF Validation Algorithm ----------

function isValidCPF(cpf: string): boolean {
  const digits = cpf.replace(/\D/g, '');

  if (digits.length !== 11) return false;

  // Reject known invalid sequences (all same digit)
  if (/^(\d)\1{10}$/.test(digits)) return false;

  // First check digit
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(digits[i], 10) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10) remainder = 0;
  if (remainder !== parseInt(digits[9], 10)) return false;

  // Second check digit
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(digits[i], 10) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10) remainder = 0;
  if (remainder !== parseInt(digits[10], 10)) return false;

  return true;
}

// ---------- Age check ----------
//
// ATENÇÃO ao parser: `new Date("2008-04-08")` interpreta a string como
// UTC midnight. Em timezones negativas (Brasil é UTC-3) isso vira
// "2008-04-07 21:00 local" — e `birth.getDate()` passa a retornar 7 em
// vez de 8, causando erro de 1 dia exatamente na borda do aniversário.
// O `<input type="date">` devolve sempre "yyyy-mm-dd" — parseamos os
// componentes manualmente e construímos a data no fuso local, evitando
// a ida-e-volta por UTC.
function isAtLeast18(dateStr: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!match) return false;
  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10); // 1-12
  const day = parseInt(match[3], 10);
  // Sanity check — rejeita datas inválidas tipo 2008-02-30 ou 2008-13-01.
  const birth = new Date(year, month - 1, day);
  if (
    birth.getFullYear() !== year ||
    birth.getMonth() !== month - 1 ||
    birth.getDate() !== day
  ) {
    return false;
  }

  const today = new Date();
  let age = today.getFullYear() - year;
  const monthDiff = today.getMonth() - (month - 1);
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < day)) {
    age--;
  }
  return age >= 18;
}

// ---------- Step 0: Acesso ----------
//
// O candidato escolhe entre "senha própria" e "Google".
// Quando `googleIdToken` existe, senha/confirmarSenha são IGNORADAS (o backend
// valida o token e gera um hash aleatório internamente). Quando não existe,
// senha+confirmação viram obrigatórias e precisam bater com a policy do backend.
//
// Mesma policy do backend (HrDoctorOnboardingRequestValidator):
//   8+ chars · 1 maiúscula · 1 minúscula · 1 dígito · 1 caractere especial
const PASSWORD_POLICY_MESSAGE =
  'A senha deve ter 8+ caracteres com maiúscula, minúscula, número e símbolo.';

function passwordMeetsPolicy(value: string): boolean {
  if (value.length < 8) return false;
  if (!/[A-Z]/.test(value)) return false;
  if (!/[a-z]/.test(value)) return false;
  if (!/\d/.test(value)) return false;
  if (!/[^A-Za-z0-9]/.test(value)) return false;
  return true;
}

export const step0Schema = z
  .object({
    email: z.string().email('E-mail inválido'),
    senha: z.string().optional(),
    confirmarSenha: z.string().optional(),
    googleIdToken: z.string().optional(),
    viaGoogle: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    // Caminho Google: nada mais a validar — já temos email do payload e o
    // backend re-valida o token.
    if (data.googleIdToken && data.googleIdToken.length > 0) return;

    // Caminho senha: exige senha válida + confirmação batendo.
    if (!data.senha || data.senha.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['senha'],
        message: 'Senha é obrigatória',
      });
      return;
    }
    if (!passwordMeetsPolicy(data.senha)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['senha'],
        message: PASSWORD_POLICY_MESSAGE,
      });
    }
    if (!data.confirmarSenha || data.confirmarSenha.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['confirmarSenha'],
        message: 'Confirme a senha',
      });
    } else if (data.senha !== data.confirmarSenha) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['confirmarSenha'],
        message: 'As senhas não coincidem',
      });
    }
  });

// ---------- Helpers ----------
//
// Native `<select>` renderiza o placeholder com `value=""`. Quando o candidato
// NÃO escolhe nada, o form state pode ficar como `""` (string vazia) em vez de
// `undefined`. Zod é estrito: `.optional()` só aceita `undefined`, e enums
// exigem um dos literais — empty string cai como "Invalid enum value ..." OU
// passa batido no `required_error` (que só dispara quando o valor é
// `undefined`). Resultado: o candidato clica "Próximo" e nada acontece,
// porque a validação falha em um campo que, do ponto de vista dele, está
// "em branco" — mas na prática contém `""`, um estado que nenhuma das
// branches do schema aceita.
//
// Este preprocess normaliza "" (e null, que pode vir de JSON.parse ao
// restaurar do sessionStorage) para `undefined` antes do Zod ver o valor.
// Assim `.optional()` funciona de verdade, e `required_error` dispara com
// a mensagem customizada em vez do erro genérico "Invalid enum value".
const emptyToUndefined = (v: unknown) =>
  v === '' || v === null ? undefined : v;

// ---------- Step 1: Dados Pessoais ----------

export const step1Schema = z.object({
  nome: z
    .string()
    .trim()
    .min(5, 'Nome deve ter pelo menos 5 caracteres')
    // Nome civil brasileiro aceita: letras (inclusive acentuadas), espaços,
    // apóstrofos ("D'Angelo", "D'Ávila"), hífens ("Maria-Clara", "Sousa-Pinto")
    // e pontos após abreviação ("Mário Jr.", "Ana M. Silva"). O regex antigo
    // só aceitava letras e espaços — reprovava candidatos legítimos e nem
    // chegava a reportar erro claro, porque o usuário via "nome inválido"
    // sem pista do que estava errado. Continuamos rejeitando dígitos e
    // caracteres especiais aleatórios (@, #, /, etc.).
    .regex(
      /^[A-Za-zÀ-ÖØ-öø-ÿ\s'.-]+$/,
      'Nome deve conter apenas letras, espaços, apóstrofo, hífen e ponto',
    ),
  cpf: z
    .string()
    .min(14, 'CPF inválido')
    .refine((val) => isValidCPF(val), { message: 'CPF inválido' }),
  nascimento: z
    .string()
    .min(1, 'Data de nascimento é obrigatória')
    .refine((val) => isAtLeast18(val), {
      message: 'Você deve ter pelo menos 18 anos',
    }),
  email: z.string().email('E-mail inválido'),
  telefone: z.string().min(14, 'Telefone inválido'),
  genero: z.preprocess(
    emptyToUndefined,
    z
      .enum(['masculino', 'feminino', 'nao_binario', 'prefiro_nao_informar'])
      .optional(),
  ),
  cep: z.string().min(9, 'CEP inválido'),
  estado: z.string().length(2, 'Selecione um estado'),
  cidade: z.string().min(2, 'Cidade é obrigatória'),
  bairro: z.string().optional(),
  logradouro: z.string().optional(),
  numero: z.string().optional(),
  complemento: z.string().optional(),
});

// ---------- Step 2: Dados Profissionais ----------

// Base ZodObject sem o superRefine — usado pelo `fullSchema.merge(...)` em
// CadastroPage.tsx, já que `.merge()` só existe em ZodObject (o superRefine
// transforma o schema em ZodEffects e quebra o merge).
export const step2ObjectSchema = z
  .object({
    // IMPORTANTE: mantenha esta lista em sincronia com `ProfessionalCategory`
    // em types/index.ts. Se adicionar uma categoria nova lá, adicione aqui
    // também — caso contrário o zod rejeita a opção no runtime mesmo com o
    // TS feliz, e o candidato vê "Invalid enum value" ao clicar "Próximo".
    categoria: z.preprocess(
      emptyToUndefined,
      z.enum(
        [
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
        ],
        { required_error: 'Selecione uma categoria' },
      ),
    ),
    conselho: z
      .string({ required_error: 'Número do conselho é obrigatório' })
      .trim()
      .min(3, 'Número do conselho é obrigatório'),
    ufRegistro: z
      .string({ required_error: 'Selecione a UF do registro' })
      .length(2, 'Selecione a UF do registro'),
    especialidade: z
      .string({ required_error: 'Selecione uma especialidade' })
      .min(1, 'Selecione uma especialidade'),
    outraEspecialidade: z.string().trim().optional(),
    anosExperiencia: z.preprocess(
      emptyToUndefined,
      z.enum(['menos_1', '1_3', '3_5', '5_10', 'mais_10'], {
        required_error: 'Selecione os anos de experiência',
      }),
    ),
    expTelemedicina: z.preprocess(
      emptyToUndefined,
      z.enum(['sim', 'nao']).optional(),
    ),
    sobre: z.string().max(1000, 'Máximo de 1000 caracteres').optional(),
    possuiCertificadoA1: z.preprocess(
      emptyToUndefined,
      z.enum(['sim', 'nao'], {
        required_error: 'Informe se você possui certificado digital A1',
      }),
    ),
  });

// Schema usado de fato pela validação do step 2 — envolve o objeto base
// com um superRefine que torna `outraEspecialidade` obrigatório se a
// especialidade escolhida for "outra". Sem isto, o cadastro ia adiante com
// `outraEspecialidade` vazio e o backend recebia `especialidade = 'outra'`
// sem detalhes — gerando um perfil inútil para triagem.
export const step2Schema = step2ObjectSchema.superRefine((data, ctx) => {
  if (
    data.especialidade === 'outra' &&
    (!data.outraEspecialidade || data.outraEspecialidade.length < 2)
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['outraEspecialidade'],
      message: 'Informe sua especialidade',
    });
  }
});

// ---------- Step 3: Formação Acadêmica ----------

// Ano máximo dinâmico: evita que o schema precise ser editado todo ano-novo.
// Usamos o ano corrente em vez de um literal hardcoded.
const CURRENT_YEAR = new Date().getFullYear();

export const step3Schema = z.object({
  graduacao: z.string().min(3, 'Informe o curso de graduação'),
  universidade: z.string().min(3, 'Informe a universidade'),
  anoConclusao: z.coerce
    .number()
    .min(1970, 'Ano inválido')
    .max(CURRENT_YEAR, 'Ano inválido'),
  posGraduacao: z.string().optional(),
  residencia: z.string().optional(),
});

// ---------- Step 5: Consentimento ----------

export const step5Schema = z.object({
  consentimentoLGPD: z.literal(true, {
    errorMap: () => ({
      message: 'Você deve aceitar os termos de privacidade (LGPD)',
    }),
  }),
  consentimentoIA: z.literal(true, {
    errorMap: () => ({
      message: 'Você deve consentir com o uso de IA na triagem',
    }),
  }),
});
