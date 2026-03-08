import { motion } from 'framer-motion';
import { MessageCircle, HelpCircle } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const faqs = [
  {
    question: 'O que pode e o que não pode ser renovado?',
    answer: 'O serviço é indicado para receitas de medicamentos de uso contínuo e pedidos de exames de rotina. Medicamentos controlados, receituários especiais e casos que exigem consulta presencial não são atendidos por este serviço. Cada pedido passa por avaliação individual.',
  },
  {
    question: 'Quanto tempo leva para receber minha receita?',
    answer: 'A maioria dos pedidos é processada em até 2 horas. O tempo pode variar conforme a demanda e a complexidade do pedido. Após o envio e pagamento, você receberá atualizações sobre o status diretamente no app.',
  },
  {
    question: 'Meus dados estão seguros?',
    answer: 'Sim. Utilizamos criptografia de ponta (SSL/TLS) e seguimos todas as diretrizes da LGPD (Lei Geral de Proteção de Dados). Seus dados pessoais e médicos são tratados com total sigilo e confidencialidade.',
  },
  {
    question: 'A receita digital é aceita nas farmácias?',
    answer: 'Sim! Todas as receitas são emitidas com Certificado Digital ICP-Brasil, o que garante validade jurídica em todo território nacional. As farmácias são obrigadas a aceitar receitas digitais conforme legislação vigente.',
  },
  {
    question: 'Quais formas de pagamento são aceitas?',
    answer: 'Aceitamos PIX (aprovação instantânea), cartões de crédito (Visa, Mastercard, Elo, American Express), cartões de débito e boleto bancário. O pagamento é processado de forma segura.',
  },
  {
    question: 'E se meu pedido for recusado?',
    answer: 'Caso o pedido seja recusado pelo profissional avaliador, você receberá o reembolso integral automaticamente. O valor retorna para o mesmo método de pagamento utilizado em até 7 dias úteis.',
  },
  {
    question: 'O serviço atende urgências ou emergências?',
    answer: 'NÃO. Este serviço não é destinado a situações de urgência ou emergência médica. Em caso de sintomas graves, mal-estar súbito ou qualquer emergência, procure imediatamente atendimento presencial ou ligue para o SAMU (192).',
  },
  {
    question: 'O app funciona em todo o Brasil?',
    answer: 'Sim! O RenoveJá+ atende pacientes de todo o Brasil. Como o serviço é 100% digital, você pode usar de qualquer lugar com acesso à internet.',
  },
];

export function AppFAQSection() {
  return (
    <section id="faq" className="py-16 sm:py-24 lg:py-32 bg-background relative overflow-hidden">
      <div className="container mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-8 sm:mb-12"
        >
          <span className="inline-block text-primary font-semibold text-sm uppercase tracking-wider mb-4">
            FAQ
          </span>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-6">
            Perguntas <span className="text-gradient">Frequentes</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Tire suas dúvidas sobre o funcionamento do app.
          </p>
        </motion.div>

        {/* FAQ Accordion */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="max-w-3xl mx-auto"
        >
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="bg-card rounded-2xl border border-border/50 shadow-card px-6 data-[state=open]:shadow-elevated data-[state=open]:border-primary/30 transition-all duration-300"
              >
                <AccordionTrigger className="text-left font-semibold text-foreground hover:text-primary hover:no-underline py-5 gap-4">
                  <div className="flex items-start gap-3">
                    <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary text-sm font-bold">
                      {index + 1}
                    </span>
                    <span className="text-sm sm:text-base">{faq.question}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-5 pl-11 leading-relaxed text-sm">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>

        {/* Contact CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-xl mx-auto mt-12 text-center"
        >
          <div className="bg-card border border-border/50 rounded-3xl p-8 shadow-card">
            <HelpCircle className="w-10 h-10 text-primary mx-auto mb-4" />
            <h3 className="font-bold text-foreground text-lg mb-2">Ainda com dúvidas?</h3>
            <p className="text-muted-foreground text-sm mb-6">
              Nossa equipe está pronta para ajudar você.
            </p>
            <a
              href="https://wa.me/5511986318000"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#25D366]/90 text-white font-semibold px-6 py-3 rounded-full transition-all hover:scale-105"
            >
              <MessageCircle className="w-5 h-5" />
              Falar com Suporte
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
