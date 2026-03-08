import { motion } from 'framer-motion';
import { Upload, ClipboardCheck, Stethoscope, FileCheck, Clock } from 'lucide-react';

const steps = [
  {
    number: '01',
    icon: Upload,
    title: 'Envie a receita ou pedido',
    description: 'Tire uma foto clara da sua receita vencida ou pedido de exame usando a câmera do app.',
    time: '30 seg',
    color: 'bg-primary/20 text-primary',
  },
  {
    number: '02',
    icon: ClipboardCheck,
    title: 'Preencha dados básicos',
    description: 'Informações simples para validação, em um formulário rápido e intuitivo.',
    time: '2 min',
    color: 'bg-success/20 text-success',
  },
  {
    number: '03',
    icon: Stethoscope,
    title: 'Avaliação profissional',
    description: 'Médicos habilitados analisam seu pedido de forma individual e segura.',
    time: '~2h',
    color: 'bg-orange/20 text-orange',
  },
  {
    number: '04',
    icon: FileCheck,
    title: 'Receba o documento',
    description: 'Documento digital com certificado ICP-Brasil, pronto para usar na farmácia.',
    time: 'Instantâneo',
    color: 'bg-primary/20 text-primary',
  },
];

export function AppStepsSection() {
  return (
    <section id="steps" className="py-16 sm:py-24 lg:py-32 bg-background relative overflow-hidden">
      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-10 sm:mb-16 lg:mb-20"
        >
          <span className="inline-block text-primary font-semibold text-sm uppercase tracking-wider mb-4">
            Processo Simples
          </span>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-6">
            Como Funciona
          </h2>
          <p className="text-lg text-muted-foreground">
            Em apenas 4 passos, você envia seu pedido e recebe o documento digital no app.
          </p>
        </motion.div>

        {/* Steps Grid */}
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-4">
            {steps.map((step, index) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="relative"
              >
                {/* Connector Line (desktop) */}
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-12 left-full w-full h-0.5 bg-gradient-to-r from-primary/40 to-primary/10 z-0" />
                )}

                {/* Card */}
                <div className="bg-card rounded-3xl p-6 shadow-card border border-border/50 hover:shadow-elevated hover:border-primary/30 hover:-translate-y-2 transition-all duration-300 relative z-10">
                  {/* Step Number */}
                  <div className="absolute -top-3 -left-2">
                    <span className="bg-primary text-white font-bold text-xs px-3 py-1.5 rounded-full shadow-primary">
                      Passo {step.number}
                    </span>
                  </div>

                  {/* Time Badge */}
                  <div className="flex justify-end mb-4">
                    <span className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                      <Clock className="w-3 h-3" />
                      {step.time}
                    </span>
                  </div>

                  {/* Icon */}
                  <div className={`w-16 h-16 rounded-2xl ${step.color} flex items-center justify-center mb-4 mx-auto`}>
                    <step.icon className="w-8 h-8" />
                  </div>

                  {/* Content */}
                  <h3 className="font-display text-lg font-bold text-foreground mb-2 text-center">
                    {step.title}
                  </h3>
                  <p className="text-muted-foreground text-sm text-center leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Total Time */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mt-12"
        >
          <div className="inline-flex items-center gap-3 bg-primary/10 border border-primary/20 rounded-full px-6 py-3">
            <Clock className="w-5 h-5 text-primary" />
            <span className="text-foreground font-medium">
              Tempo total estimado: <strong className="text-primary">2-3 horas</strong>
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
