import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle2, Clock, Shield, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const floatingBadges = [
  { icon: Clock, text: 'Até 2h', subtext: 'Resposta rápida', position: 'top-20 right-10 lg:right-20' },
  { icon: Shield, text: '100%', subtext: 'Seguro', position: 'bottom-40 left-10 lg:left-20' },
  { icon: Star, text: '4.9/5', subtext: '+1500 avaliações', position: 'top-40 left-20 lg:left-32' },
];

export function HeroSection() {
  return (
    <section id="hero" className="relative min-h-screen gradient-hero overflow-hidden pt-20">
      {/* Background Decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -right-32 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -left-32 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 py-20 lg:py-32">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Content */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="space-y-8 text-center lg:text-left"
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-2 text-sm font-medium text-primary"
            >
              <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
              Telemedicina simplificada
            </motion.div>

            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold text-foreground leading-tight">
              Renove Suas{' '}
              <span className="text-gradient">Receitas Médicas</span>{' '}
              Sem Sair de Casa
            </h1>

            <p className="text-lg sm:text-xl text-muted-foreground max-w-xl mx-auto lg:mx-0 leading-relaxed">
              Simples, rápido e seguro. Avaliação profissional por médicos certificados em até 2 horas após confirmação do pagamento.
            </p>

            {/* Trust Indicators */}
            <div className="flex flex-wrap justify-center lg:justify-start gap-4 text-sm text-muted-foreground">
              {['CRM Verificado', 'LGPD Compliant', 'Atendimento 24/7'].map((item) => (
                <span key={item} className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  {item}
                </span>
              ))}
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Link to="/cadastro">
                <Button size="lg" className="w-full sm:w-auto text-lg px-8 py-6 font-semibold shadow-primary hover:shadow-large group transition-all">
                  Renovar Minha Receita
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="w-full sm:w-auto text-lg px-8 py-6 font-semibold">
                Saiba Mais
              </Button>
            </div>

            {/* Social Proof */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="flex items-center gap-4 justify-center lg:justify-start pt-4"
            >
              <div className="flex -space-x-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary-glow border-2 border-background flex items-center justify-center text-primary-foreground text-sm font-bold"
                  >
                    {String.fromCharCode(64 + i)}
                  </div>
                ))}
              </div>
              <div className="text-left">
                <p className="font-semibold text-foreground">+1.527 pessoas</p>
                <p className="text-sm text-muted-foreground">já renovaram este mês</p>
              </div>
            </motion.div>
          </motion.div>

          {/* Hero Visual */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }}
            className="relative"
          >
            {/* Main Card */}
            <div className="relative">
              <div className="bg-card rounded-3xl p-8 shadow-large border border-border relative z-10">
                {/* Phone Mockup */}
                <div className="bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl p-6 aspect-[3/4] flex flex-col">
                  {/* App Header */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                        <span className="text-primary-foreground font-bold">R</span>
                      </div>
                      <div>
                        <p className="font-semibold text-foreground text-sm">RenoveJá</p>
                        <p className="text-xs text-muted-foreground">Suas receitas</p>
                      </div>
                    </div>
                    <div className="w-8 h-8 bg-success/20 rounded-full flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4 text-success" />
                    </div>
                  </div>

                  {/* Prescription Cards */}
                  <div className="flex-1 space-y-3">
                    {['Losartana 50mg', 'Metformina 850mg', 'Omeprazol 20mg'].map((med, i) => (
                      <motion.div
                        key={med}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.8 + i * 0.15 }}
                        className="bg-background rounded-xl p-4 shadow-soft flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <span className="text-primary text-lg">💊</span>
                          </div>
                          <div>
                            <p className="font-medium text-sm text-foreground">{med}</p>
                            <p className="text-xs text-muted-foreground">Uso contínuo</p>
                          </div>
                        </div>
                        <span className="text-xs font-medium px-2 py-1 bg-success/10 text-success rounded-full">
                          Ativa
                        </span>
                      </motion.div>
                    ))}
                  </div>

                  {/* CTA Button in App */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.3 }}
                    className="mt-4"
                  >
                    <div className="bg-primary text-primary-foreground rounded-xl py-3 px-4 text-center font-semibold text-sm shadow-primary">
                      + Nova Renovação
                    </div>
                  </motion.div>
                </div>
              </div>

              {/* Floating Badges */}
              {floatingBadges.map((badge, index) => (
                <motion.div
                  key={badge.text}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1 + index * 0.2, duration: 0.5 }}
                  className={`absolute ${badge.position} hidden lg:block`}
                >
                  <div className="glass-card rounded-2xl p-4 shadow-medium animate-float" style={{ animationDelay: `${index * 0.5}s` }}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <badge.icon className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-bold text-foreground">{badge.text}</p>
                        <p className="text-xs text-muted-foreground">{badge.subtext}</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Bottom Wave */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
          <path
            d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 85C1200 90 1320 90 1380 90L1440 90V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0V120Z"
            fill="hsl(var(--background))"
          />
        </svg>
      </div>
    </section>
  );
}
