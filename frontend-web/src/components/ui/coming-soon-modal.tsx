import { motion, AnimatePresence } from 'framer-motion';
import { X, Bell, Smartphone, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

interface ComingSoonModalProps {
  isOpen: boolean;
  onClose: () => void;
  platform: 'android' | 'ios';
}

export function ComingSoonModal({
  isOpen,
  onClose,
  platform,
}: ComingSoonModalProps) {
  const [email, setEmail] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setIsSubscribed(true);
      setTimeout(() => {
        onClose();
        setIsSubscribed(false);
        setEmail('');
      }, 2000);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[100] bg-foreground/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed inset-0 z-[101] flex items-center justify-center p-4"
          >
            <div className="w-full max-w-md overflow-hidden rounded-3xl border border-border bg-background shadow-2xl">
              <div className="relative bg-gradient-to-r from-primary to-primary/80 p-6 text-white">
                <button
                  onClick={onClose}
                  className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/20 transition-colors hover:bg-white/30"
                  aria-label="Fechar"
                >
                  <X className="h-4 w-4" />
                </button>
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20">
                    <Smartphone className="h-8 w-8" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">Em Breve!</h3>
                    <p className="text-white/90">
                      {platform === 'android'
                        ? 'Google Play Store'
                        : 'Apple App Store'}
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-6">
                {!isSubscribed ? (
                  <>
                    <div className="mb-6 text-center">
                      <h4 className="mb-2 text-lg font-bold text-foreground">
                        O app RenoveJá+ está chegando!
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Estamos nos preparativos finais para o lançamento.
                        Cadastre seu email para ser avisado assim que estiver
                        disponível e ganhe{' '}
                        <span className="font-semibold text-primary">
                          acesso prioritário
                        </span>
                        .
                      </p>
                    </div>
                    <div className="mb-6 space-y-3">
                      {[
                        'Seja o primeiro a baixar',
                        'Suporte prioritário nos primeiros 30 dias',
                        'Dicas exclusivas por email',
                      ].map((benefit) => (
                        <div
                          key={benefit}
                          className="flex items-center gap-3 text-sm"
                        >
                          <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-primary" />
                          <span className="text-foreground">{benefit}</span>
                        </div>
                      ))}
                    </div>
                    <form onSubmit={handleSubmit} className="space-y-3">
                      <input
                        type="email"
                        placeholder="Seu melhor email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="w-full rounded-xl border border-input bg-background px-4 py-3 text-foreground placeholder:text-muted-foreground focus:border-transparent focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                      <Button
                        type="submit"
                        className="h-12 w-full gap-2 font-semibold"
                      >
                        <Bell className="h-4 w-4" />
                        Me Avise Quando Lançar
                      </Button>
                    </form>
                    <div className="mt-4 border-t border-border pt-4 text-center">
                      <p className="mb-3 text-sm text-muted-foreground">
                        Prefere atendimento imediato?
                      </p>
                      <a
                        href="https://wa.me/5511986318000"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm font-medium text-[#25D366] hover:underline"
                      >
                        Fale conosco pelo WhatsApp
                      </a>
                    </div>
                  </>
                ) : (
                  <div className="py-6 text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/20">
                      <CheckCircle2 className="h-8 w-8 text-success" />
                    </div>
                    <h4 className="mb-2 text-xl font-bold text-foreground">
                      Cadastro realizado!
                    </h4>
                    <p className="text-muted-foreground">
                      Você será avisado assim que o app estiver disponível.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
