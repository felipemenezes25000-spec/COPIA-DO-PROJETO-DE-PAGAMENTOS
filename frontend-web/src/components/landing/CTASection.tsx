import { motion } from 'framer-motion';
import { ArrowRight, Phone, Mail, MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export function CTASection() {
  return (
    <section className="py-24 lg:py-32 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 gradient-primary" />
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="max-w-4xl mx-auto text-center"
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2 text-sm font-medium text-white mb-8"
          >
            <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
            Mais de 1.500 receitas renovadas
          </motion.div>

          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
            Pronto para Renovar Sua Receita?
          </h2>

          <p className="text-xl text-white/80 mb-10 max-w-2xl mx-auto">
            Comece agora e tenha sua receita renovada em até 2 horas. Simples, rápido e seguro.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link to="/cadastro">
              <Button
                size="lg"
                variant="secondary"
                className="w-full sm:w-auto text-lg px-8 py-6 font-semibold bg-white text-primary hover:bg-white/90 shadow-xl group"
              >
                Renovar Minha Receita
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <a href="https://wa.me/5511986318000" target="_blank" rel="noopener noreferrer">
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto text-lg px-8 py-6 font-semibold border-white/30 text-white hover:bg-white/10"
              >
                <MessageCircle className="mr-2 w-5 h-5" />
                Falar no WhatsApp
              </Button>
            </a>
          </div>

          {/* Contact Info */}
          <div className="flex flex-wrap justify-center gap-6 text-white/80">
            <a
              href="https://wa.me/5511986318000"
              className="flex items-center gap-2 hover:text-white transition-colors"
            >
              <Phone className="w-4 h-4" />
              (11) 98631-8000
            </a>
            <a
              href="mailto:contato@renovejasaude.com.br"
              className="flex items-center gap-2 hover:text-white transition-colors"
            >
              <Mail className="w-4 h-4" />
              contato@renovejasaude.com.br
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
