import { useState } from 'react';
import { motion } from 'framer-motion';
import { Smartphone, Shield, Clock, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ComingSoonModal } from '@/components/ui/coming-soon-modal';
import logoImage from '@/assets/logo-renoveja-new.png';

const trustIndicators = [
  { icon: Shield, text: 'LGPD Compliant' },
  { icon: Clock, text: 'Em até 2 horas' },
  { icon: CheckCircle2, text: '100% Digital' },
];

export function AppHeroSection() {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalPlatform, setModalPlatform] = useState<'android' | 'ios'>('android');

  const handleDownloadClick = (platform: 'android' | 'ios') => {
    setModalPlatform(platform);
    setModalOpen(true);
  };

  return (
    <>
      <section id="hero" className="relative min-h-screen overflow-hidden">
        {/* Light Gradient Background */}
        <div className="absolute inset-0 gradient-hero" />
        
        {/* Decorative Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 -right-32 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 -left-32 w-96 h-96 bg-primary/15 rounded-full blur-3xl" />
        </div>

        <div className="container mx-auto px-4 pt-24 pb-12 sm:py-20 lg:py-32 relative z-10">
          <div className="grid lg:grid-cols-2 gap-8 sm:gap-12 lg:gap-20 items-center">
            {/* Content */}
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="space-y-5 sm:space-y-8 text-center lg:text-left"
            >
              {/* Badge */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="inline-flex items-center gap-2 bg-primary/15 border border-primary/30 rounded-full px-4 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-medium text-primary"
              >
                <Smartphone className="w-4 h-4" />
                Disponível para Android e iOS
              </motion.div>

              <h1 className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight">
                Sua receita renovada{' '}
                <span className="text-primary">em até 2 horas.</span>
              </h1>

              <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-xl mx-auto lg:mx-0 leading-relaxed">
                Renove receitas médicas e solicite exames direto do celular. Simples, rápido e 100% seguro.
              </p>

              {/* Trust Indicators */}
              <div className="flex flex-wrap justify-center lg:justify-start gap-2 sm:gap-4">
                {trustIndicators.map((item) => (
                  <span 
                    key={item.text} 
                    className="flex items-center gap-1.5 sm:gap-2 bg-card shadow-card px-3 sm:px-4 py-2 sm:py-2.5 rounded-full text-foreground text-xs sm:text-sm font-medium border border-border"
                  >
                    <item.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
                    {item.text}
                  </span>
                ))}
              </div>

              {/* Store CTAs */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center lg:justify-start pt-2 sm:pt-4">
                <motion.button
                  onClick={() => handleDownloadClick('android')}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full sm:w-auto"
                >
                  <Button 
                    size="lg" 
                    className="w-full h-12 sm:h-14 px-6 sm:px-8 font-semibold bg-primary hover:bg-primary/90 text-white rounded-xl sm:rounded-2xl gap-2 sm:gap-3 text-sm sm:text-base shadow-primary"
                  >
                    <svg viewBox="0 0 24 24" className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor">
                      <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/>
                    </svg>
                    Baixar no Android
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
                    variant="outline" 
                    className="w-full h-12 sm:h-14 px-6 sm:px-8 font-semibold bg-card hover:bg-muted text-foreground border-border hover:border-primary/30 rounded-xl sm:rounded-2xl gap-2 sm:gap-3 text-sm sm:text-base shadow-card"
                  >
                    <svg viewBox="0 0 24 24" className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor">
                      <path d="M18.71,19.5C17.88,20.74 17,21.95 15.66,21.97C14.32,22 13.89,21.18 12.37,21.18C10.84,21.18 10.37,21.95 9.1,22C7.79,22.05 6.8,20.68 5.96,19.47C4.25,17 2.94,12.45 4.7,9.39C5.57,7.87 7.13,6.91 8.82,6.88C10.1,6.86 11.32,7.75 12.11,7.75C12.89,7.75 14.37,6.68 15.92,6.84C16.57,6.87 18.39,7.1 19.56,8.82C19.47,8.88 17.39,10.1 17.41,12.63C17.44,15.65 20.06,16.66 20.09,16.67C20.06,16.74 19.67,18.11 18.71,19.5M13,3.5C13.73,2.67 14.94,2.04 15.94,2C16.07,3.17 15.6,4.35 14.9,5.19C14.21,6.04 13.07,6.7 11.95,6.61C11.8,5.46 12.36,4.26 13,3.5Z"/>
                    </svg>
                    Baixar no iPhone
                  </Button>
                </motion.button>
              </div>

              {/* Trust Badge */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="flex flex-wrap items-center gap-4 justify-center lg:justify-start pt-2 sm:pt-4"
              >
                <div className="flex items-center gap-2 sm:gap-3 bg-card shadow-card rounded-xl sm:rounded-2xl px-4 sm:px-5 py-2.5 sm:py-3 border border-border">
                  <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-success" />
                  <span className="text-xs sm:text-sm text-foreground">Certificado Digital ICP-Brasil</span>
                </div>
              </motion.div>
            </motion.div>

            {/* Phone Mockup - App Style */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }}
              className="relative flex justify-center"
            >
              <motion.div 
                className="relative"
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              >
                {/* App-style Phone Card */}
                <div className="relative w-[260px] sm:w-[300px] md:w-[340px] bg-card rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden">
                  {/* Card Header */}
                  <div className="bg-gradient-to-b from-card-header to-card py-6 sm:py-8 px-4 sm:px-6">
                    <div className="flex items-center justify-center">
                      <img 
                        src={logoImage} 
                        alt="RenoveJá+" 
                        className="h-10 sm:h-12 object-contain"
                      />
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                    {/* Welcome Text */}
                    <div className="text-center">
                      <h3 className="font-display text-lg sm:text-xl font-bold text-foreground mb-1">
                        Bem-vindo!
                      </h3>
                      <p className="text-muted-foreground text-xs sm:text-sm">
                        O que você precisa hoje?
                      </p>
                    </div>

                    {/* Service Cards */}
                    <div className="space-y-2 sm:space-y-3">
                      {[
                        { icon: '📋', title: 'Receita', desc: 'Renove sua receita', color: 'bg-primary/10' },
                        { icon: '🔬', title: 'Exames', desc: 'Solicite exames', color: 'bg-success/10' },
                        { icon: '💬', title: 'Consulta Breve', desc: 'Tire dúvidas', color: 'bg-orange/10' },
                      ].map((service, i) => (
                        <motion.div
                          key={service.title}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.3 + i * 0.1 }}
                          className="flex items-center gap-3 sm:gap-4 bg-muted/50 rounded-xl sm:rounded-2xl p-3 sm:p-4 hover:bg-muted transition-colors cursor-pointer group"
                        >
                          <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl ${service.color} flex items-center justify-center text-xl sm:text-2xl`}>
                            {service.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-foreground text-sm sm:text-base">{service.title}</p>
                            <p className="text-xs sm:text-sm text-muted-foreground truncate">{service.desc}</p>
                          </div>
                          <div className="text-muted-foreground group-hover:text-primary transition-colors">
                            →
                          </div>
                        </motion.div>
                      ))}
                    </div>

                    {/* WhatsApp Button */}
                    <a 
                      href="https://wa.me/5511986318000"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#25D366]/90 text-white font-semibold py-3.5 rounded-full transition-all"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                      </svg>
                      Falar pelo WhatsApp
                    </a>
                  </div>
                </div>

                {/* Floating Elements - Hidden on small screens */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1.2 }}
                  className="absolute -top-4 -right-4 hidden sm:block"
                >
                  <div className="bg-card rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-elevated border border-border animate-float">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-success/20 flex items-center justify-center">
                        <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-success" />
                      </div>
                      <div>
                        <p className="font-bold text-foreground text-xs sm:text-sm">LGPD</p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">Compliant</p>
                      </div>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1.4 }}
                  className="absolute -bottom-16 -left-8 hidden md:block"
                >
                  <div className="bg-card rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-elevated border border-border">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-primary/20 flex items-center justify-center">
                        <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-bold text-foreground text-xs sm:text-sm">~2 horas</p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">Tempo médio</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            </motion.div>
          </div>
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
