import { useState } from 'react';
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
import { useDoctorAuth } from '@/hooks/useDoctorAuth';
import { loginDoctor, forgotPassword } from '@/services/doctorApi';
import { toast } from 'sonner';
import {
  Loader2,
  Stethoscope,
  Eye,
  EyeOff,
  Mail,
  Lock,
  ArrowRight,
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function DoctorLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const navigate = useNavigate();
  const { setAuthFromLogin } = useDoctorAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Preencha todos os campos');
      return;
    }
    setLoading(true);
    try {
      const data = await loginDoctor(email, password);
      setAuthFromLogin(data.user);
      toast.success('Bem-vindo!');
      navigate(
        data.user?.profileComplete === false
          ? '/completar-cadastro'
          : '/dashboard'
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Credenciais inválidas');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('Digite seu email');
      return;
    }
    setForgotLoading(true);
    try {
      await forgotPassword(email);
      toast.success('Email de recuperação enviado!');
      setForgotMode(false);
    } catch {
      toast.error('Erro ao enviar email. Verifique o endereço.');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-40 -top-40 h-80 w-80 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative z-10 w-full max-w-md"
      >
        <Card className="border-border/50 shadow-xl backdrop-blur-sm">
          <CardHeader className="space-y-4 pb-2 text-center">
            <div className="flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/20">
                <Stethoscope className="h-8 w-8 text-primary-foreground" />
              </div>
            </div>
            <div>
              <div className="mb-1 flex items-center justify-center gap-1">
                <span className="text-2xl font-bold text-foreground">
                  Renove
                </span>
                <span className="text-2xl font-bold text-primary">Já</span>
                <span className="text-2xl font-bold text-primary">+</span>
              </div>
              <CardTitle className="text-base font-semibold text-muted-foreground">
                Portal do Médico
              </CardTitle>
            </div>
            <CardDescription>
              {forgotMode
                ? 'Digite seu email para recuperar a senha'
                : 'Faça login para acessar o portal'}
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-4">
            {forgotMode ? (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="forgot-email">Email</Label>
                  <div className="relative">
                    <Mail
                      className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                      aria-hidden
                    />
                    <Input
                      id="forgot-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      required
                      autoComplete="email"
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  className="h-11 w-full"
                  disabled={forgotLoading}
                >
                  {forgotLoading ? (
                    <Loader2
                      className="mr-2 h-4 w-4 animate-spin"
                      aria-hidden
                    />
                  ) : null}
                  Enviar link de recuperação
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => setForgotMode(false)}
                >
                  Voltar ao login
                </Button>
              </form>
            ) : (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail
                      className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                      aria-hidden
                    />
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      required
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Senha</Label>
                    <button
                      type="button"
                      onClick={() => setForgotMode(true)}
                      className="text-xs font-medium text-primary transition-colors hover:text-primary/80"
                    >
                      Esqueceu a senha?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock
                      className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                      aria-hidden
                    />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10"
                      required
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                      aria-label={
                        showPassword ? 'Ocultar senha' : 'Mostrar senha'
                      }
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="h-11 w-full text-base"
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2
                      className="mr-2 h-4 w-4 animate-spin"
                      aria-hidden
                    />
                  ) : (
                    <ArrowRight className="mr-2 h-4 w-4" aria-hidden />
                  )}
                  Entrar
                </Button>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-card px-3 text-muted-foreground">
                      Ainda não tem conta?
                    </span>
                  </div>
                </div>

                <Link to="/registro">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 w-full"
                  >
                    Criar conta de médico
                  </Button>
                </Link>
              </form>
            )}
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} RenoveJá Saúde &middot;{' '}
          <a
            href="https://renovejasaude.com.br"
            className="transition-colors hover:text-primary"
          >
            renovejasaude.com.br
          </a>
        </p>
      </motion.div>
    </div>
  );
}
