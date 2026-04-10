import { motion } from 'framer-motion';
import { UserPlus, Search, Video, Rocket } from 'lucide-react';
import { Container } from '../layout/Container';

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
  },
};

const stagger = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.15 },
  },
};

const steps = [
  {
    icon: UserPlus,
    number: 1,
    title: 'Cadastre-se',
    description: 'Preencha o formulário com seus dados profissionais e documentos',
  },
  {
    icon: Search,
    number: 2,
    title: 'Análise',
    description: 'Seus dados são analisados por IA + equipe humana para garantir qualidade',
  },
  {
    icon: Video,
    number: 3,
    title: 'Entrevista',
    description: 'Entraremos em contato para agendar uma conversa online',
  },
  {
    icon: Rocket,
    number: 4,
    title: 'Onboarding',
    description: 'Treinamento na plataforma e início dos atendimentos',
  },
];

export function HowItWorks() {
  return (
    <section className="py-20">
      <Container>
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={stagger}
          className="flex flex-col items-center"
        >
          <motion.h2
            variants={fadeUp}
            className="font-display text-3xl sm:text-4xl text-slate-900 text-center mb-14"
          >
            Como funciona?
          </motion.h2>

          <div className="relative grid grid-cols-1 md:grid-cols-4 gap-10 md:gap-6 w-full max-w-5xl mx-auto">
            {/* Dashed connecting line (desktop only) */}
            <div
              className="hidden md:block absolute top-8 left-[calc(12.5%+24px)] right-[calc(12.5%+24px)] h-0.5 border-t-2 border-dashed border-slate-200"
              aria-hidden="true"
            />

            {steps.map(({ icon: Icon, number, title, description }) => (
              <motion.div
                key={number}
                variants={fadeUp}
                className="relative flex flex-col items-center text-center"
              >
                {/* Number circle */}
                <div className="relative z-10 w-14 h-14 rounded-full flex items-center justify-center mb-5 shrink-0 bg-gradient-to-br from-primary-500 to-primary-700 shadow-glow">
                  <Icon size={24} className="text-white" aria-hidden="true" />
                  <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-white border-2 border-primary-500 flex items-center justify-center text-xs font-bold text-primary-700 font-body">
                    {number}
                  </span>
                </div>

                <h3 className="font-display text-lg text-slate-900 mb-2">
                  {title}
                </h3>
                <p className="text-slate-500 text-sm leading-relaxed max-w-[220px]">
                  {description}
                </p>

                {/* Vertical dashed line between steps (mobile only) */}
                {number < steps.length && (
                  <div
                    className="md:hidden w-0.5 h-8 border-l-2 border-dashed border-slate-200 mt-6"
                    aria-hidden="true"
                  />
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>
      </Container>
    </section>
  );
}
