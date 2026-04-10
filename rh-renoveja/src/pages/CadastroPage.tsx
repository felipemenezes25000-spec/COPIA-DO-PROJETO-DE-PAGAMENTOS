import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, type DefaultValues } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  Shield,
  FileCheck,
  Sparkles,
  Eye,
  EyeOff,
  CheckCircle2,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google';

import { generateBio, isAIAvailable } from '../lib/openai';

import { Header } from '../components/layout/Header';
import { Footer } from '../components/layout/Footer';
import { Container } from '../components/layout/Container';
import { StepIndicator } from '../components/ui/StepIndicator';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Textarea } from '../components/ui/Textarea';
import { Checkbox } from '../components/ui/Checkbox';
import { useToast } from '../components/ui/Toast';

import { useFormPersist } from '../hooks/useFormPersist';
import { useCepLookup } from '../hooks/useCepLookup';

import { submitCandidate } from '../lib/api';
import { maskCPF, maskPhone, maskCEP } from '../lib/masks';
import {
  step0Schema,
  step1Schema,
  step2Schema,
  step2ObjectSchema,
  step3Schema,
  step5Schema,
} from '../lib/validators';
import {
  GENDER_OPTIONS,
  UF_LIST,
  EXPERIENCE_OPTIONS,
  TELEMEDICINE_OPTIONS,
  COUNCIL_LABEL_MAP,
  getSpecialtiesByCategory,
} from '../lib/constants';

import type { CandidateFormData } from '../types';

// ---------------------------------------------------------------------------
// Combined schema (used for final validation / default values)
// ---------------------------------------------------------------------------

// step0 e step2 são ZodEffects (por causa do superRefine) — merge direto não
// funciona porque `.merge()` só existe em ZodObject. Usamos o objeto base
// (step2ObjectSchema) para compor o tipo final e mantemos o step2Schema
// "cru" (com refine) apenas na validação per-step via stepSchemas[].
const fullSchema = step1Schema
  .merge(step2ObjectSchema)
  .merge(step3Schema)
  .merge(step5Schema);

type FormValues = z.infer<typeof fullSchema> & z.infer<typeof step0Schema>;

// ---------------------------------------------------------------------------
// Step schemas array — used to validate per-step
// ---------------------------------------------------------------------------

const stepSchemas = [
  step0Schema,
  step1Schema,
  step2Schema,
  step3Schema,
  step5Schema,
];

// Field names per step (for trigger)
const stepFields: (keyof FormValues)[][] = [
  ['email', 'senha', 'confirmarSenha', 'googleIdToken'],
  ['nome', 'cpf', 'nascimento', 'email', 'telefone', 'genero', 'cep', 'estado', 'cidade', 'bairro', 'logradouro', 'numero', 'complemento'],
  ['categoria', 'conselho', 'ufRegistro', 'especialidade', 'outraEspecialidade', 'anosExperiencia', 'expTelemedicina', 'sobre', 'possuiCertificadoA1'],
  ['graduacao', 'universidade', 'anoConclusao', 'posGraduacao', 'residencia'],
  ['consentimentoLGPD', 'consentimentoIA'],
];

const STEP_LABELS = [
  'Acesso',
  'Dados Pessoais',
  'Profissional',
  'Formação',
  'Consentimento',
];

const STEP_DESCRIPTIONS = [
  'Crie uma senha ou entre com Google',
  'Informe seus dados pessoais e endereço',
  'Conte-nos sobre sua atuação profissional',
  'Detalhe sua formação acadêmica',
  'Revise e aceite os termos para finalizar',
];

const LAST_STEP = 4;

// Flag runtime: Google só aparece se o VITE_GOOGLE_CLIENT_ID estiver setado.
// Sem ele, o GoogleOAuthProvider não envolve a árvore e useGoogleLogin
// lançaria — usamos a flag para esconder o botão e não instanciar o hook.
const GOOGLE_ENABLED = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function CadastroPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { loading: cepLoading, lookup: cepLookup } = useCepLookup();

  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatingBio, setGeneratingBio] = useState(false);

  // The Zod schema types some fields as literal `true` (consents) and
  // non-null `File` (uploads), but the form must initialize with `false`
  // and `null` before user interaction. We use a single cast to
  // `DefaultValues<FormValues>` (RHF's own partial-initial-values type)
  // instead of the unsafe double `as unknown as FormValues`.
  const defaultFormValues = {
    nome: '',
    cpf: '',
    nascimento: '',
    email: '',
    telefone: '',
    genero: undefined,
    cep: '',
    estado: '',
    cidade: '',
    bairro: '',
    logradouro: '',
    numero: '',
    complemento: '',
    categoria: undefined,
    conselho: '',
    ufRegistro: '',
    especialidade: '',
    outraEspecialidade: '',
    anosExperiencia: undefined,
    expTelemedicina: undefined,
    possuiCertificadoA1: undefined,
    sobre: '',
    graduacao: '',
    universidade: '',
    anoConclusao: undefined,
    posGraduacao: '',
    residencia: '',
    // Consents are `z.literal(true)` in the schema — omitted here so RHF
    // sees them as undefined (unchecked) until the user ticks the boxes.
    consentimentoLGPD: undefined,
    consentimentoIA: undefined,
  } as DefaultValues<FormValues>;

  const form = useForm<FormValues>({
    resolver: zodResolver(stepSchemas[currentStep]),
    defaultValues: defaultFormValues,
    mode: 'onTouched',
  });

  const {
    register,
    handleSubmit,
    trigger,
    getValues,
    setValue,
    watch,
    formState: { errors },
    reset,
  } = form;

  // Persist form data
  //
  // Passamos `onRestoreStep` para que, ao restaurar do sessionStorage, o
  // candidato volte ao step em que estava — não ao step 0 com os dados de
  // steps futuros já preenchidos (comportamento antigo era confuso).
  // Clamp em LAST_STEP é defensivo: se o sessionStorage foi gravado por uma
  // versão anterior do app com mais steps, evitamos cair num índice inválido.
  const { clear: clearStorage } = useFormPersist(
    getValues as () => Record<string, unknown>,
    reset as (values: Record<string, unknown>) => void,
    {
      currentStep,
      onRestoreStep: (step) =>
        setCurrentStep(Math.min(Math.max(step, 0), LAST_STEP)),
    },
  );

  // Scroll to top on step change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentStep]);

  // Watched values
  const watchCategoria = watch('categoria');
  const watchEspecialidade = watch('especialidade');
  const watchCep = watch('cep');
  const watchConsentimentoLGPD = watch('consentimentoLGPD');
  const watchConsentimentoIA = watch('consentimentoIA');
  const watchSobre = watch('sobre');
  const watchViaGoogle = watch('viaGoogle' as keyof FormValues) as boolean | undefined;
  const watchSenha = watch('senha' as keyof FormValues) as string | undefined;

  // Password visibility toggles (step Acesso)
  const [showSenha, setShowSenha] = useState(false);
  const [showConfirmarSenha, setShowConfirmarSenha] = useState(false);

  // Handler para o componente <GoogleLogin />. O `credential` é um JWT
  // id_token assinado pelo Google — enviamos direto para o backend em
  // `googleIdToken` (backend valida via GoogleJsonWebSignature.ValidateAsync).
  // Para pré-preencher nome/email na UI, decodificamos o payload do JWT
  // localmente (sem verificar assinatura — isso é papel do backend).
  const handleGoogleCredential = (credentialResponse: CredentialResponse) => {
    const credential = credentialResponse.credential;
    if (!credential) {
      toast('error', 'Falha ao receber credencial do Google.');
      return;
    }
    try {
      // Decode JWT payload (middle segment, base64url). Não validamos
      // assinatura — backend re-valida antes de aceitar o cadastro.
      const parts = credential.split('.');
      if (parts.length !== 3) throw new Error('invalid jwt');
      const payloadJson = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
      const payload = JSON.parse(payloadJson) as {
        email?: string;
        name?: string;
        email_verified?: boolean;
      };
      if (!payload.email || payload.email_verified === false) {
        toast('error', 'Não foi possível verificar seu e-mail no Google.');
        return;
      }
      setValue('email', payload.email, { shouldValidate: true });
      if (payload.name) {
        // O Google costuma devolver o nome com títulos profissionais
        // ("Dra. Ana ...", "Dr. João ...", "Prof. Maria ..."). O schema
        // de validação (step1Schema) exige apenas letras e espaços, então
        // o ponto em "Dra." reprova o campo e trava o candidato no step.
        // Removemos títulos comuns e qualquer pontuação residual antes
        // de preencher o campo.
        const cleanedName = payload.name
          .replace(/^\s*(dra?|prof(a|essora|essor)?|sra?|srta)\.?\s+/i, '')
          .replace(/[.,;:]/g, '')
          .replace(/\s+/g, ' ')
          .trim();
        setValue('nome', cleanedName, { shouldValidate: true });
      }
      setValue('viaGoogle' as keyof FormValues, true as never);
      setValue('googleIdToken' as keyof FormValues, credential as never);
      // Limpa senha/confirmarSenha — no caminho Google o backend ignora esses
      // campos, mas deixar valores antigos causaria erro de validação client-side.
      setValue('senha' as keyof FormValues, '' as never);
      setValue('confirmarSenha' as keyof FormValues, '' as never);
      toast('success', `Conta Google vinculada: ${payload.email}`);
    } catch {
      toast('error', 'Credencial do Google em formato inválido.');
    }
  };

  const handleDisconnectGoogle = () => {
    setValue('viaGoogle' as keyof FormValues, false as never);
    setValue('googleIdToken' as keyof FormValues, '' as never);
    setValue('nome', '', { shouldValidate: false });
    setValue('email', '', { shouldValidate: false });
  };

  // CEP auto-fill
  const handleCepChange = useCallback(
    async (maskedValue: string) => {
      if (maskedValue.length === 9) {
        const result = await cepLookup(maskedValue);
        if (result) {
          setValue('estado', result.uf, { shouldValidate: true });
          setValue('cidade', result.localidade, { shouldValidate: true });
          if (result.bairro) setValue('bairro', result.bairro);
          if (result.logradouro) setValue('logradouro', result.logradouro);
        }
      }
    },
    [cepLookup, setValue],
  );

  // Navigation
  //
  // IMPORTANTE: `trigger(fields, { shouldFocus: true })` é o que faz o botão
  // "Próximo" DEIXAR DE PARECER QUEBRADO no mobile. Sem o shouldFocus, quando
  // um campo obrigatório acima da dobra falha, a validação não avança mas o
  // candidato — que está no final da tela porque acabou de preencher "Sobre
  // você" — não vê a mensagem de erro nenhuma, e parece que clicar em
  // "Próximo" simplesmente não faz nada. Com shouldFocus:true, a RHF foca no
  // primeiro input inválido, o navegador rola até ele, e o candidato enxerga
  // exatamente o que falta preencher. A toast é um reforço para casos em que
  // o campo focado seja um <select> nativo que não rola suavemente em alguns
  // browsers mobile. Bug relatado em 2026-04-08 via WhatsApp por candidata
  // que clicava em "Próximo" no step de Dados Profissionais e não avançava.
  const handleNext = async () => {
    const fields = stepFields[currentStep];
    const valid = await trigger(fields, { shouldFocus: true });
    if (valid) {
      setCurrentStep((prev) => Math.min(prev + 1, LAST_STEP));
      return;
    }
    toast(
      'error',
      'Há campos obrigatórios não preenchidos. Role para cima e revise os campos destacados em vermelho.',
    );
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  // Submit
  const onSubmit = async () => {
    const fields = stepFields[currentStep];
    const valid = await trigger(fields, { shouldFocus: true });
    if (!valid) {
      toast(
        'error',
        'Revise os campos destacados em vermelho antes de enviar.',
      );
      return;
    }

    setIsSubmitting(true);
    try {
      // After `trigger(fields)` on the final step, all schema invariants
      // hold, so FormValues is assignable to CandidateFormData via a
      // single narrowing cast (no `unknown` hop required).
      const data = getValues() as CandidateFormData;
      const response = await submitCandidate(data);
      clearStorage();
      navigate('/sucesso', {
        state: {
          nome: data.nome,
          email: data.email,
          protocolo: response.protocolo,
        },
      });
    } catch (err) {
      // Distingue erros de rede/HTTP do backend para dar feedback claro ao
      // candidato e evitar repetição cega que só consome o rate-limit.
      // Caso real visto em prod (07/04/2026): backend respondeu 405 ao POST
      // /api/doctors/from-hr porque o deploy do backend estava atrás do
      // frontend; a mensagem genérica anterior escondeu a causa.
      let message = 'Ocorreu um erro ao enviar o cadastro. Tente novamente.';
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        if (status === undefined) {
          message = 'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.';
        } else if (status === 405 || status === 404) {
          message = 'Serviço de cadastro temporariamente indisponível. Por favor, tente novamente em alguns minutos.';
        } else if (status === 409) {
          message = 'Este CPF ou e-mail já está cadastrado em nossa base.';
        } else if (status === 422 || status === 400) {
          const apiMsg = (err.response?.data as { message?: string } | undefined)?.message;
          message = apiMsg ?? 'Dados inválidos. Revise os campos e tente novamente.';
        } else if (status === 429) {
          message = 'Muitas tentativas. Aguarde um minuto e tente novamente.';
        } else if (status >= 500) {
          message = 'Estamos com instabilidade no servidor. Tente novamente em alguns minutos.';
        }
      }
      toast('error', message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Generate bio with AI
  const handleGenerateBio = async () => {
    if (!watchCategoria || generatingBio) return;
    setGeneratingBio(true);
    try {
      const bio = await generateBio({
        categoria: watchCategoria,
        especialidade: watch('especialidade') || '',
        anosExperiencia: watch('anosExperiencia') || '',
        expTelemedicina: watch('expTelemedicina'),
        graduacao: watch('graduacao'),
        universidade: watch('universidade'),
        posGraduacao: watch('posGraduacao'),
        residencia: watch('residencia'),
      });
      setValue('sobre', bio, { shouldValidate: true });
      toast('success', 'Texto gerado com sucesso! Revise e edite como preferir.');
    } catch {
      toast('error', 'Não foi possível gerar o texto. Tente novamente.');
    } finally {
      setGeneratingBio(false);
    }
  };

  // Dynamic specialty options
  const specialtyOptions = watchCategoria
    ? getSpecialtiesByCategory(watchCategoria)
    : [];

  // Council label
  const councilLabel = watchCategoria
    ? `Nº do ${COUNCIL_LABEL_MAP[watchCategoria]}`
    : 'Nº do Conselho';

  // Category options — ordem pensada para a UX do dropdown: as 5 profissões
  // com maior volume histórico de cadastros primeiro (Médico, Enfermeiro,
  // Dentista, Psicólogo, Nutricionista), depois o restante em ordem
  // alfabética. A lista vive aqui (e não em constants.ts) porque é
  // puramente visual/de ordenação — o source of truth do que é aceito é o
  // tipo `ProfessionalCategory` e o schema zod em validators.ts.
  const categoryOptions = [
    { value: 'medico', label: 'Médico(a)' },
    { value: 'enfermeiro', label: 'Enfermeiro(a)' },
    { value: 'dentista', label: 'Dentista' },
    { value: 'psicologo', label: 'Psicólogo(a)' },
    { value: 'nutricionista', label: 'Nutricionista' },
    { value: 'fisioterapeuta', label: 'Fisioterapeuta' },
    { value: 'fonoaudiologo', label: 'Fonoaudiólogo(a)' },
    { value: 'terapeuta_ocupacional', label: 'Terapeuta Ocupacional' },
    { value: 'farmaceutico', label: 'Farmacêutico(a)' },
    { value: 'biomedico', label: 'Biomédico(a)' },
    { value: 'educador_fisico', label: 'Profissional de Educação Física' },
    { value: 'assistente_social', label: 'Assistente Social' },
  ];

  // -----------------------------------------------------------------------
  // Step renderers
  // -----------------------------------------------------------------------

  const renderStepAcesso = () => (
    <div className="space-y-5">
      {/* Google sign-in — aparece só se VITE_GOOGLE_CLIENT_ID estiver setado */}
      {GOOGLE_ENABLED && !watchViaGoogle && (
        <>
          <div className="flex flex-col items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm text-slate-600 text-center">
              Continue com sua conta Google — mais rápido e sem precisar criar senha.
            </p>
            <GoogleLogin
              onSuccess={handleGoogleCredential}
              onError={() => toast('error', 'Falha ao autenticar com Google.')}
              theme="outline"
              size="large"
              text="continue_with"
              shape="pill"
              locale="pt-BR"
            />
          </div>

          <div className="relative flex items-center py-1">
            <div className="flex-grow border-t border-slate-200" />
            <span className="mx-4 text-xs font-medium uppercase tracking-wider text-slate-400">
              ou
            </span>
            <div className="flex-grow border-t border-slate-200" />
          </div>
        </>
      )}

      {/* Conta Google já conectada */}
      {watchViaGoogle && (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-emerald-900">
              Conta Google conectada
            </p>
            <p className="text-sm text-emerald-800 break-all">
              {watch('email') || '—'}
            </p>
            <button
              type="button"
              onClick={handleDisconnectGoogle}
              className="mt-2 text-xs font-semibold text-emerald-700 hover:text-emerald-800 underline"
            >
              Usar outra conta
            </button>
          </div>
        </div>
      )}

      {/* Email — sempre visível. Bloqueado quando veio do Google. */}
      <div className="relative">
        <Input
          label="E-mail"
          type="email"
          placeholder="seu@email.com"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="next"
          error={errors.email?.message}
          disabled={watchViaGoogle === true}
          {...register('email')}
        />
      </div>

      {/* Senha + confirmação — escondidos no caminho Google */}
      {!watchViaGoogle && (
        <>
          <div className="relative">
            <Input
              label="Senha"
              type={showSenha ? 'text' : 'password'}
              placeholder="Mínimo 8 caracteres"
              autoComplete="new-password"
              enterKeyHint="next"
              error={errors.senha?.message}
              {...register('senha')}
            />
            <button
              type="button"
              onClick={() => setShowSenha((v) => !v)}
              className="absolute right-3 top-9 text-slate-400 hover:text-slate-600"
              aria-label={showSenha ? 'Esconder senha' : 'Mostrar senha'}
            >
              {showSenha ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>

          <div className="relative">
            <Input
              label="Confirmar senha"
              type={showConfirmarSenha ? 'text' : 'password'}
              placeholder="Repita a senha"
              autoComplete="new-password"
              enterKeyHint="done"
              error={errors.confirmarSenha?.message}
              {...register('confirmarSenha')}
            />
            <button
              type="button"
              onClick={() => setShowConfirmarSenha((v) => !v)}
              className="absolute right-3 top-9 text-slate-400 hover:text-slate-600"
              aria-label={showConfirmarSenha ? 'Esconder senha' : 'Mostrar senha'}
            >
              {showConfirmarSenha ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>

          {/* Dica visual da policy (só quando o candidato começa a digitar) */}
          {watchSenha && watchSenha.length > 0 && (
            <ul className="text-xs text-slate-500 space-y-1 pl-1">
              <li className={watchSenha.length >= 8 ? 'text-emerald-600' : ''}>
                • 8+ caracteres
              </li>
              <li className={/[A-Z]/.test(watchSenha) ? 'text-emerald-600' : ''}>
                • 1 letra maiúscula
              </li>
              <li className={/[a-z]/.test(watchSenha) ? 'text-emerald-600' : ''}>
                • 1 letra minúscula
              </li>
              <li className={/\d/.test(watchSenha) ? 'text-emerald-600' : ''}>
                • 1 número
              </li>
              <li className={/[^A-Za-z0-9]/.test(watchSenha) ? 'text-emerald-600' : ''}>
                • 1 símbolo (!@#$...)
              </li>
            </ul>
          )}
        </>
      )}
    </div>
  );

  const renderStepPessoal = () => (
    <div className="space-y-4">
      <Input
        label="Nome completo"
        placeholder="Seu nome completo"
        autoComplete="name"
        autoCapitalize="words"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="next"
        error={errors.nome?.message}
        {...register('nome')}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="CPF"
          placeholder="000.000.000-00"
          transform={maskCPF}
          inputMode="numeric"
          autoComplete="off"
          enterKeyHint="next"
          error={errors.cpf?.message}
          {...register('cpf')}
        />
        <Input
          label="Data de nascimento"
          type="date"
          autoComplete="bday"
          enterKeyHint="next"
          error={errors.nascimento?.message}
          {...register('nascimento')}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="E-mail"
          type="email"
          placeholder="seu@email.com"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="next"
          error={errors.email?.message}
          disabled={watchViaGoogle === true}
          {...register('email')}
        />
        {watchViaGoogle === true && (
          <p className="text-xs text-slate-500 -mt-2">
            E-mail vinculado à sua conta Google. Para trocar, volte à etapa
            "Acesso" e clique em "Usar outra conta".
          </p>
        )}
        <Input
          label="Telefone"
          placeholder="(00) 00000-0000"
          transform={maskPhone}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          enterKeyHint="next"
          error={errors.telefone?.message}
          {...register('telefone')}
        />
      </div>

      <Select
        label="Gênero (opcional)"
        placeholder="Selecione"
        options={GENDER_OPTIONS}
        error={errors.genero?.message}
        {...register('genero')}
      />

      <div className="relative">
        <Input
          label="CEP"
          placeholder="00000-000"
          transform={maskCEP}
          inputMode="numeric"
          autoComplete="postal-code"
          enterKeyHint="next"
          error={errors.cep?.message}
          {...register('cep', {
            onChange: (e) => handleCepChange(e.target.value),
          })}
        />
        {cepLoading && (
          <Loader2 className="absolute right-3 top-9 h-5 w-5 animate-spin text-primary-500" />
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Select
          label="Estado"
          placeholder="Selecione"
          options={UF_LIST}
          autoComplete="address-level1"
          error={errors.estado?.message}
          {...register('estado')}
        />
        <Input
          label="Cidade"
          placeholder="Sua cidade"
          autoComplete="address-level2"
          autoCapitalize="words"
          enterKeyHint="next"
          error={errors.cidade?.message}
          {...register('cidade')}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Bairro (opcional)"
          placeholder="Seu bairro"
          autoComplete="address-level3"
          autoCapitalize="words"
          enterKeyHint="next"
          error={errors.bairro?.message}
          {...register('bairro')}
        />
        <Input
          label="Número (opcional)"
          placeholder="Nº"
          inputMode="numeric"
          autoComplete="address-line2"
          enterKeyHint="next"
          error={errors.numero?.message}
          {...register('numero')}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Logradouro (opcional)"
          placeholder="Rua, Av..."
          autoComplete="address-line1"
          autoCapitalize="words"
          enterKeyHint="next"
          error={errors.logradouro?.message}
          {...register('logradouro')}
        />
        <Input
          label="Complemento (opcional)"
          placeholder="Apto, Bloco..."
          autoComplete="address-line3"
          enterKeyHint="done"
          error={errors.complemento?.message}
          {...register('complemento')}
        />
      </div>
    </div>
  );

  const renderStepProfissional = () => (
    <div className="space-y-4">
      <Select
        label="Categoria profissional"
        placeholder="Selecione sua categoria"
        options={categoryOptions}
        error={errors.categoria?.message}
        {...register('categoria', {
          onChange: () => {
            setValue('especialidade', '');
            setValue('outraEspecialidade', '');
          },
        })}
      />

      <Input
        label={councilLabel}
        placeholder="Número do registro"
        inputMode="numeric"
        autoComplete="off"
        enterKeyHint="next"
        error={errors.conselho?.message}
        {...register('conselho')}
      />

      <Select
        label="UF do Registro"
        placeholder="Selecione"
        options={UF_LIST}
        error={errors.ufRegistro?.message}
        {...register('ufRegistro')}
      />

      <Select
        label="Especialidade"
        placeholder="Selecione sua especialidade"
        options={specialtyOptions}
        error={errors.especialidade?.message}
        disabled={!watchCategoria}
        {...register('especialidade')}
      />

      {/*
        Campo "outraEspecialidade" tem duas funções:
         1. Quando `especialidade === 'outra'` é OBRIGATÓRIO — o candidato
            precisa escrever livremente o nome (validação em step2Schema).
         2. Quando o candidato já escolheu uma especialidade reconhecida, o
            campo aparece como "Sub-especialidade / área de atuação" OPCIONAL,
            deixando o RH refinar (ex.: Cardiologia + "Arritmologia e
            Eletrofisiologia", Pediatria + "Alergia Pediátrica"). Usamos o
            mesmo campo no backend para não quebrar o contrato do DTO.
      */}
      {watchEspecialidade && watchEspecialidade !== 'outra' && (
        <Input
          label="Sub-especialidade / área de atuação (opcional)"
          placeholder="Ex.: Arritmologia, Alergia Pediátrica, Ortopedia do Joelho..."
          error={errors.outraEspecialidade?.message}
          {...register('outraEspecialidade')}
        />
      )}
      {watchEspecialidade === 'outra' && (
        <Input
          label="Qual a sua especialidade?"
          placeholder="Informe sua especialidade"
          error={errors.outraEspecialidade?.message}
          {...register('outraEspecialidade')}
        />
      )}

      <Select
        label="Anos de experiência"
        placeholder="Selecione"
        options={EXPERIENCE_OPTIONS}
        error={errors.anosExperiencia?.message}
        {...register('anosExperiencia')}
      />

      <Select
        label="Experiência com telemedicina (opcional)"
        placeholder="Selecione"
        options={TELEMEDICINE_OPTIONS}
        error={errors.expTelemedicina?.message}
        {...register('expTelemedicina')}
      />

      {/*
        Certificado A1 (ICP-Brasil .pfx) — obrigatório para assinar prescrições
        no app (PAdES via iText7 + BouncyCastle). Aqui só perguntamos se a
        pessoa já tem; o upload do .pfx é feito depois no menu de configurações
        do app do médico. Manter aqui serve para o RH saber, na triagem, se o
        candidato já consegue assinar prescrições no dia 1 ou se precisará de
        orientação para emitir o certificado.
      */}
      <Select
        label="Possui certificado digital A1 (ICP-Brasil)?"
        placeholder="Selecione"
        options={[
          { value: 'sim', label: 'Sim, já possuo' },
          { value: 'nao', label: 'Não possuo ainda' },
        ]}
        error={errors.possuiCertificadoA1?.message}
        {...register('possuiCertificadoA1')}
      />

      <div className="space-y-2">
        <Textarea
          label="Sobre você (opcional)"
          placeholder="Conte-nos sobre sua trajetória profissional e motivações para atuar em telemedicina..."
          maxLength={1000}
          value={watchSobre ?? ''}
          error={errors.sobre?.message}
          {...register('sobre')}
        />
        {isAIAvailable() && (
          <button
            type="button"
            onClick={handleGenerateBio}
            disabled={generatingBio || !watchCategoria}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl bg-gradient-to-r from-purple-500 to-primary-500 text-white shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generatingBio ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Gerar com IA
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );

  const renderStepFormacao = () => (
    <div className="space-y-4">
      <Input
        label="Curso de graduação"
        placeholder="Ex.: Medicina, Psicologia, Nutrição"
        autoCapitalize="words"
        enterKeyHint="next"
        error={errors.graduacao?.message}
        {...register('graduacao')}
      />

      <Input
        label="Universidade"
        placeholder="Nome da instituição"
        autoCapitalize="words"
        enterKeyHint="next"
        error={errors.universidade?.message}
        {...register('universidade')}
      />

      <Input
        label="Ano de conclusão"
        type="number"
        min={1970}
        max={new Date().getFullYear()}
        placeholder="Ex.: 2015"
        inputMode="numeric"
        enterKeyHint="next"
        error={errors.anoConclusao?.message}
        {...register('anoConclusao')}
      />

      <Textarea
        label="Pós-graduação (opcional)"
        placeholder="Uma por linha"
        error={errors.posGraduacao?.message}
        {...register('posGraduacao')}
      />

      {watchCategoria === 'medico' && (
        <Textarea
          label="Residência médica (opcional)"
          placeholder="Informe a(s) residência(s) realizadas"
          error={errors.residencia?.message}
          {...register('residencia')}
        />
      )}
    </div>
  );

  const renderStepConsentimento = () => (
    <div className="space-y-6">
      {/* Privacy Policy Card */}
      <div className="flex items-start gap-4 rounded-xl border border-slate-200 bg-slate-50 p-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-100">
          <Shield className="h-5 w-5 text-primary-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-slate-800">Política de Privacidade</h3>
          <p className="text-sm text-slate-600 mt-1">
            Detalhamos como seus dados pessoais são coletados, utilizados, armazenados e
            protegidos pela RenoveJá Saúde LTDA, em conformidade com a LGPD.
          </p>
          <Link
            to="/privacidade"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-2 text-sm font-semibold text-primary-600 hover:text-primary-700 transition-colors"
          >
            Ler documento completo &rarr;
          </Link>
        </div>
      </div>

      {/* Terms Card */}
      <div className="flex items-start gap-4 rounded-xl border border-slate-200 bg-slate-50 p-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-100">
          <FileCheck className="h-5 w-5 text-primary-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-slate-800">Termo de Consentimento</h3>
          <p className="text-sm text-slate-600 mt-1">
            Termo para tratamento de dados pessoais conforme a Lei Geral de Proteção de Dados
            (Lei nº 13.709/2018).
          </p>
          <Link
            to="/termos"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-2 text-sm font-semibold text-primary-600 hover:text-primary-700 transition-colors"
          >
            Ler documento completo &rarr;
          </Link>
        </div>
      </div>

      {/* Checkboxes */}
      <div className="space-y-4 pt-2">
        <Checkbox
          label="Li e concordo com a Política de Privacidade e o Termo de Consentimento para tratamento dos meus dados pessoais pela RenoveJá Saúde LTDA, nos termos da LGPD."
          checked={watchConsentimentoLGPD === true}
          error={errors.consentimentoLGPD?.message}
          {...register('consentimentoLGPD')}
        />

        <Checkbox
          label="Autorizo a análise dos meus dados e documentos por inteligência artificial, ciente de que a decisão final será sempre realizada por análise humana (Art. 20, LGPD)."
          checked={watchConsentimentoIA === true}
          error={errors.consentimentoIA?.message}
          {...register('consentimentoIA')}
        />
      </div>
    </div>
  );

  const stepRenderers = [
    renderStepAcesso,
    renderStepPessoal,
    renderStepProfissional,
    renderStepFormacao,
    renderStepConsentimento,
  ];

  const isLastStep = currentStep === LAST_STEP;
  const canSubmit = isLastStep && watchConsentimentoLGPD === true && watchConsentimentoIA === true;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.2 }}
    >
      <Header />

      <main className="min-h-screen bg-slate-50 py-8 md:py-12">
        <Container className="max-w-[720px] mx-auto">
          {/* Step indicator */}
          <div className="mb-8">
            <StepIndicator steps={STEP_LABELS} currentStep={currentStep + 1} />
          </div>

          {/* Form card */}
          <form
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            className="bg-white rounded-2xl p-6 md:p-8 shadow-sm"
          >
            {/* Step title */}
            <div className="mb-6">
              <h1
                className="text-2xl font-bold text-slate-900"
                style={{ fontFamily: "'Poppins', sans-serif" }}
              >
                {STEP_LABELS[currentStep]}
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                {STEP_DESCRIPTIONS[currentStep]}
              </p>
            </div>

            {/* Step content with transitions */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.15 }}
              >
                {stepRenderers[currentStep]()}
              </motion.div>
            </AnimatePresence>

            {/*
              Navigation buttons.
              Mobile: empilha verticalmente (botão principal em cima, full-width
              para ser fácil de tocar com o polegar) e respeita o safe-area
              inferior do iOS via env(safe-area-inset-bottom). Desktop: volta ao
              layout horizontal original (Voltar à esquerda, Próximo à direita).
            */}
            <div
              className="flex flex-col-reverse md:flex-row md:items-center md:justify-between gap-3 mt-8 pt-6 border-t border-slate-100"
              style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
            >
              {currentStep > 0 ? (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleBack}
                  fullWidth
                  className="md:!w-auto"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Voltar
                </Button>
              ) : (
                <div className="hidden md:block" />
              )}

              {isLastStep ? (
                // NOTE: NÃO adicionar onClick={onSubmit} aqui. O botão já é
                // type="submit" e o <form onSubmit={handleSubmit(onSubmit)}>
                // cuida do envio. Ter os dois fazia a requisição disparar
                // duas vezes (onClick + submit do form) → cadastro duplicado.
                <Button
                  type="submit"
                  disabled={!canSubmit}
                  loading={isSubmitting}
                  fullWidth
                  className="md:!w-auto"
                >
                  Enviar Cadastro &#10003;
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleNext}
                  fullWidth
                  className="md:!w-auto"
                >
                  Próximo
                  <ArrowRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </form>
        </Container>
      </main>

      <Footer />
    </motion.div>
  );
}

export default CadastroPage;
