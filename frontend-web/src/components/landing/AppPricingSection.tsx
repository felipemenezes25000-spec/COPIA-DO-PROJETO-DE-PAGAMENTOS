import { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, FileText, TestTube, MessageCircle, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ComingSoonModal } from '@/components/ui/coming-soon-modal';

const pricingPlans = [
  {
    id: 'receita-simples',
    icon: FileText,
    name: 'Receituário Simples',
    price: 'R$ 29,90',
    description: 'Medicamentos de uso contínuo como medicação para diabetes, pressão alta, hipotireoidismo, remédios manipulados, remédios para dor, remédios para ciclo menstrual, reposição de vitaminas, entre outros.',
    features: [
      'Avaliação em até 2 horas',
      'Receita com certificado digital ICP-Brasil',
      'Válida em todo Brasil',
      'Suporte por WhatsApp',
    ],
    popular: true,
    color: 'primary',
  },
  {
    id: 'receita-controlada',
    icon: FileText,
    name: 'Receituário Controlado',
    subtitle: 'Dupla via',
    price: 'R$ 49,90',
    description: 'Receitas para medicações controladas de uso contínuo como antidepressivos, anticonvulsivantes, remédios para dormir, remédios controlados para dor.',
    features: [
      'Avaliação em até 2 horas',
      'Receita com certificado digital ICP-Brasil',
      'Dupla via conforme legislação',
      'Suporte prioritário',
    ],
    popular: false,
    color: 'success',
  },
  {
    id: 'receita-azul',
    icon: FileText,
    name: 'Receituário AZUL',
    price: 'R$ 129,90',
    description: 'Receituário para medicações que possuem elevada vigilância por causarem dependência. São feitas em receituário azul.',
    features: [
      'Avaliação especializada',
      'Receita com certificado digital ICP-Brasil',
      'Receituário azul oficial',
      'Suporte prioritário 24h',
    ],
    popular: false,
    color: 'primary',
  },
];

const additionalServices = [
  {
    id: 'exames-lab',
    icon: TestTube,
    name: 'Exames Laboratoriais',
    price: 'R$ 19,90',
    description: 'Peça exames e receba em poucos instantes.',
  },
  {
    id: 'exames-imagem',
    icon: TestTube,
    name: 'Exames de Imagem',
    price: 'R$ 29,90',
    description: 'Por pedido de exame de imagem.',
  },
  {
    id: 'consulta-breve',
    icon: MessageCircle,
    name: 'Consulta Breve',
    price: 'R$ 3,99/min',
    description: 'Plantão de dúvidas em telemedicina para sanar dúvidas pontuais.',
    subtitle: 'Mínimo 5 minutos',
  },
];

export function AppPricingSection() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <section id="pricing" className="py-16 sm:py-24 lg:py-32 bg-app-dark relative overflow-hidden">
        {/* Decorative Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 w-64 sm:w-96 h-64 sm:h-96 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-64 sm:w-96 h-64 sm:h-96 bg-primary/10 rounded-full blur-3xl" />
        </div>

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
              Preços
            </span>
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
              Escolha seu <span className="text-primary">serviço</span>
            </h2>
            <p className="text-lg text-white/70">
              Preços transparentes e acessíveis. Pague apenas pelo que você precisa.
            </p>
          </motion.div>

          {/* Pricing Cards */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 mb-10 sm:mb-16">
            {pricingPlans.map((plan, index) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className={`relative ${plan.popular ? 'lg:-mt-4 lg:mb-4' : ''}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                    <span className="flex items-center gap-1 bg-primary text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-primary">
                      <Star className="w-3 h-3 fill-white" />
                      MAIS POPULAR
                    </span>
                  </div>
                )}
                
                <div className={`h-full bg-card rounded-3xl overflow-hidden shadow-xl border-2 transition-all duration-300 hover:shadow-2xl ${
                  plan.popular ? 'border-primary' : 'border-transparent'
                }`}>
                  {/* Card Header */}
                  <div className="bg-gradient-to-b from-card-header to-card py-8 px-6 text-center">
                    <div className={`w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center ${
                      plan.color === 'primary' ? 'bg-primary/20' : 'bg-success/20'
                    }`}>
                      <plan.icon className={`w-7 h-7 ${
                        plan.color === 'primary' ? 'text-primary' : 'text-success'
                      }`} />
                    </div>
                    <h3 className="font-display text-xl font-bold text-foreground">
                      {plan.name}
                    </h3>
                    {plan.subtitle && (
                      <p className="text-sm text-muted-foreground mt-1">{plan.subtitle}</p>
                    )}
                  </div>

                  {/* Card Body */}
                  <div className="p-6 space-y-6">
                    {/* Price */}
                    <div className="text-center">
                      <div className="inline-block bg-muted/50 rounded-2xl px-6 py-4">
                        <span className="text-sm text-muted-foreground">R$</span>
                        <span className="text-3xl font-bold text-foreground ml-1">
                          {plan.price.replace('R$ ', '')}
                        </span>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-sm text-muted-foreground text-center leading-relaxed">
                      {plan.description}
                    </p>

                    {/* Features */}
                    <ul className="space-y-3">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-3">
                          <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                          <span className="text-sm text-foreground">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    {/* CTA Button */}
                    <Button
                      onClick={() => setModalOpen(true)}
                      className={`w-full h-12 font-semibold rounded-full ${
                        plan.popular 
                          ? 'bg-primary hover:bg-primary/90 text-white shadow-primary' 
                          : 'bg-muted hover:bg-muted/80 text-foreground'
                      }`}
                    >
                      Solicitar
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Additional Services */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-4xl mx-auto"
          >
            <h3 className="text-xl font-bold text-white text-center mb-8">
              Outros Serviços
            </h3>
            
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {additionalServices.map((service, index) => (
                <motion.div
                  key={service.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-card rounded-2xl p-5 shadow-lg border border-border/50 hover:border-primary/30 hover:shadow-xl transition-all duration-300"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <service.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-bold text-foreground text-sm">{service.name}</h4>
                      {service.subtitle && (
                        <p className="text-xs text-muted-foreground">{service.subtitle}</p>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">{service.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-primary">{service.price}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setModalOpen(true)}
                      className="text-primary hover:bg-primary/10 rounded-full px-4"
                    >
                      Solicitar
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Trust Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex justify-center mt-12"
          >
            <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-6 py-3">
              <svg className="w-5 h-5 text-success" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                <path d="M9 12l2 2 4-4"/>
              </svg>
              <span className="text-white/90 text-sm font-medium">
                Satisfação garantida ou reembolso total
              </span>
            </div>
          </motion.div>
        </div>
      </section>

      <ComingSoonModal 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)} 
        platform="android" 
      />
    </>
  );
}
