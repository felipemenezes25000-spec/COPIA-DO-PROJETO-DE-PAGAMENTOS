import { motion, AnimatePresence } from "framer-motion";
import { X, Bell, Smartphone, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface ComingSoonModalProps {
  isOpen: boolean;
  onClose: () => void;
  platform: "android" | "ios";
}

export function ComingSoonModal({ isOpen, onClose, platform }: ComingSoonModalProps) {
  const [email, setEmail] = useState("");
  const [isSubscribed, setIsSubscribed] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setIsSubscribed(true);
      setTimeout(() => {
        onClose();
        setIsSubscribed(false);
        setEmail("");
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
            <div className="bg-background rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-border">
              <div className="bg-gradient-to-r from-primary to-primary/80 p-6 text-white relative">
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                  aria-label="Fechar"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center">
                    <Smartphone className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">Em Breve!</h3>
                    <p className="text-white/90">
                      {platform === "android" ? "Google Play Store" : "Apple App Store"}
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-6">
                {!isSubscribed ? (
                  <>
                    <div className="text-center mb-6">
                      <h4 className="text-lg font-bold text-foreground mb-2">
                        O app RenoveJá+ está chegando!
                      </h4>
                      <p className="text-muted-foreground text-sm">
                        Estamos nos preparativos finais para o lançamento. Cadastre seu email para
                        ser avisado assim que estiver disponível e ganhe{" "}
                        <span className="text-primary font-semibold">acesso prioritário</span>.
                      </p>
                    </div>
                    <div className="space-y-3 mb-6">
                      {[
                        "Seja o primeiro a baixar",
                        "Suporte prioritário nos primeiros 30 dias",
                        "Dicas exclusivas por email",
                      ].map((benefit) => (
                        <div key={benefit} className="flex items-center gap-3 text-sm">
                          <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
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
                        className="w-full px-4 py-3 rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                      />
                      <Button type="submit" className="w-full h-12 font-semibold gap-2">
                        <Bell className="w-4 h-4" />
                        Me Avise Quando Lançar
                      </Button>
                    </form>
                    <div className="mt-4 pt-4 border-t border-border text-center">
                      <p className="text-sm text-muted-foreground mb-3">
                        Prefere atendimento imediato?
                      </p>
                      <a
                        href="https://wa.me/5511986318000"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-[#25D366] hover:underline font-medium text-sm"
                      >
                        Fale conosco pelo WhatsApp
                      </a>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-6">
                    <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-4">
                      <CheckCircle2 className="w-8 h-8 text-success" />
                    </div>
                    <h4 className="text-xl font-bold text-foreground mb-2">
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
