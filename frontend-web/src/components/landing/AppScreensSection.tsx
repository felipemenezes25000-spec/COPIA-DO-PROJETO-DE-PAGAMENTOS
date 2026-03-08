import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Shield, Award, FileCheck, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';

const screens = [
  {
    id: 1,
    title: 'Envio Fácil',
    description: 'Upload da receita ou pedido de exame com a câmera',
    content: (
      <div className="space-y-4">
        <div className="text-center py-4">
          <div className="w-16 h-16 bg-primary/20 rounded-2xl mx-auto flex items-center justify-center mb-3">
            <span className="text-3xl">📸</span>
          </div>
          <p className="font-semibold text-foreground">Tire uma foto</p>
          <p className="text-xs text-muted-foreground">ou escolha da galeria</p>
        </div>
        <div className="border-2 border-dashed border-primary/30 rounded-xl p-6 text-center">
          <span className="text-4xl">📄</span>
          <p className="text-sm text-muted-foreground mt-2">Arraste aqui</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground justify-center">
          <Lock className="w-3 h-3" />
          <span>Envio criptografado</span>
        </div>
      </div>
    ),
  },
  {
    id: 2,
    title: 'Formulário Simples',
    description: 'Preencha informações básicas de forma rápida',
    content: (
      <div className="space-y-3">
        <div className="bg-muted rounded-lg p-3">
          <p className="text-xs text-muted-foreground mb-1">Nome completo</p>
          <p className="text-sm font-medium text-foreground">João Silva</p>
        </div>
        <div className="bg-muted rounded-lg p-3">
          <p className="text-xs text-muted-foreground mb-1">CPF</p>
          <p className="text-sm font-medium text-foreground">•••.•••.•••-00</p>
        </div>
        <div className="bg-muted rounded-lg p-3">
          <p className="text-xs text-muted-foreground mb-1">Medicamento</p>
          <p className="text-sm font-medium text-foreground">Losartana 50mg</p>
        </div>
        <div className="bg-primary text-primary-foreground rounded-lg p-3 text-center font-semibold text-sm">
          Continuar →
        </div>
      </div>
    ),
  },
  {
    id: 3,
    title: 'Acompanhamento',
    description: 'Veja o status do seu pedido em tempo real',
    content: (
      <div className="space-y-3">
        {[
          { step: 'Enviado', status: 'done', icon: '✓' },
          { step: 'Em análise', status: 'current', icon: '⏳' },
          { step: 'Aprovação', status: 'pending', icon: '○' },
          { step: 'Disponível', status: 'pending', icon: '○' },
        ].map((item) => (
          <div 
            key={item.step}
            className={`flex items-center gap-3 p-3 rounded-lg ${
              item.status === 'done' ? 'bg-success/10' :
              item.status === 'current' ? 'bg-primary/10' :
              'bg-muted'
            }`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
              item.status === 'done' ? 'bg-success text-white' :
              item.status === 'current' ? 'bg-primary text-white' :
              'bg-muted-foreground/20 text-muted-foreground'
            }`}>
              {item.icon}
            </div>
            <span className={`text-sm font-medium ${
              item.status === 'pending' ? 'text-muted-foreground' : 'text-foreground'
            }`}>
              {item.step}
            </span>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: 4,
    title: 'Certificado Digital',
    description: 'Documento com assinatura digital ICP-Brasil',
    content: (
      <div className="text-center space-y-4">
        <div className="relative w-20 h-24 bg-gradient-to-br from-primary/20 to-success/20 rounded-lg mx-auto flex flex-col items-center justify-center border-2 border-primary/30">
          <span className="text-2xl mb-1">📋</span>
          <div className="absolute -top-2 -right-2 w-8 h-8 bg-success rounded-full flex items-center justify-center">
            <Award className="w-4 h-4 text-white" />
          </div>
        </div>
        <div>
          <p className="font-semibold text-foreground text-sm">Receita Digital</p>
          <p className="text-xs text-success font-medium">✓ Certificado ICP-Brasil</p>
        </div>
        <div className="bg-success/10 rounded-lg p-3 text-left">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-4 h-4 text-success" />
            <span className="text-xs font-semibold text-foreground">Assinatura Digital</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Dra. Maria Santos<br/>
            CRM: 123456-SP<br/>
            Válido juridicamente
          </p>
        </div>
      </div>
    ),
  },
  {
    id: 5,
    title: 'Download PDF',
    description: 'Receita ou pedido pronto para usar',
    content: (
      <div className="text-center space-y-4">
        <div className="relative w-20 h-24 bg-destructive/10 rounded-lg mx-auto flex flex-col items-center justify-center">
          <span className="text-3xl mb-1">📄</span>
          <span className="text-xs font-medium text-destructive">PDF</span>
          <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-success rounded-full flex items-center justify-center">
            <FileCheck className="w-3 h-3 text-white" />
          </div>
        </div>
        <div>
          <p className="font-semibold text-foreground">Receita_12345.pdf</p>
          <p className="text-xs text-success font-medium">✓ Assinado digitalmente</p>
          <p className="text-xs text-muted-foreground">Válida por 6 meses</p>
        </div>
        <div className="flex gap-2">
          <div className="flex-1 bg-primary text-primary-foreground rounded-lg p-2 text-center text-sm font-medium">
            Baixar
          </div>
          <div className="flex-1 bg-muted text-foreground rounded-lg p-2 text-center text-sm font-medium">
            Compartilhar
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 6,
    title: 'Validação QR Code',
    description: 'Farmácias podem validar a receita',
    content: (
      <div className="text-center space-y-4">
        <div className="w-24 h-24 bg-foreground rounded-lg mx-auto flex items-center justify-center">
          <div className="w-20 h-20 bg-background rounded grid grid-cols-4 gap-0.5 p-1">
            {Array.from({ length: 16 }).map((_, i) => (
              <div 
                key={i} 
                className={`${Math.random() > 0.5 ? 'bg-foreground' : 'bg-background'}`}
              />
            ))}
          </div>
        </div>
        <div>
          <p className="font-semibold text-foreground text-sm">QR Code de Validação</p>
          <p className="text-xs text-muted-foreground">Escaneie para verificar autenticidade</p>
        </div>
        <div className="bg-success/10 rounded-lg p-2 flex items-center justify-center gap-2">
          <Shield className="w-4 h-4 text-success" />
          <span className="text-xs font-medium text-success">Documento Autêntico</span>
        </div>
      </div>
    ),
  },
  {
    id: 7,
    title: 'Histórico',
    description: 'Todos os seus pedidos organizados',
    content: (
      <div className="space-y-3">
        {[
          { name: 'Losartana 50mg', date: 'Jan 2025', status: 'Ativo', cert: true },
          { name: 'Metformina 850mg', date: 'Dez 2024', status: 'Ativo', cert: true },
          { name: 'Exame Sangue', date: 'Nov 2024', status: 'Concluído', cert: true },
        ].map((item) => (
          <div key={item.name} className="bg-muted rounded-lg p-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-medium text-foreground">{item.name}</p>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                item.status === 'Ativo' ? 'bg-success/10 text-success' : 'bg-muted-foreground/10 text-muted-foreground'
              }`}>
                {item.status}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">{item.date}</p>
              {item.cert && (
                <span className="text-xs text-success flex items-center gap-1">
                  <Award className="w-3 h-3" /> Certificado
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: 8,
    title: 'Suporte',
    description: 'Ajuda rápida quando você precisar',
    content: (
      <div className="space-y-3">
        <div className="bg-primary/10 rounded-lg p-4 text-center">
          <span className="text-3xl mb-2 block">💬</span>
          <p className="font-semibold text-foreground text-sm">Chat ao Vivo</p>
          <p className="text-xs text-muted-foreground">Resposta em minutos</p>
        </div>
        <div className="bg-success/10 rounded-lg p-3 flex items-center gap-3">
          <span className="text-2xl">📱</span>
          <div>
            <p className="font-semibold text-foreground text-sm">WhatsApp</p>
            <p className="text-xs text-muted-foreground">(11) 98631-8000</p>
          </div>
        </div>
        <div className="bg-muted rounded-lg p-3 flex items-center gap-3">
          <span className="text-2xl">❓</span>
          <div>
            <p className="font-semibold text-foreground text-sm">FAQ</p>
            <p className="text-xs text-muted-foreground">Perguntas frequentes</p>
          </div>
        </div>
      </div>
    ),
  },
];

export function AppScreensSection() {
  const [currentIndex, setCurrentIndex] = useState(0);

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % screens.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + screens.length) % screens.length);
  };

  return (
    <section id="screenshots" className="py-24 lg:py-32 bg-background relative overflow-hidden">
      <div className="container mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <span className="inline-block text-primary font-semibold text-sm uppercase tracking-wider mb-4">
            Telas do App
          </span>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-6">
            Conheça a <span className="text-gradient">Experiência</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Interface intuitiva pensada para facilitar sua vida. Todos os documentos com certificado digital.
          </p>
        </motion.div>

        {/* Digital Certificate Badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="flex justify-center mb-12"
        >
          <div className="inline-flex items-center gap-3 bg-success/10 border border-success/20 rounded-full px-6 py-3 shadow-card">
            <Award className="w-5 h-5 text-success" />
            <span className="text-sm font-medium text-foreground">
              Todas as receitas e pedidos com <strong className="text-success">Certificado Digital ICP-Brasil</strong>
            </span>
            <Shield className="w-5 h-5 text-success" />
          </div>
        </motion.div>

        {/* Carousel */}
        <div className="relative max-w-4xl mx-auto">
          {/* Navigation Buttons */}
          <Button
            variant="outline"
            size="icon"
            onClick={prevSlide}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 lg:-translate-x-12 z-10 rounded-full shadow-lg hidden sm:flex"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={nextSlide}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 lg:translate-x-12 z-10 rounded-full shadow-lg hidden sm:flex"
          >
            <ChevronRight className="w-5 h-5" />
          </Button>

          {/* Phone Mockup Container */}
          <div className="flex justify-center">
            <div className="relative">
              {/* Phone Frame */}
              <div className="w-[280px] sm:w-[300px] aspect-[9/19] bg-foreground rounded-[3rem] p-3 shadow-elevated">
                {/* Screen */}
                <div className="w-full h-full bg-background rounded-[2.5rem] overflow-hidden">
                  {/* Status Bar */}
                  <div className="flex items-center justify-between px-6 py-3 bg-muted/50">
                    <span className="text-xs font-medium text-foreground">9:41</span>
                    <div className="flex items-center gap-1">
                      <div className="w-4 h-2 border border-foreground rounded-sm">
                        <div className="w-3/4 h-full bg-success rounded-sm"></div>
                      </div>
                    </div>
                  </div>

                  {/* Content */}
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentIndex}
                      initial={{ opacity: 0, x: 50 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -50 }}
                      transition={{ duration: 0.3 }}
                      className="px-4 py-4"
                    >
                      {screens[currentIndex].content}
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Notch */}
                <div className="absolute top-3 left-1/2 -translate-x-1/2 w-24 h-6 bg-foreground rounded-full" />
              </div>
            </div>
          </div>

          {/* Screen Info */}
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mt-8"
          >
            <h3 className="font-display text-xl font-bold text-foreground mb-2">
              {screens[currentIndex].title}
            </h3>
            <p className="text-muted-foreground">
              {screens[currentIndex].description}
            </p>
          </motion.div>

          {/* Dots Navigation */}
          <div className="flex justify-center gap-2 mt-6">
            {screens.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentIndex
                    ? 'w-8 bg-primary'
                    : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
                }`}
              />
            ))}
          </div>

          {/* Mobile Navigation */}
          <div className="flex justify-center gap-4 mt-6 sm:hidden">
            <Button variant="outline" size="sm" onClick={prevSlide}>
              <ChevronLeft className="w-4 h-4 mr-1" />
              Anterior
            </Button>
            <Button variant="outline" size="sm" onClick={nextSlide}>
              Próximo
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
