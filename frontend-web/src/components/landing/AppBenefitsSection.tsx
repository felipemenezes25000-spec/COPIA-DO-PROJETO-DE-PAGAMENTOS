import { motion } from 'framer-motion';
import { 
  Home, 
  Shield, 
  Clock,
  UserCheck, 
  History,
  Bell
} from 'lucide-react';

const benefits = [
  {
    icon: Home,
    title: 'Sem sair de casa',
    description: 'Faça todo o processo pelo celular, de onde estiver. Sem filas, sem deslocamento.',
    stat: '100%',
    statLabel: 'Digital',
  },
  {
    icon: Clock,
    title: 'Rápido e prático',
    description: 'Receba sua receita em até 2 horas. Processo simples e sem burocracia.',
    stat: '~2h',
    statLabel: 'Tempo médio',
  },
  {
    icon: Shield,
    title: 'Seguro e confiável',
    description: 'Seus dados protegidos por criptografia. 100% em conformidade com a LGPD.',
    stat: '100%',
    statLabel: 'LGPD',
  },
  {
    icon: UserCheck,
    title: 'Profissionais qualificados',
    description: 'Avaliação individual por médicos com CRM ativo e registro verificável.',
    stat: '50+',
    statLabel: 'Médicos',
  },
  {
    icon: History,
    title: 'Histórico completo',
    description: 'Acompanhe todos os seus pedidos e receitas anteriores em um só lugar.',
    stat: '24/7',
    statLabel: 'Acesso',
  },
  {
    icon: Bell,
    title: 'Notificações em tempo real',
    description: 'Receba alertas sobre cada etapa do seu pedido direto no celular.',
    stat: '3min',
    statLabel: 'Resposta',
  },
];

export function AppBenefitsSection() {
  return (
    <section id="benefits" className="py-16 sm:py-24 lg:py-32 bg-background relative overflow-hidden">
      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-10 sm:mb-16"
        >
          <span className="inline-block text-primary font-semibold text-sm uppercase tracking-wider mb-4">
            Vantagens do App
          </span>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-6">
            Por que escolher o <span className="text-gradient">RenoveJá+</span>?
          </h2>
          <p className="text-lg text-muted-foreground">
            Descubra as vantagens de renovar suas receitas pelo celular.
          </p>
        </motion.div>

        {/* Benefits Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
          {benefits.map((benefit, index) => (
            <motion.div
              key={benefit.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="group"
            >
              <div className="h-full bg-card rounded-3xl p-6 border border-border/50 shadow-card hover:shadow-elevated hover:-translate-y-2 hover:border-primary/30 transition-all duration-300">
                {/* Stat Badge */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-primary">{benefit.stat}</span>
                    <span className="text-sm text-muted-foreground">{benefit.statLabel}</span>
                  </div>
                </div>

                {/* Icon */}
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary group-hover:scale-110 transition-all duration-300">
                  <benefit.icon className="w-7 h-7 text-primary group-hover:text-white transition-colors" />
                </div>

                {/* Content */}
                <h3 className="font-display text-lg font-bold text-foreground mb-2">
                  {benefit.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {benefit.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
