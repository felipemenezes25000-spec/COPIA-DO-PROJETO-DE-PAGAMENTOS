import { motion } from 'framer-motion';
import { Camera, FileText, Stethoscope, Download, ArrowRight } from 'lucide-react';

const steps = [
  {
    number: '01',
    icon: Camera,
    title: 'Tire uma foto da receita',
    description: 'Capture uma imagem clara da sua receita médica vencida usando a câmera do seu celular',
    color: 'bg-primary/10 text-primary',
  },
  {
    number: '02',
    icon: FileText,
    title: 'Preencha seus dados',
    description: 'Informações básicas para garantir a segurança e validação do seu pedido',
    color: 'bg-success/10 text-success',
  },
  {
    number: '03',
    icon: Stethoscope,
    title: 'Avaliação médica',
    description: 'Médicos com CRM ativo avaliam seu caso de forma profissional e segura',
    color: 'bg-warning/10 text-warning',
  },
  {
    number: '04',
    icon: Download,
    title: 'Receba sua receita',
    description: 'Receita digital válida em todo Brasil, direto no seu celular em até 2 horas',
    color: 'bg-primary/10 text-primary',
  },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.15,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
    },
  },
};

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-24 lg:py-32 bg-background relative overflow-hidden">
      {/* Background Decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-primary/3 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-16 lg:mb-20"
        >
          <span className="inline-block text-primary font-semibold text-sm uppercase tracking-wider mb-4">
            Processo Simples
          </span>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-6">
            Como Funciona
          </h2>
          <p className="text-lg text-muted-foreground">
            Renovar sua receita médica nunca foi tão fácil. Em apenas 4 passos simples, você terá sua receita renovada.
          </p>
        </motion.div>

        {/* Steps Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8"
        >
          {steps.map((step, index) => (
            <motion.div
              key={step.number}
              variants={itemVariants}
              className="relative group"
            >
              {/* Connection Line (Desktop) */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-16 left-[60%] w-[calc(100%-20%)] h-0.5">
                  <div className="w-full h-full bg-gradient-to-r from-primary/30 to-transparent" />
                  <ArrowRight className="absolute -right-3 -top-[7px] w-4 h-4 text-primary/30" />
                </div>
              )}

              {/* Card */}
              <div className="bg-card rounded-2xl p-6 lg:p-8 border border-border shadow-card hover:shadow-large hover:-translate-y-2 transition-all duration-300">
                {/* Step Number */}
                <div className="absolute -top-4 left-6 bg-primary text-primary-foreground font-bold text-sm px-3 py-1 rounded-full shadow-primary">
                  Passo {step.number}
                </div>

                {/* Icon */}
                <div className={`w-16 h-16 rounded-2xl ${step.color} flex items-center justify-center mb-6 mt-2 group-hover:scale-110 transition-transform duration-300`}>
                  <step.icon className="w-8 h-8" />
                </div>

                {/* Content */}
                <h3 className="font-display text-xl font-bold text-foreground mb-3">
                  {step.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center mt-16"
        >
          <p className="text-muted-foreground mb-6">
            Pronto para começar? Leva menos de 5 minutos!
          </p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-8 py-4 rounded-xl font-semibold shadow-primary hover:shadow-large transition-all"
          >
            Iniciar Renovação
            <ArrowRight className="w-5 h-5" />
          </motion.button>
        </motion.div>
      </div>
    </section>
  );
}
