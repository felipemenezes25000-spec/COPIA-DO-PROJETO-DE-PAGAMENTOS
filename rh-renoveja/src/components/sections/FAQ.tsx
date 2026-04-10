import { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { Container } from '../layout/Container';

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
  },
};

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: 'Preciso ter experiência em telemedicina?',
    answer:
      'Não! Oferecemos treinamento completo na plataforma. Profissionais de todas as experiências são bem-vindos.',
  },
  {
    question: 'Preciso de equipamentos especiais?',
    answer:
      'Você precisa de: computador ou smartphone com câmera, microfone e internet estável (mínimo 5 Mbps). A plataforma funciona no navegador e no app.',
  },
  {
    question: 'Meus dados estão seguros?',
    answer:
      'Sim. Seguimos integralmente a LGPD. Seus dados são armazenados em servidores AWS no Brasil (São Paulo) com criptografia AES-256.',
  },
  {
    question: 'Como funciona a análise por IA?',
    answer:
      'Utilizamos inteligência artificial para agilizar a triagem de currículos, mas a decisão final é SEMPRE humana. Você pode solicitar revisão de qualquer decisão automatizada (Art. 20, LGPD).',
  },
];

function AccordionItem({
  item,
  index,
  isOpen,
  onToggle,
}: {
  item: FAQItem;
  index: number;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const panelId = `faq-panel-${index}`;
  const prefersReduced = useReducedMotion();
  const chevronTransition = prefersReduced
    ? { duration: 0 }
    : { duration: 0.25, ease: 'easeInOut' as const };
  const panelTransition = prefersReduced
    ? { duration: 0 }
    : { duration: 0.3, ease: [0.22, 1, 0.36, 1] as const };
  return (
    <div className="border-b border-slate-200">
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center justify-between w-full py-5 text-left gap-4 group"
        aria-expanded={isOpen}
        aria-controls={panelId}
      >
        <span className="font-body font-semibold text-slate-800 group-hover:text-primary-700 transition-colors">
          {item.question}
        </span>
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={chevronTransition}
          className="shrink-0 text-slate-500"
        >
          <ChevronDown size={20} aria-hidden="true" />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="content"
            id={panelId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={panelTransition}
            className="overflow-hidden"
          >
            <p className="pb-5 text-slate-600 leading-relaxed text-[15px]">
              {item.answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const prefersReduced = useReducedMotion();

  return (
    <section className="py-20 bg-white/50">
      <Container>
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={{
            hidden: {},
            visible: {
              transition: { staggerChildren: prefersReduced ? 0 : 0.08 },
            },
          }}
          className="max-w-3xl mx-auto"
        >
          <motion.h2
            variants={fadeUp}
            className="font-display text-3xl sm:text-4xl text-slate-900 text-center mb-12"
          >
            Perguntas Frequentes
          </motion.h2>

          <motion.div variants={fadeUp}>
            {faqs.map((item, index) => (
              <AccordionItem
                key={item.question}
                item={item}
                index={index}
                isOpen={openIndex === index}
                onToggle={() =>
                  setOpenIndex(openIndex === index ? null : index)
                }
              />
            ))}
          </motion.div>
        </motion.div>
      </Container>
    </section>
  );
}
