import { motion } from 'framer-motion';
import { MapPin, Cpu } from 'lucide-react';
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
    transition: { staggerChildren: 0.12 },
  },
};

const benefits = [
  {
    icon: MapPin,
    title: 'Atenda de qualquer lugar',
    description:
      'Flexibilidade geográfica total. Trabalhe de casa, do consultório ou de onde quiser.',
  },
  {
    icon: Cpu,
    title: 'Tecnologia de ponta',
    description:
      'Plataforma com IA assistiva, prescrição digital com certificado ICP-Brasil e prontuário eletrônico integrado.',
  },
];

export function Benefits() {
  return (
    <section id="beneficios" className="py-20 bg-white/50">
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
            className="font-display text-3xl sm:text-4xl text-slate-900 text-center mb-3"
          >
            Por que a RenoveJá+?
          </motion.h2>
          <motion.p
            variants={fadeUp}
            className="text-slate-500 text-lg text-center mb-14 max-w-xl"
          >
            Tecnologia e propósito para transformar a saúde no Brasil
          </motion.p>

          <motion.div
            variants={stagger}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full"
          >
            {benefits.map(({ icon: Icon, title, description }) => (
              <motion.div
                key={title}
                variants={fadeUp}
                className="card card-hover p-6"
              >
                <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center mb-5">
                  <Icon size={24} className="text-primary-600" aria-hidden="true" />
                </div>
                <h3 className="font-display text-lg text-slate-900 mb-2">
                  {title}
                </h3>
                <p className="text-slate-500 text-sm leading-relaxed">
                  {description}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </Container>
    </section>
  );
}
