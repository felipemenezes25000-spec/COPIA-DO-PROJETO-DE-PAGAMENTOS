import { motion } from 'framer-motion';
import { Star, Quote, CheckCircle2 } from 'lucide-react';

const testimonials = [
  {
    name: 'Maria Helena Santos',
    location: 'São Paulo, SP',
    avatar: 'MH',
    rating: 5,
    text: 'App muito fácil de usar! Renovei minha receita em minutos e recebi tudo no celular. Super prático para quem não tem tempo.',
  },
  {
    name: 'Roberto Carlos Mendes',
    location: 'Rio de Janeiro, RJ',
    avatar: 'RC',
    rating: 5,
    text: 'Trabalho muito e não tenho tempo para ir ao consultório. O RenoveJá+ resolveu meu problema. Recomendo demais!',
  },
  {
    name: 'Ana Paula Lima',
    location: 'Belo Horizonte, MG',
    avatar: 'AP',
    rating: 5,
    text: 'Uso para ajudar minha mãe idosa. Consigo gerenciar as receitas dela pelo meu celular. Excelente serviço!',
  },
  {
    name: 'Fernando Gomes',
    location: 'Curitiba, PR',
    avatar: 'FG',
    rating: 5,
    text: 'Equipe super atenciosa! Recebi minha receita no mesmo dia. Funcionou perfeitamente na farmácia.',
  },
  {
    name: 'Juliana Costa Silva',
    location: 'Salvador, BA',
    avatar: 'JC',
    rating: 5,
    text: 'Já usei várias vezes e nunca tive problemas. O app é intuitivo e o suporte responde muito rápido.',
  },
  {
    name: 'Paulo Ricardo Torres',
    location: 'Fortaleza, CE',
    avatar: 'PR',
    rating: 5,
    text: 'Viajo muito a trabalho e agora consigo renovar receitas de qualquer lugar do Brasil. Muito satisfeito!',
  },
];

export function AppTestimonialsSection() {
  return (
    <section id="testimonials" className="py-16 sm:py-24 lg:py-32 bg-background relative overflow-hidden">
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
            Depoimentos
          </span>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-6">
            Quem usa, <span className="text-gradient">recomenda</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Veja o que pessoas reais estão dizendo sobre sua experiência com o RenoveJá+.
          </p>
        </motion.div>

        {/* Testimonials Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="group"
            >
              <div className="h-full bg-card rounded-3xl p-6 border border-border/50 shadow-card hover:shadow-elevated hover:-translate-y-2 hover:border-primary/30 transition-all duration-300">
                {/* Quote Icon */}
                <Quote className="w-8 h-8 text-primary/20 mb-4" />

                {/* Rating */}
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star 
                        key={i} 
                        className={`w-4 h-4 ${i < testimonial.rating ? 'fill-amber-400 text-amber-400' : 'fill-muted text-muted'}`} 
                      />
                    ))}
                  </div>
                  <span className="flex items-center gap-1 text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="w-3 h-3" />
                    Verificado
                  </span>
                </div>

                {/* Text */}
                <p className="text-foreground leading-relaxed mb-6 text-sm">
                  "{testimonial.text}"
                </p>

                {/* Author */}
                <div className="flex items-center gap-3 pt-4 border-t border-border">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-white font-bold text-sm">
                    {testimonial.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-foreground text-sm truncate">{testimonial.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{testimonial.location}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Trust Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex justify-center mt-12"
        >
          <div className="inline-flex items-center gap-4 bg-card border border-border/50 rounded-full px-6 py-4 shadow-card">
            <div className="flex -space-x-2">
              {testimonials.slice(0, 5).map((t, i) => (
                <div
                  key={i}
                  className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-white text-xs font-bold border-2 border-card"
                >
                  {t.avatar}
                </div>
              ))}
            </div>
            <div className="text-sm">
              <span className="font-bold text-foreground">+5.000</span>{' '}
              <span className="text-muted-foreground">usuários satisfeitos</span>
            </div>
            <div className="flex items-center gap-1 bg-amber-500/10 px-3 py-1.5 rounded-full">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span className="font-bold text-foreground">4.9</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
