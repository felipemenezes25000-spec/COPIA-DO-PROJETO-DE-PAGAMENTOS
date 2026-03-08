import { motion } from 'framer-motion';
import { 
  Home, 
  Zap, 
  Clock, 
  Shield, 
  UserCheck, 
  Smartphone,
  HeartPulse,
  Wallet,
  Globe
} from 'lucide-react';

const benefits = [
  {
    icon: Home,
    title: 'Sem sair de casa',
    description: 'Renovação 100% digital, faça tudo pelo seu celular ou computador',
  },
  {
    icon: Zap,
    title: 'Rápido e prático',
    description: 'Resposta médica em até 2 horas após confirmação do pagamento',
  },
  {
    icon: Clock,
    title: 'Economia de tempo',
    description: 'Sem filas, sem deslocamento, sem perda de tempo em consultórios',
  },
  {
    icon: Shield,
    title: 'Seguro e confiável',
    description: 'Conformidade total com LGPD, seus dados sempre protegidos',
  },
  {
    icon: UserCheck,
    title: 'Médicos certificados',
    description: 'Profissionais com CRM ativo verificados mensalmente',
  },
  {
    icon: Smartphone,
    title: 'App intuitivo',
    description: 'Interface simples e fácil de usar para todas as idades',
  },
];

const additionalBenefits = [
  { icon: HeartPulse, text: 'Acompanhamento contínuo' },
  { icon: Wallet, text: 'Preços acessíveis' },
  { icon: Globe, text: 'Válido em todo Brasil' },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.5,
    },
  },
};

export function BenefitsSection() {
  return (
    <section id="benefits" className="py-24 lg:py-32 bg-accent/50 relative overflow-hidden">
      {/* Background Decoration */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <span className="inline-block text-primary font-semibold text-sm uppercase tracking-wider mb-4">
            Por que escolher
          </span>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-6">
            Vantagens <span className="text-gradient">Exclusivas</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Descubra por que milhares de brasileiros confiam no RenoveJá para renovar suas receitas médicas.
          </p>
        </motion.div>

        {/* Benefits Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8"
        >
          {benefits.map((benefit) => (
            <motion.div
              key={benefit.title}
              variants={itemVariants}
              whileHover={{ y: -8 }}
              className="group"
            >
              <div className="h-full bg-card rounded-2xl p-6 lg:p-8 border border-border shadow-card hover:shadow-large hover:border-primary/20 transition-all duration-300">
                {/* Icon */}
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary group-hover:scale-110 transition-all duration-300">
                  <benefit.icon className="w-7 h-7 text-primary group-hover:text-primary-foreground transition-colors" />
                </div>

                {/* Content */}
                <h3 className="font-display text-xl font-bold text-foreground mb-3">
                  {benefit.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {benefit.description}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Additional Benefits Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-16"
        >
          <div className="bg-card rounded-2xl p-6 lg:p-8 border border-border shadow-card">
            <div className="flex flex-wrap justify-center items-center gap-6 lg:gap-12">
              {additionalBenefits.map((item) => (
                <div
                  key={item.text}
                  className="flex items-center gap-3 text-foreground"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <item.icon className="w-5 h-5 text-primary" />
                  </div>
                  <span className="font-medium">{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
