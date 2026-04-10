import { useEffect, useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, Mail, AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import { LogoIcon } from '../../components/ui/Logo';

const LAST_EMAIL_KEY = 'rh_admin_last_email';
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface FieldErrors {
  email?: string;
  password?: string;
}

export default function AdminLoginPage() {
  const { user, login, loading } = useAdminAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  // Pre-fill last used email (never password).
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LAST_EMAIL_KEY);
      if (saved) setEmail(saved);
    } catch {
      /* ignore storage errors (private mode, etc.) */
    }
  }, []);

  if (user) {
    return <Navigate to="/admin" replace />;
  }

  function validate(): FieldErrors {
    const errs: FieldErrors = {};
    const trimmed = email.trim();
    if (!trimmed) {
      errs.email = 'Informe seu e-mail.';
    } else if (!EMAIL_REGEX.test(trimmed)) {
      errs.email = 'Digite um e-mail válido.';
    }
    if (!password) {
      errs.password = 'Informe sua senha.';
    } else if (password.length < 6) {
      errs.password = 'A senha deve ter ao menos 6 caracteres.';
    }
    return errs;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const errs = validate();
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;

    try {
      await login(email.trim(), password);
      // Persist only after a successful login to avoid storing typos.
      try {
        localStorage.setItem(LAST_EMAIL_KEY, email.trim());
      } catch {
        /* ignore */
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao fazer login');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4">
            <LogoIcon size={64} />
          </div>
          <h1 className="text-2xl font-display font-bold text-white">
            Renove<span className="text-primary-400">Já</span> <span className="text-slate-400 text-lg">RH</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">Painel de gestão de candidatos</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-elevated p-8">
          <form
            onSubmit={handleSubmit}
            className="space-y-5"
            noValidate
            aria-busy={loading}
          >
            {error && (
              <div
                className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3"
                role="alert"
                aria-live="assertive"
              >
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label htmlFor="admin-email" className="block text-sm font-semibold text-slate-700 mb-1.5">
                E-mail
              </label>
              <div className="relative">
                <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="admin-email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (fieldErrors.email) {
                      setFieldErrors((prev) => ({ ...prev, email: undefined }));
                    }
                  }}
                  placeholder="admin@renovejasaude.com.br"
                  className="input-field pl-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                  autoComplete="email"
                  aria-invalid={fieldErrors.email ? true : undefined}
                  aria-describedby={fieldErrors.email ? 'admin-email-error' : undefined}
                  disabled={loading}
                />
              </div>
              {fieldErrors.email && (
                <p id="admin-email-error" className="mt-1.5 text-xs text-red-600">
                  {fieldErrors.email}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="admin-password" className="block text-sm font-semibold text-slate-700 mb-1.5">
                Senha
              </label>
              <div className="relative">
                <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) {
                      setFieldErrors((prev) => ({ ...prev, password: undefined }));
                    }
                  }}
                  placeholder="Digite sua senha"
                  className="input-field pl-11 pr-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                  autoComplete="current-password"
                  aria-invalid={fieldErrors.password ? true : undefined}
                  aria-describedby={fieldErrors.password ? 'admin-password-error' : undefined}
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded"
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  aria-pressed={showPassword}
                  tabIndex={0}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {fieldErrors.password && (
                <p id="admin-password-error" className="mt-1.5 text-xs text-red-600">
                  {fieldErrors.password}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Entrando...
                </span>
              ) : (
                'Entrar'
              )}
            </button>
          </form>

          {/* Hint for mock mode — only shown when VITE_API_URL is NOT set (local dev / demo) */}
          {!import.meta.env.VITE_API_URL && (
            <div className="mt-6 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-xs text-slate-500 text-center">
                <strong>Modo demonstração</strong><br />
                E-mail: admin@renovejasaude.com.br<br />
                Senha: admin123
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
