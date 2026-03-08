import { motion } from 'framer-motion';
import { Star, Quote } from 'lucide-react';

const testimonials = [
  {
    name: 'Maria Helena S.',
    location: 'São Paulo, SP',
    avatar: 'MH',
    rating: 5,
    text: 'Incrível! Renovei minha receita de pressão em menos de 1 hora. Super prático e seguro. Recomendo para todos que tomam medicamentos contínuos.',
  },
  {
    name: 'Roberto Carlos M.',
    location: 'Rio de Janeiro, RJ',
    avatar: 'RC',
    rating: 5,
    text: 'Trabalho muito e não tenho tempo para ir ao médico só para renovar receita. O RenoveJá resolveu meu problema. Atendimento excelente!',
  },
  {
    name: 'Ana Paula L.',
    location: 'Belo Horizonte, MG',
    avatar: 'AP',
    rating: 5,
    text: 'Minha mãe de 78 anos precisava renovar várias receitas. Fiz tudo pelo app e recebi as receitas no mesmo dia. Médicos muito atenciosos.',
  },
  {
    name: 'Fernando G.',
    location: 'Curitiba, PR',
    avatar: 'FG',
    rating: 5,
    text: 'Excelente serviço! O médico foi muito atencioso e tirou todas as minhas dúvidas. Receita chegou rápido e funcionou perfeitamente na farmácia.',
  },
  {
    name: 'Juliana Costa',
    location: 'Salvador, BA',
    avatar: 'JC',
    rating: 5,
    text: 'Já usei 3 vezes e sempre foi perfeito. O app é super fácil de usar e o suporte pelo WhatsApp é muito rápido. Super recomendo!',
  },
  {
    name: 'Paulo Ricardo T.',
    location: 'Fortaleza, CE',
    avatar: 'PR',
    rating: 5,
    text: 'Viajo muito a trabalho e sempre tinha problema para renovar receitas. Com o RenoveJá resolvo tudo pelo celular, de qualquer lugar.',
  },
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
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
    },
  },
};

export function TestimonialsSection() {
  return (
    <section id="testimonials" className="py-24 lg:py-32 bg-accent/50 relative overflow-hidden">
      {/* Background Decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -translate-y-1/2" />
        <div className="absolute top-1/2 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -translate-y-1/2" />
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
            Depoimentos
          </span>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-6">
            O Que Nossos <span className="text-gradient">Pacientes</span> Dizem
          </h2>
          <p className="text-lg text-muted-foreground">
            Mais de 1.500 pessoas já renovaram suas receitas conosco. Veja o que eles têm a dizer.
          </p>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex flex-wrap justify-center gap-8 lg:gap-16 mb-16"
        >
          {[
            { value: '4.9/5', label: 'Avaliação média' },
            { value: '1.527+', label: 'Receitas renovadas' },
            { value: '98%', label: 'Taxa de aprovação' },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-4xl lg:text-5xl font-bold text-primary mb-2">{stat.value}</p>
              <p className="text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </motion.div>

        {/* Testimonials Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {testimonials.map((testimonial) => (
            <motion.div
              key={testimonial.name}
              variants={itemVariants}
              whileHover={{ y: -4 }}
              className="group"
            >
              <div className="h-full bg-card rounded-2xl p-6 border border-border shadow-card hover:shadow-large transition-all duration-300">
                {/* Quote Icon */}
                <Quote className="w-10 h-10 text-primary/20 mb-4" />

                {/* Rating */}
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-warning text-warning" />
                  ))}
                </div>

                {/* Text */}
                <p className="text-muted-foreground leading-relaxed mb-6">
                  "{testimonial.text}"
                </p>

                {/* Author */}
                <div className="flex items-center gap-3 pt-4 border-t border-border">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center text-primary-foreground font-bold">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{testimonial.name}</p>
                    <p className="text-sm text-muted-foreground">{testimonial.location}</p>
                  </div>
                  <div className="ml-auto">
                    <span className="text-xs font-medium px-2 py-1 bg-success/10 text-success rounded-full">
                      Verificado
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
