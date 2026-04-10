import { useEffect, useRef } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, ArrowLeft } from 'lucide-react';

import { Header } from '../components/layout/Header';
import { Footer } from '../components/layout/Footer';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';

interface SuccessState {
  nome: string;
  email: string;
  protocolo: string;
}

function SuccessPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as SuccessState | null;
  const redirected = useRef(false);

  useEffect(() => {
    if (!state && !redirected.current) {
      redirected.current = true;
      navigate('/', { replace: true });
    }
  }, [state, navigate]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  if (!state) return null;

  const { nome, email, protocolo } = state;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.2 }}
    >
      <Header />

      <main className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-16">
        <div className="w-full max-w-lg text-center space-y-6">
          {/* Animated check icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
            className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100"
          >
            <motion.div
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              <CheckCircle className="h-10 w-10 text-emerald-600" strokeWidth={1.5} />
            </motion.div>
          </motion.div>

          {/* Title */}
          <h1
            className="text-3xl md:text-4xl font-bold text-slate-900"
            style={{ fontFamily: "'Poppins', sans-serif" }}
          >
            Cadastro Recebido!
          </h1>

          {/* Messages */}
          <p className="text-lg text-slate-600 leading-relaxed">
            Obrigado, <strong className="text-slate-800">{nome}</strong>. Sua conta já foi
            criada e seu perfil será analisado por nossa equipe e por inteligência artificial.
          </p>

          <p className="text-sm text-slate-500 leading-relaxed">
            Assim que a aprovação for concluída, você receberá um e-mail em{' '}
            <strong className="text-slate-700">{email}</strong> e poderá entrar
            no aplicativo RenoveJá usando o mesmo e-mail e senha (ou Google) que
            cadastrou agora.
          </p>

          {/* Protocol card */}
          <div className="inline-flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-white px-8 py-5 shadow-sm">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Protocolo
            </span>
            <Badge variant="teal" className="text-sm px-4 py-1">
              {protocolo}
            </Badge>
          </div>

          {/* Back button */}
          <div className="pt-4">
            <Link to="/">
              <Button variant="secondary">
                <ArrowLeft className="h-4 w-4" />
                Voltar ao início
              </Button>
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </motion.div>
  );
}

export default SuccessPage;
