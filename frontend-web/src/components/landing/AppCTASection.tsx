import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, MessageCircle, Gift, Clock, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ComingSoonModal } from '@/components/ui/coming-soon-modal';

export function AppCTASection() {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalPlatform, setModalPlatform] = useState<'android' | 'ios'>('android');

  const handleDownloadClick = (platform: 'android' | 'ios') => {
    setModalPlatform(platform);
    setModalOpen(true);
  };

  return (
    <>
      <section className="py-16 sm:py-24 lg:py-32 bg-app-dark relative overflow-hidden">
        {/* Decorative Elements */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-64 sm:w-96 h-64 sm:h-96 bg-primary/15 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-64 sm:w-96 h-64 sm:h-96 bg-primary/15 rounded-full blur-3xl" />
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
              className="inline-flex items-center gap-2 bg-success/20 backdrop-blur-sm border border-success/30 rounded-full px-5 py-2.5 text-sm font-medium text-success mb-8"
            >
              <Gift className="w-4 h-4" />
              <span>Oferta de Lançamento</span>
              <span className="bg-success text-white px-2 py-0.5 rounded-full text-xs font-bold">
                GRÁTIS
              </span>
            </motion.div>

            <h2 className="font-display text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 sm:mb-6">
              Chega de filas e espera.{' '}
              <span className="text-primary">Renove agora.</span>
            </h2>

            <p className="text-base sm:text-lg md:text-xl text-white/70 mb-6 sm:mb-8 max-w-2xl mx-auto">
              Milhares de pessoas já renovam suas receitas pelo celular. Junte-se a elas!
            </p>

            {/* Features */}
            <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-3 sm:gap-4 mb-8 sm:mb-10">
              <div className="flex items-center justify-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 sm:px-5 py-2 sm:py-2.5 text-white text-xs sm:text-sm border border-white/10">
                <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
                <span>Avaliação em até 2 horas</span>
              </div>
              <div className="flex items-center justify-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 sm:px-5 py-2 sm:py-2.5 text-white text-xs sm:text-sm border border-white/10">
                <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-success" />
                <span>Certificado Digital ICP-Brasil</span>
              </div>
            </div>

            {/* Store CTAs */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mb-6 sm:mb-8">
              <motion.button
                onClick={() => handleDownloadClick('android')}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                className="w-full sm:w-auto"
              >
                <Button
                  size="lg"
                  className="w-full h-14 sm:h-16 px-6 sm:px-8 font-semibold bg-primary hover:bg-primary/90 text-white shadow-primary gap-2 sm:gap-3 text-base sm:text-lg rounded-xl sm:rounded-2xl"
                >
                  <svg viewBox="0 0 24 24" className="w-6 h-6 sm:w-7 sm:h-7" fill="currentColor">
                    <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/>
                  </svg>
                  Baixar no Android
                  <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
                </Button>
              </motion.button>
              
              <motion.button
                onClick={() => handleDownloadClick('ios')}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                className="w-full sm:w-auto"
              >
                <Button
                  size="lg"
                  className="w-full h-14 sm:h-16 px-6 sm:px-8 font-semibold bg-white hover:bg-white/90 text-foreground shadow-elevated gap-2 sm:gap-3 text-base sm:text-lg rounded-xl sm:rounded-2xl"
                >
                  <svg viewBox="0 0 24 24" className="w-6 h-6 sm:w-7 sm:h-7" fill="currentColor">
                    <path d="M18.71,19.5C17.88,20.74 17,21.95 15.66,21.97C14.32,22 13.89,21.18 12.37,21.18C10.84,21.18 10.37,21.95 9.1,22C7.79,22.05 6.8,20.68 5.96,19.47C4.25,17 2.94,12.45 4.7,9.39C5.57,7.87 7.13,6.91 8.82,6.88C10.1,6.86 11.32,7.75 12.11,7.75C12.89,7.75 14.37,6.68 15.92,6.84C16.57,6.87 18.39,7.1 19.56,8.82C19.47,8.88 17.39,10.1 17.41,12.63C17.44,15.65 20.06,16.66 20.09,16.67C20.06,16.74 19.67,18.11 18.71,19.5M13,3.5C13.73,2.67 14.94,2.04 15.94,2C16.07,3.17 15.6,4.35 14.9,5.19C14.21,6.04 13.07,6.7 11.95,6.61C11.8,5.46 12.36,4.26 13,3.5Z"/>
                  </svg>
                  Baixar no iPhone
                  <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
                </Button>
              </motion.button>
            </div>

            {/* Guarantee */}
            <div className="flex items-center justify-center gap-3 mb-6 sm:mb-8">
              <div className="flex items-center gap-2 bg-success/20 border border-success/30 rounded-full px-4 sm:px-5 py-2 sm:py-2.5 text-success text-xs sm:text-sm">
                <svg className="w-4 h-4 sm:w-5 sm:h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  <path d="M9 12l2 2 4-4"/>
                </svg>
                <span>Satisfação garantida ou reembolso</span>
              </div>
            </div>

            {/* WhatsApp */}
            <a 
              href="https://wa.me/5511986318000" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-[#25D366]/20 hover:bg-[#25D366]/30 border border-[#25D366]/40 rounded-full px-4 sm:px-6 py-2.5 sm:py-3 text-white text-sm sm:text-base transition-all hover:scale-105"
            >
              <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5 text-[#25D366]" />
              <span className="hidden sm:inline">Prefere WhatsApp?</span> <strong>(11) 98631-8000</strong>
            </a>
          </motion.div>
        </div>
      </section>

      <ComingSoonModal 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)} 
        platform={modalPlatform} 
      />
    </>
  );
}
