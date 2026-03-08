import { motion } from 'framer-motion';
import { Check, Sparkles, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const plans = [
  {
    name: 'Básico',
    description: 'Ideal para uso eventual',
    price: '49',
    cents: '90',
    period: 'por receita',
    popular: false,
    features: [
      'Uma renovação de receita',
      'Resposta em até 2h',
      'Receita digital válida',
      'Suporte por WhatsApp',
      'Histórico de receitas',
    ],
  },
  {
    name: 'Mensal+',
    description: 'Mais escolhido',
    price: '39',
    cents: '90',
    period: 'por mês',
    popular: true,
    features: [
      '3 renovações por mês',
      'Prioridade no atendimento',
      'Receita digital válida',
      'Suporte prioritário 24/7',
      'Histórico completo',
      'Lembretes automáticos',
    ],
  },
  {
    name: 'Anual+',
    description: 'Melhor custo-benefício',
    price: '29',
    cents: '90',
    period: 'por mês',
    popular: false,
    originalPrice: '49,90',
    features: [
      'Renovações ilimitadas',
      'Atendimento VIP',
      'Receita digital válida',
      'Suporte premium 24/7',
      'Histórico completo',
      'Lembretes personalizados',
      'Desconto em teleconsultas',
    ],
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

export function PricingSection() {
  return (
    <section id="pricing" className="py-24 lg:py-32 bg-background relative overflow-hidden">
      {/* Background Decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[500px] bg-gradient-to-b from-accent/80 to-transparent rounded-full blur-3xl opacity-60" />
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
            Planos e Preços
          </span>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-6">
            Escolha o Plano <span className="text-gradient">Ideal</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Opções flexíveis para atender suas necessidades. Todos os planos incluem médicos certificados e receitas válidas em todo Brasil.
          </p>
        </motion.div>

        {/* Pricing Cards */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid md:grid-cols-3 gap-6 lg:gap-8 max-w-5xl mx-auto"
        >
          {plans.map((plan) => (
            <motion.div
              key={plan.name}
              variants={itemVariants}
              whileHover={{ y: -8 }}
              className={`relative rounded-2xl ${
                plan.popular
                  ? 'bg-gradient-to-br from-primary to-primary-glow p-[2px]'
                  : ''
              }`}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                  <div className="flex items-center gap-1.5 bg-primary text-primary-foreground px-4 py-1.5 rounded-full text-sm font-semibold shadow-primary">
                    <Sparkles className="w-4 h-4" />
                    Mais Escolhido
                  </div>
                </div>
              )}

              <div className={`h-full bg-card rounded-2xl p-6 lg:p-8 ${
                plan.popular ? '' : 'border border-border shadow-card'
              }`}>
                {/* Plan Header */}
                <div className="text-center mb-6">
                  <h3 className="font-display text-xl font-bold text-foreground mb-1">
                    {plan.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">{plan.description}</p>
                </div>

                {/* Price */}
                <div className="text-center mb-6 pb-6 border-b border-border">
                  {plan.originalPrice && (
                    <p className="text-sm text-muted-foreground line-through mb-1">
                      R$ {plan.originalPrice}
                    </p>
                  )}
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-sm text-muted-foreground">R$</span>
                    <span className="text-5xl font-bold text-foreground">{plan.price}</span>
                    <span className="text-xl font-semibold text-foreground">,{plan.cents}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{plan.period}</p>
                </div>

                {/* Features */}
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check className="w-3 h-3 text-primary" />
                      </div>
                      <span className="text-sm text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Link to="/cadastro" className="block">
                  <Button
                    className={`w-full font-semibold ${
                      plan.popular
                        ? 'shadow-primary hover:shadow-large'
                        : ''
                    }`}
                    variant={plan.popular ? 'default' : 'outline'}
                  >
                    Começar Agora
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Trust Badge */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
          className="text-center mt-12"
        >
          <p className="text-sm text-muted-foreground">
            🔒 Pagamento seguro via PIX, cartão de crédito ou boleto
          </p>
        </motion.div>
      </div>
    </section>
  );
}
