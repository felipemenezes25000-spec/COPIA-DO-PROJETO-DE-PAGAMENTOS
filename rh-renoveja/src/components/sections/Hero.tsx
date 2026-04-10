import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Stethoscope,
  HeartPulse,
  SmilePlus,
  Brain,
  Apple,
  Activity,
  Mic,
  Hand,
  Pill,
  TestTube2,
  Dumbbell,
  HeartHandshake,
  Shield,
  Video,
} from 'lucide-react';
import { Container } from '../layout/Container';
import { LogoIcon } from '../ui/Logo';

const stagger = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
  },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
  },
};

// 12 categorias profissionais de saúde regulamentadas com telemedicina
// reconhecida no Brasil. Cada cor de fundo (bg) e de ícone usa uma paleta
// distinta do Tailwind para facilitar o reconhecimento visual rápido — as 5
// primeiras são as "clássicas" e as 7 seguintes foram adicionadas em
// 2026-04-09 para cobrir toda a equipe multiprofissional de saúde.
//
// NOTA sobre safelist do Tailwind: as classes `bg-*-50` e `text-*-600` aqui
// usadas vêm literais, não são geradas dinamicamente — o Tailwind as detecta
// normalmente no scan de build. Se um dia passarem a ser dinâmicas
// (`bg-${color}-50`), será preciso adicioná-las no `safelist` de
// tailwind.config.ts.
const categories = [
  {
    icon: Stethoscope,
    title: 'Médicos',
    description: 'Clínica geral, especialidades, psiquiatria e mais',
    bg: 'bg-sky-50',
    iconColor: 'text-sky-600',
  },
  {
    icon: HeartPulse,
    title: 'Enfermeiros',
    description: 'Pós-consulta, follow-up, urgência, home care e mais',
    bg: 'bg-rose-50',
    iconColor: 'text-rose-600',
  },
  {
    icon: SmilePlus,
    title: 'Dentistas',
    description: 'Ortodontia, endodontia, implantodontia e mais',
    bg: 'bg-cyan-50',
    iconColor: 'text-cyan-600',
  },
  {
    icon: Brain,
    title: 'Psicólogos',
    description: 'Clínica, TCC, psicanálise, neuropsicologia e mais',
    bg: 'bg-purple-50',
    iconColor: 'text-purple-600',
  },
  {
    icon: Apple,
    title: 'Nutricionistas',
    description: 'Clínica, esportiva, materno-infantil e mais',
    bg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
  },
  {
    icon: Activity,
    title: 'Fisioterapeutas',
    description: 'Ortopédica, neurofuncional, respiratória, pediátrica e mais',
    bg: 'bg-orange-50',
    iconColor: 'text-orange-600',
  },
  {
    icon: Mic,
    title: 'Fonoaudiólogos',
    description: 'Voz, linguagem, audiologia, motricidade orofacial e mais',
    bg: 'bg-amber-50',
    iconColor: 'text-amber-600',
  },
  {
    icon: Hand,
    title: 'Terapeutas Ocupacionais',
    description: 'Saúde mental, reabilitação, TEA, gerontologia e mais',
    bg: 'bg-teal-50',
    iconColor: 'text-teal-600',
  },
  {
    icon: Pill,
    title: 'Farmacêuticos',
    description: 'Farmácia clínica, hospitalar, oncológica, magistral e mais',
    bg: 'bg-violet-50',
    iconColor: 'text-violet-600',
  },
  {
    icon: TestTube2,
    title: 'Biomédicos',
    description: 'Análises clínicas, genética, biologia molecular e mais',
    bg: 'bg-blue-50',
    iconColor: 'text-blue-600',
  },
  {
    icon: Dumbbell,
    title: 'Educadores Físicos',
    description: 'Personal, idosos, reabilitação cardiovascular, gestantes e mais',
    bg: 'bg-lime-50',
    iconColor: 'text-lime-600',
  },
  {
    icon: HeartHandshake,
    title: 'Assistentes Sociais',
    description: 'Saúde, hospitalar, saúde mental, famílias, cuidados paliativos e mais',
    bg: 'bg-pink-50',
    iconColor: 'text-pink-600',
  },
];

const highlights = [
  { icon: Video, label: 'Telemedicina' },
  { icon: Shield, label: 'LGPD' },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-28 lg:pt-36 pb-20 lg:pb-28">
      {/* Background decorative elements */}
      <div
        className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full opacity-15 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, #0EA5E9 0%, transparent 70%)' }}
        aria-hidden="true"
      />
      <div
        className="absolute -bottom-24 -right-24 w-[400px] h-[400px] rounded-full opacity-15 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, #38BDF8 0%, transparent 70%)' }}
        aria-hidden="true"
      />
      <div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full opacity-[0.07] blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, #0284C7 0%, transparent 60%)' }}
        aria-hidden="true"
      />
      {/* Subtle grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, #0284C7 1px, transparent 0)',
          backgroundSize: '40px 40px',
        }}
        aria-hidden="true"
      />

      <Container>
        <motion.div
          className="flex flex-col items-center text-center"
          variants={stagger}
          initial="hidden"
          animate="visible"
        >
          {/* Logo mark */}
          <motion.div variants={scaleIn} className="mb-6">
            <LogoIcon size={72} />
          </motion.div>

          {/* Badge */}
          <motion.span
            variants={fadeUp}
            className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium text-primary-700 bg-white/80 backdrop-blur-sm rounded-full border border-primary-200 shadow-sm mb-8"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Vagas abertas para profissionais de saúde
          </motion.span>

          {/* H1 */}
          <motion.h1
            variants={fadeUp}
            className="font-display font-bold text-slate-900 max-w-4xl mx-auto leading-[1.1] mb-6"
            style={{ fontSize: 'clamp(2rem, 5vw, 3.25rem)' }}
          >
            Faça parte da transformação da{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-primary-400">
              saúde digital
            </span>{' '}
            no Brasil
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            variants={fadeUp}
            className="text-slate-500 text-lg max-w-2xl mx-auto leading-relaxed mb-8"
          >
            Cadastre-se no banco de talentos da RenoveJá e conecte-se a
            oportunidades em telemedicina.
          </motion.p>

          {/* Highlights strip */}
          <motion.div
            variants={fadeUp}
            className="flex flex-wrap justify-center gap-4 mb-10"
          >
            {highlights.map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-2 px-4 py-2 bg-white/60 backdrop-blur-sm rounded-full border border-slate-200/60 text-sm text-slate-600"
              >
                <Icon size={16} className="text-primary-500" />
                {label}
              </div>
            ))}
          </motion.div>

          {/* CTA buttons */}
          <motion.div
            variants={fadeUp}
            className="flex flex-col sm:flex-row items-center gap-4 mb-16"
          >
            <Link to="/cadastro" className="btn-primary text-base px-10 py-4">
              Cadastrar agora
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
            <a href="#beneficios" className="btn-secondary text-base px-8 py-4">
              Saiba mais
            </a>
          </motion.div>

          {/* Category cards — grid responsivo 12 cards.
              Mobile: 2 cols × 6 rows
              sm    : 3 cols × 4 rows
              lg    : 4 cols × 3 rows (equilíbrio visual ótimo para 12)
              O padding foi reduzido em lg para dar mais densidade. */}
          <motion.div
            variants={stagger}
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-5 max-w-6xl mx-auto w-full"
          >
            {categories.map(({ icon: Icon, title, description, bg, iconColor }) => (
              <motion.div
                key={title}
                variants={fadeUp}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className="card p-4 lg:p-5 flex flex-col items-center text-center cursor-default group"
              >
                <div className={`w-12 h-12 lg:w-14 lg:h-14 rounded-2xl ${bg} flex items-center justify-center mb-3 lg:mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <Icon size={24} className={iconColor} aria-hidden="true" />
                </div>
                <h3 className="font-display font-semibold text-base lg:text-lg text-slate-900 mb-1 lg:mb-1.5">
                  {title}
                </h3>
                <p className="text-slate-500 text-xs lg:text-sm leading-relaxed">
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
