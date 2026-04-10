import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  registerDoctorFull,
  fetchSpecialties,
  fetchAddressByCep,
  type Specialty,
} from '@/services/doctorApi';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Loader2,
  Stethoscope,
  ArrowLeft,
  ArrowRight,
  User,
  Mail,
  Lock,
  Phone,
  CreditCard,
  MapPin,
  Building2,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  GraduationCap,
  Calendar,
} from 'lucide-react';

const UF_LIST = [
  'AC',
  'AL',
  'AM',
  'AP',
  'BA',
  'CE',
  'DF',
  'ES',
  'GO',
  'MA',
  'MG',
  'MS',
  'MT',
  'PA',
  'PB',
  'PE',
  'PI',
  'PR',
  'RJ',
  'RN',
  'RO',
  'RR',
  'RS',
  'SC',
  'SE',
  'SP',
  'TO',
];

type Step = 'personal' | 'professional' | 'academic' | 'address' | 'security';

const STEPS: {
  key: Step;
  label: string;
  icon: React.ElementType;
  description: string;
}[] = [
  {
    key: 'personal',
    label: 'Dados Pessoais',
    icon: User,
    description: 'Informações básicas de contato',
  },
  {
    key: 'professional',
    label: 'Dados Médicos',
    icon: Stethoscope,
    description: 'Registro profissional e especialidade',
  },
  {
    key: 'academic',
    label: 'Formação',
    icon: GraduationCap,
    description: 'Formação acadêmica e experiência',
  },
  {
    key: 'address',
    label: 'Endereço',
    icon: MapPin,
    description: 'Localização do consultório',
  },
  {
    key: 'security',
    label: 'Segurança',
    icon: Lock,
    description: 'Defina sua senha de acesso',
  },
];

/* ------------------------------------------------------------------ */
/* Máscaras                                                            */
/* ------------------------------------------------------------------ */

function maskCPF(value: string): string {
  return value
    .replace(/\D/g, '')
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 10) {
    return digits
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  }
  return digits
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2');
}

function maskCEP(value: string): string {
  return value
    .replace(/\D/g, '')
    .slice(0, 8)
    .replace(/(\d{5})(\d)/, '$1-$2');
}

/* ------------------------------------------------------------------ */
/* Validações                                                          */
/* ------------------------------------------------------------------ */

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidCPF(cpf: string): boolean {
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return false;
  // Rejeita sequências homogêneas (000..., 111..., ..., 999...)
  if (/^(\d)\1{10}$/.test(digits)) return false;

  // Primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(digits[i], 10) * (10 - i);
  let check = (sum * 10) % 11;
  if (check === 10) check = 0;
  if (check !== parseInt(digits[9], 10)) return false;

  // Segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(digits[i], 10) * (11 - i);
  check = (sum * 10) % 11;
  if (check === 10) check = 0;
  return check === parseInt(digits[10], 10);
}

function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, '');
  return digits.length === 10 || digits.length === 11;
}

/* ------------------------------------------------------------------ */
/* Componente                                                          */
/* ------------------------------------------------------------------ */

export default function DoctorRegister() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('personal');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    cpf: '',
    birthDate: '',
    gender: '',
    crm: '',
    crmState: '',
    specialtyId: '',
    rqe: '',
    professionalPhone: '',
    university: '',
    graduationYear: '',
    courses: '',
    hospitalsServices: '',
    cep: '',
    street: '',
    number: '',
    neighborhood: '',
    complement: '',
    city: '',
    state: '',
    professionalAddress: '',
    password: '',
    confirmPassword: '',
  });

  useEffect(() => {
    let cancelled = false;
    fetchSpecialties()
      .then((data) => {
        if (!cancelled) setSpecialties(data);
      })
      .catch((e) => {
        // Lista de especialidades vazia desnorteia o cadastro do médico — logar
        // ao menos em dev. UI mostra select vazio mas não trava o fluxo.
        if (import.meta.env.DEV)
          console.warn('[DoctorRegister] fetchSpecialties falhou:', e);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const markTouched = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleCepBlur = async () => {
    markTouched('cep');
    if (!form.cep || form.cep.replace(/\D/g, '').length < 8) return;
    try {
      const addr = await fetchAddressByCep(form.cep);
      if (addr) {
        setForm((prev) => ({
          ...prev,
          street: addr.street || prev.street,
          neighborhood: addr.neighborhood || prev.neighborhood,
          city: addr.city || prev.city,
          state: addr.state || prev.state,
        }));
      }
    } catch {
      // CEP lookup failure is non-critical — user can fill fields manually
    }
  };

  const currentIdx = STEPS.findIndex((s) => s.key === step);
  const currentStep = STEPS[currentIdx];
  const progressPct = ((currentIdx + 1) / STEPS.length) * 100;

  /** Lista de campos faltando no step atual (para mensagem clara) */
  const getMissingFields = (): string[] => {
    const missing: string[] = [];
    switch (step) {
      case 'personal':
        if (!form.name) missing.push('Nome');
        if (!form.email || !isValidEmail(form.email))
          missing.push('Email válido');
        if (!form.phone || !isValidPhone(form.phone))
          missing.push('Telefone válido');
        if (!form.cpf || !isValidCPF(form.cpf))
          missing.push('CPF (11 dígitos)');
        if (!form.birthDate) missing.push('Data de nascimento');
        break;
      case 'professional':
        if (!form.crm) missing.push('CRM');
        if (!form.crmState) missing.push('UF do CRM');
        if (!form.specialtyId) missing.push('Especialidade');
        break;
      case 'academic':
        // Campos opcionais — sem validação obrigatória
        break;
      case 'address':
        if (!form.street) missing.push('Rua');
        if (!form.number) missing.push('Número');
        if (!form.neighborhood) missing.push('Bairro');
        if (!form.city) missing.push('Cidade');
        if (!form.state) missing.push('UF');
        break;
      case 'security':
        if (!form.password || form.password.length < 8)
          missing.push('Senha (mín. 8 caracteres)');
        if (!form.confirmPassword) missing.push('Confirmação de senha');
        else if (form.password !== form.confirmPassword)
          missing.push('Senhas iguais');
        break;
    }
    return missing;
  };

  const canAdvance = () => getMissingFields().length === 0;

  const handleNext = () => {
    if (!canAdvance()) {
      // Marca todos os campos como touched para revelar erros inline
      const allFields = [
        'name',
        'email',
        'phone',
        'cpf',
        'birthDate',
        'crm',
        'crmState',
        'specialtyId',
        'street',
        'number',
        'neighborhood',
        'city',
        'state',
        'password',
        'confirmPassword',
      ];
      setTouched((prev) =>
        allFields.reduce((acc, f) => ({ ...acc, [f]: true }), prev)
      );
      toast.error(`Falta preencher: ${getMissingFields().join(', ')}`);
      return;
    }
    const nextIdx = currentIdx + 1;
    if (nextIdx < STEPS.length) setStep(STEPS[nextIdx].key);
  };

  const handleBack = () => {
    const prevIdx = currentIdx - 1;
    if (prevIdx >= 0) setStep(STEPS[prevIdx].key);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canAdvance()) {
      toast.error(`Falta preencher: ${getMissingFields().join(', ')}`);
      return;
    }
    if (form.password !== form.confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }
    setLoading(true);
    try {
      const specialtyName =
        specialties.find((s) => s.id === form.specialtyId)?.name ??
        form.specialtyId;
      await registerDoctorFull({
        name: form.name,
        email: form.email,
        password: form.password,
        confirmPassword: form.confirmPassword,
        phone: form.phone.replace(/\D/g, ''),
        cpf: form.cpf.replace(/\D/g, ''),
        birthDate: form.birthDate,
        gender: (form.gender || undefined) as
          | 'M'
          | 'F'
          | 'Outro'
          | 'Não informado'
          | undefined,
        crm: form.crm,
        crmState: form.crmState,
        specialty: specialtyName,
        // Endereço (obrigatório)
        street: form.street,
        number: form.number,
        neighborhood: form.neighborhood,
        complement: form.complement || undefined,
        city: form.city,
        state: form.state,
        postalCode: form.cep ? form.cep.replace(/\D/g, '') : undefined,
        // Formação acadêmica (opcional)
        university: form.university || undefined,
        graduationYear: form.graduationYear
          ? parseInt(form.graduationYear, 10)
          : undefined,
        courses: form.courses || undefined,
        hospitalsServices: form.hospitalsServices || undefined,
        // Profissional opcional
        professionalPhone: form.professionalPhone
          ? form.professionalPhone.replace(/\D/g, '')
          : undefined,
        professionalAddress: form.professionalAddress || undefined,
        rqe: form.rqe || undefined,
      });
      toast.success('Conta criada! Aguarde a aprovação do seu cadastro.');
      navigate('/login');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao criar conta');
    } finally {
      setLoading(false);
    }
  };

  /* ------------------------------------------------------------------ */
  /* Helpers de erro inline                                              */
  /* ------------------------------------------------------------------ */

  const showError = (
    field: string,
    value: string,
    validator?: (v: string) => boolean
  ): string | null => {
    if (!touched[field]) return null;
    if (!value) return 'Campo obrigatório';
    if (validator && !validator(value)) return 'Formato inválido';
    return null;
  };

  /* ------------------------------------------------------------------ */
  /* Render                                                              */
  /* ------------------------------------------------------------------ */

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4 py-8">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-40 -top-40 h-80 w-80 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative z-10 w-full max-w-2xl"
      >
        <Card className="border-border/50 shadow-xl">
          <CardHeader className="space-y-4 pb-4 text-center">
            <div className="flex justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/20">
                <Stethoscope className="h-7 w-7 text-primary-foreground" />
              </div>
            </div>
            <div>
              <CardTitle className="text-2xl">Cadastro de Médico</CardTitle>
              <CardDescription className="mt-1.5">
                Crie sua conta para acessar o portal
              </CardDescription>
            </div>

            {/* Progress + Step Info */}
            <div className="space-y-3 pt-2">
              {/* Header do step atual */}
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-foreground">
                  Passo {currentIdx + 1} de {STEPS.length}
                </span>
                <span className="text-xs text-muted-foreground">
                  {Math.round(progressPct)}% completo
                </span>
              </div>

              {/* Progress bar */}
              <div className="relative h-2 overflow-hidden rounded-full bg-muted">
                <motion.div
                  className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary to-primary/80"
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPct}%` }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                />
              </div>

              {/* Step icons row (sem labels longas — visualmente compacto) */}
              <div className="flex items-center justify-between">
                {STEPS.map((s, i) => {
                  const isActive = i === currentIdx;
                  const isDone = i < currentIdx;
                  const StepIcon = s.icon;
                  return (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => i < currentIdx && setStep(s.key)}
                      disabled={i > currentIdx}
                      className={`flex flex-col items-center gap-1.5 transition-all ${
                        i < currentIdx
                          ? 'cursor-pointer hover:scale-105'
                          : 'cursor-default'
                      }`}
                      aria-label={`${s.label} ${isDone ? '(concluído)' : isActive ? '(atual)' : ''}`}
                    >
                      <div
                        className={`flex h-9 w-9 items-center justify-center rounded-full transition-all ${
                          isActive
                            ? 'bg-primary text-primary-foreground shadow-md ring-4 ring-primary/15'
                            : isDone
                              ? 'bg-primary/15 text-primary'
                              : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {isDone ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : (
                          <StepIcon className="h-4 w-4" />
                        )}
                      </div>
                      <span
                        className={`hidden max-w-[80px] text-center text-[10px] font-medium leading-tight sm:block ${
                          isActive ? 'text-foreground' : 'text-muted-foreground'
                        }`}
                      >
                        {s.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Descrição do step atual */}
              <div className="pb-1 pt-1">
                <p className="text-center text-sm text-muted-foreground">
                  {currentStep.description}
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-2">
            <form onSubmit={handleSubmit} className="space-y-5">
              <AnimatePresence mode="wait">
                {step === 'personal' && (
                  <motion.div
                    key="personal"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4"
                  >
                    <div className="space-y-2">
                      <Label htmlFor="name">Nome completo *</Label>
                      <div className="relative">
                        <User
                          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                          aria-hidden
                        />
                        <Input
                          id="name"
                          autoComplete="name"
                          placeholder="Dr. João Silva"
                          value={form.name}
                          onChange={(e) => updateField('name', e.target.value)}
                          onBlur={() => markTouched('name')}
                          className="pl-10"
                          required
                        />
                      </div>
                      {showError('name', form.name) && (
                        <p className="flex items-center gap-1 text-xs text-destructive">
                          <AlertCircle className="h-3 w-3" />
                          {showError('name', form.name)}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="reg-email">Email *</Label>
                      <div className="relative">
                        <Mail
                          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                          aria-hidden
                        />
                        <Input
                          id="reg-email"
                          type="email"
                          placeholder="joao@email.com"
                          value={form.email}
                          onChange={(e) => updateField('email', e.target.value)}
                          onBlur={() => markTouched('email')}
                          className="pl-10"
                          required
                          autoComplete="email"
                        />
                      </div>
                      {showError('email', form.email, isValidEmail) && (
                        <p className="flex items-center gap-1 text-xs text-destructive">
                          <AlertCircle className="h-3 w-3" />
                          {showError('email', form.email, isValidEmail)}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="phone">Telefone *</Label>
                        <div className="relative">
                          <Phone
                            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                            aria-hidden
                          />
                          <Input
                            id="phone"
                            type="tel"
                            inputMode="tel"
                            autoComplete="tel"
                            placeholder="(11) 99999-9999"
                            value={form.phone}
                            onChange={(e) =>
                              updateField('phone', maskPhone(e.target.value))
                            }
                            onBlur={() => markTouched('phone')}
                            className="pl-10"
                            required
                          />
                        </div>
                        {showError('phone', form.phone, isValidPhone) && (
                          <p className="flex items-center gap-1 text-xs text-destructive">
                            <AlertCircle className="h-3 w-3" />
                            {showError('phone', form.phone, isValidPhone)}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="cpf">CPF *</Label>
                        <div className="relative">
                          <CreditCard
                            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                            aria-hidden
                          />
                          <Input
                            id="cpf"
                            inputMode="numeric"
                            placeholder="000.000.000-00"
                            value={form.cpf}
                            onChange={(e) =>
                              updateField('cpf', maskCPF(e.target.value))
                            }
                            onBlur={() => markTouched('cpf')}
                            className="pl-10"
                            required
                          />
                        </div>
                        {showError('cpf', form.cpf, isValidCPF) && (
                          <p className="flex items-center gap-1 text-xs text-destructive">
                            <AlertCircle className="h-3 w-3" />
                            {showError('cpf', form.cpf, isValidCPF)}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="birthDate">Data de nascimento *</Label>
                        <div className="relative">
                          <Calendar
                            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                            aria-hidden
                          />
                          <Input
                            id="birthDate"
                            type="date"
                            max={new Date().toISOString().slice(0, 10)}
                            value={form.birthDate}
                            onChange={(e) =>
                              updateField('birthDate', e.target.value)
                            }
                            onBlur={() => markTouched('birthDate')}
                            className="pl-10"
                            required
                          />
                        </div>
                        {showError('birthDate', form.birthDate) && (
                          <p className="flex items-center gap-1 text-xs text-destructive">
                            <AlertCircle className="h-3 w-3" />
                            {showError('birthDate', form.birthDate)}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="gender">
                          Sexo{' '}
                          <span className="text-xs font-normal text-muted-foreground">
                            (opcional)
                          </span>
                        </Label>
                        <Select
                          value={form.gender}
                          onValueChange={(v) => updateField('gender', v)}
                        >
                          <SelectTrigger id="gender">
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="M">Masculino</SelectItem>
                            <SelectItem value="F">Feminino</SelectItem>
                            <SelectItem value="Outro">Outro</SelectItem>
                            <SelectItem value="Não informado">
                              Prefiro não informar
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-[11px] text-muted-foreground">
                          Usado em receitas antimicrobianas (CFM).
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {step === 'professional' && (
                  <motion.div
                    key="professional"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4"
                  >
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor="crm">CRM *</Label>
                        <Input
                          id="crm"
                          inputMode="numeric"
                          placeholder="123456"
                          value={form.crm}
                          onChange={(e) =>
                            updateField(
                              'crm',
                              e.target.value.replace(/\D/g, '').slice(0, 10)
                            )
                          }
                          onBlur={() => markTouched('crm')}
                          required
                        />
                        {showError('crm', form.crm) && (
                          <p className="flex items-center gap-1 text-xs text-destructive">
                            <AlertCircle className="h-3 w-3" />
                            {showError('crm', form.crm)}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="crmState">UF do CRM *</Label>
                        <Select
                          value={form.crmState}
                          onValueChange={(v) => {
                            updateField('crmState', v);
                            markTouched('crmState');
                          }}
                        >
                          <SelectTrigger id="crmState">
                            <SelectValue placeholder="UF" />
                          </SelectTrigger>
                          <SelectContent>
                            {UF_LIST.map((uf) => (
                              <SelectItem key={uf} value={uf}>
                                {uf}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {showError('crmState', form.crmState) && (
                          <p className="flex items-center gap-1 text-xs text-destructive">
                            <AlertCircle className="h-3 w-3" />
                            {showError('crmState', form.crmState)}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="specialty">Especialidade *</Label>
                      <Select
                        value={form.specialtyId}
                        onValueChange={(v) => {
                          updateField('specialtyId', v);
                          markTouched('specialtyId');
                        }}
                      >
                        <SelectTrigger id="specialty">
                          <SelectValue placeholder="Selecione a especialidade" />
                        </SelectTrigger>
                        <SelectContent>
                          {specialties.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {showError('specialtyId', form.specialtyId) && (
                        <p className="flex items-center gap-1 text-xs text-destructive">
                          <AlertCircle className="h-3 w-3" />
                          {showError('specialtyId', form.specialtyId)}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="rqe">
                          RQE{' '}
                          <span className="text-xs font-normal text-muted-foreground">
                            (se especialista)
                          </span>
                        </Label>
                        <Input
                          id="rqe"
                          inputMode="numeric"
                          placeholder="Ex.: 12345"
                          value={form.rqe}
                          onChange={(e) =>
                            updateField(
                              'rqe',
                              e.target.value.replace(/\D/g, '').slice(0, 10)
                            )
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="profPhone">
                          Telefone profissional{' '}
                          <span className="text-xs font-normal text-muted-foreground">
                            (opcional)
                          </span>
                        </Label>
                        <div className="relative">
                          <Building2
                            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                            aria-hidden
                          />
                          <Input
                            id="profPhone"
                            placeholder="(11) 3333-4444"
                            value={form.professionalPhone}
                            onChange={(e) =>
                              updateField(
                                'professionalPhone',
                                maskPhone(e.target.value)
                              )
                            }
                            className="pl-10"
                          />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {step === 'academic' && (
                  <motion.div
                    key="academic"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4"
                  >
                    <div className="rounded-lg border border-border/40 bg-muted/40 px-3 py-2">
                      <p className="text-xs text-muted-foreground">
                        Campos opcionais — ajudam nossa equipe de RH na análise
                        do seu perfil.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor="university">
                          Faculdade / Universidade
                        </Label>
                        <div className="relative">
                          <GraduationCap
                            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                            aria-hidden
                          />
                          <Input
                            id="university"
                            placeholder="Ex.: Universidade de São Paulo (USP)"
                            value={form.university}
                            onChange={(e) =>
                              updateField(
                                'university',
                                e.target.value.slice(0, 500)
                              )
                            }
                            className="pl-10"
                            maxLength={500}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="graduationYear">Ano de conclusão</Label>
                        <Input
                          id="graduationYear"
                          type="number"
                          inputMode="numeric"
                          placeholder="2015"
                          min={1900}
                          max={new Date().getFullYear()}
                          value={form.graduationYear}
                          onChange={(e) =>
                            updateField(
                              'graduationYear',
                              e.target.value.replace(/\D/g, '').slice(0, 4)
                            )
                          }
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="courses">
                        Pós-graduação, residência e cursos
                      </Label>
                      <textarea
                        id="courses"
                        placeholder="Ex.: Residência em Cardiologia - HCFMUSP (2018-2021); Fellowship em Eletrofisiologia - InCor"
                        value={form.courses}
                        onChange={(e) =>
                          updateField('courses', e.target.value.slice(0, 500))
                        }
                        maxLength={500}
                        rows={3}
                        className="flex w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                      />
                      <p className="text-right text-[11px] text-muted-foreground">
                        {form.courses.length}/500
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="hospitalsServices">
                        Hospitais e serviços onde atua ou atuou
                      </Label>
                      <textarea
                        id="hospitalsServices"
                        placeholder="Ex.: Hospital Sírio-Libanês (plantonista, 2020-atual); UBS Vila Maria"
                        value={form.hospitalsServices}
                        onChange={(e) =>
                          updateField(
                            'hospitalsServices',
                            e.target.value.slice(0, 500)
                          )
                        }
                        maxLength={500}
                        rows={3}
                        className="flex w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                      />
                      <p className="text-right text-[11px] text-muted-foreground">
                        {form.hospitalsServices.length}/500
                      </p>
                    </div>
                  </motion.div>
                )}

                {step === 'address' && (
                  <motion.div
                    key="address"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4"
                  >
                    <div className="space-y-2">
                      <Label htmlFor="cep">
                        CEP{' '}
                        <span className="text-xs font-normal text-muted-foreground">
                          (preenche automaticamente)
                        </span>
                      </Label>
                      <div className="relative">
                        <MapPin
                          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                          aria-hidden
                        />
                        <Input
                          id="cep"
                          inputMode="numeric"
                          autoComplete="postal-code"
                          placeholder="00000-000"
                          value={form.cep}
                          onChange={(e) =>
                            updateField('cep', maskCEP(e.target.value))
                          }
                          onBlur={handleCepBlur}
                          className="pl-10"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor="street">Rua / Logradouro *</Label>
                        <Input
                          id="street"
                          placeholder="Av. Paulista"
                          value={form.street}
                          onChange={(e) =>
                            updateField('street', e.target.value)
                          }
                          onBlur={() => markTouched('street')}
                          autoComplete="street-address"
                          required
                        />
                        {showError('street', form.street) && (
                          <p className="flex items-center gap-1 text-xs text-destructive">
                            <AlertCircle className="h-3 w-3" />
                            {showError('street', form.street)}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="number">Número *</Label>
                        <Input
                          id="number"
                          placeholder="1000"
                          value={form.number}
                          onChange={(e) =>
                            updateField('number', e.target.value)
                          }
                          onBlur={() => markTouched('number')}
                          required
                        />
                        {showError('number', form.number) && (
                          <p className="flex items-center gap-1 text-xs text-destructive">
                            <AlertCircle className="h-3 w-3" />
                            {showError('number', form.number)}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="neighborhood">Bairro *</Label>
                        <Input
                          id="neighborhood"
                          placeholder="Bela Vista"
                          value={form.neighborhood}
                          onChange={(e) =>
                            updateField('neighborhood', e.target.value)
                          }
                          onBlur={() => markTouched('neighborhood')}
                          required
                        />
                        {showError('neighborhood', form.neighborhood) && (
                          <p className="flex items-center gap-1 text-xs text-destructive">
                            <AlertCircle className="h-3 w-3" />
                            {showError('neighborhood', form.neighborhood)}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="complement">
                          Complemento{' '}
                          <span className="text-xs font-normal text-muted-foreground">
                            (opcional)
                          </span>
                        </Label>
                        <Input
                          id="complement"
                          placeholder="Sala 501"
                          value={form.complement}
                          onChange={(e) =>
                            updateField('complement', e.target.value)
                          }
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor="city">Cidade *</Label>
                        <Input
                          id="city"
                          placeholder="São Paulo"
                          value={form.city}
                          onChange={(e) => updateField('city', e.target.value)}
                          onBlur={() => markTouched('city')}
                          autoComplete="address-level2"
                          required
                        />
                        {showError('city', form.city) && (
                          <p className="flex items-center gap-1 text-xs text-destructive">
                            <AlertCircle className="h-3 w-3" />
                            {showError('city', form.city)}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="state">UF *</Label>
                        <Select
                          value={form.state}
                          onValueChange={(v) => {
                            updateField('state', v);
                            markTouched('state');
                          }}
                        >
                          <SelectTrigger id="state">
                            <SelectValue placeholder="UF" />
                          </SelectTrigger>
                          <SelectContent>
                            {UF_LIST.map((uf) => (
                              <SelectItem key={uf} value={uf}>
                                {uf}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {showError('state', form.state) && (
                          <p className="flex items-center gap-1 text-xs text-destructive">
                            <AlertCircle className="h-3 w-3" />
                            {showError('state', form.state)}
                          </p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}

                {step === 'security' && (
                  <motion.div
                    key="security"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4"
                  >
                    <div className="space-y-2">
                      <Label htmlFor="reg-password">Senha *</Label>
                      <div className="relative">
                        <Lock
                          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                          aria-hidden
                        />
                        <Input
                          id="reg-password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Mínimo 8 caracteres"
                          value={form.password}
                          onChange={(e) =>
                            updateField('password', e.target.value)
                          }
                          onBlur={() => markTouched('password')}
                          className="pl-10 pr-10"
                          required
                          minLength={8}
                          autoComplete="new-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          aria-label="Mostrar senha"
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                      {touched.password &&
                        form.password.length > 0 &&
                        form.password.length < 8 && (
                          <p className="flex items-center gap-1 text-xs text-destructive">
                            <AlertCircle className="h-3 w-3" />
                            Mínimo 8 caracteres
                          </p>
                        )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirmar senha *</Label>
                      <div className="relative">
                        <Lock
                          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                          aria-hidden
                        />
                        <Input
                          id="confirmPassword"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Repita a senha"
                          value={form.confirmPassword}
                          onChange={(e) =>
                            updateField('confirmPassword', e.target.value)
                          }
                          onBlur={() => markTouched('confirmPassword')}
                          className="pl-10"
                          required
                          autoComplete="new-password"
                        />
                      </div>
                      {form.confirmPassword &&
                        form.password !== form.confirmPassword && (
                          <p className="flex items-center gap-1 text-xs text-destructive">
                            <AlertCircle className="h-3 w-3" />
                            As senhas não coincidem
                          </p>
                        )}
                    </div>

                    <div className="space-y-2 rounded-xl border border-primary/10 bg-primary/5 p-4">
                      <p className="text-sm font-medium text-foreground">
                        Ao criar sua conta, você concorda com:
                      </p>
                      <ul className="space-y-1 text-xs text-muted-foreground">
                        <li>• Termos de Uso e Política de Privacidade</li>
                        <li>• Código de Ética Médica do CFM</li>
                        <li>
                          • Seu cadastro será analisado antes da aprovação
                        </li>
                      </ul>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Botões de navegação */}
              <div className="flex gap-3 pt-3">
                {currentIdx > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleBack}
                    className="h-11 flex-1"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" aria-hidden />
                    Voltar
                  </Button>
                )}
                {currentIdx < STEPS.length - 1 ? (
                  <Button
                    type="button"
                    onClick={handleNext}
                    className="h-11 flex-1 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={!canAdvance()}
                  >
                    Próximo
                    <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    className="h-11 flex-1 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={loading || !canAdvance()}
                  >
                    {loading ? (
                      <Loader2
                        className="mr-2 h-4 w-4 animate-spin"
                        aria-hidden
                      />
                    ) : null}
                    {loading ? 'Criando conta...' : 'Criar Conta'}
                  </Button>
                )}
              </div>

              <p className="pt-2 text-center text-sm text-muted-foreground">
                Já tem conta?{' '}
                <Link
                  to="/login"
                  className="font-medium text-primary transition-colors hover:text-primary/80"
                >
                  Fazer login
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
