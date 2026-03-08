import { useState, useRef } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { 
  Smartphone, 
  Download, 
  UserPlus, 
  Camera, 
  FileCheck, 
  ChevronLeft, 
  ChevronRight,
  Shield,
  Bell,
  CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';

// Placeholder URLs - replace with actual store URLs
const GOOGLE_PLAY_URL = 'https://play.google.com/store/apps/details?id=GOOGLE_PLAY_URL_AQUI';
const APP_STORE_URL = 'https://apps.apple.com/app/APP_STORE_URL_AQUI';

interface TutorialStep {
  step: number;
  icon: typeof Download;
  title: string;
  description: string;
  androidSteps: string[];
  iosSteps: string[];
  screenContent: React.ReactNode;
}

const tutorialSteps: TutorialStep[] = [
  {
    step: 1,
    icon: Download,
    title: 'Baixe o App',
    description: 'Acesse a loja do seu celular e baixe o RenoveJá+ gratuitamente',
    androidSteps: [
      'Abra a Google Play Store no seu Android',
      'Pesquise por "RenoveJá+"',
      'Toque em "Instalar" e aguarde',
      'Abra o app após a instalação',
    ],
    iosSteps: [
      'Abra a App Store no seu iPhone',
      'Pesquise por "RenoveJá+"',
      'Toque em "Obter" e confirme com Face ID ou senha',
      'Abra o app após a instalação',
    ],
    screenContent: (
      <div className="flex flex-col h-full">
        {/* Store Header */}
        <div className="bg-primary/10 p-3 flex items-center gap-3">
          <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-lg">R+</span>
          </div>
          <div className="flex-1">
            <p className="font-bold text-foreground text-sm">RenoveJá+</p>
            <p className="text-xs text-muted-foreground">Saúde Digital</p>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-xs text-amber-500">★★★★★</span>
              <span className="text-xs text-muted-foreground">4.9</span>
            </div>
          </div>
        </div>
        
        {/* App Preview Images */}
        <div className="flex gap-2 p-3 overflow-hidden">
          {[1, 2, 3].map((i) => (
            <div key={i} className="w-16 h-28 bg-gradient-to-b from-primary/20 to-primary/5 rounded-lg flex-shrink-0" />
          ))}
        </div>

        {/* Install Button */}
        <div className="px-3">
          <motion.div 
            animate={{ scale: [1, 1.02, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="bg-primary text-white rounded-lg py-3 text-center font-bold text-sm shadow-lg"
          >
            Instalar
          </motion.div>
        </div>

        {/* Info */}
        <div className="p-3 mt-auto">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="font-bold text-foreground text-sm">5K+</p>
              <p className="text-xs text-muted-foreground">Downloads</p>
            </div>
            <div>
              <p className="font-bold text-foreground text-sm">4.9</p>
              <p className="text-xs text-muted-foreground">Avaliação</p>
            </div>
            <div>
              <p className="font-bold text-foreground text-sm">18+</p>
              <p className="text-xs text-muted-foreground">Idade</p>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    step: 2,
    icon: UserPlus,
    title: 'Crie sua Conta',
    description: 'Cadastre-se de forma rápida e segura',
    androidSteps: [
      'Toque em "Criar Conta"',
      'Informe seu email e crie uma senha',
      'Preencha seus dados pessoais',
      'Confirme seu email',
    ],
    iosSteps: [
      'Toque em "Criar Conta"',
      'Você pode usar "Entrar com Apple" para agilizar',
      'Preencha seus dados pessoais',
      'Confirme seu email',
    ],
    screenContent: (
      <div className="flex flex-col h-full p-4">
        {/* Logo */}
        <div className="text-center mb-4">
          <div className="w-14 h-14 bg-primary rounded-2xl mx-auto flex items-center justify-center mb-2">
            <span className="text-white font-bold text-xl">R+</span>
          </div>
          <p className="font-bold text-foreground">RenoveJá+</p>
        </div>

        {/* Form */}
        <div className="space-y-3">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Email</p>
            <div className="bg-muted rounded-lg p-2.5 text-sm text-muted-foreground">
              seu@email.com
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Senha</p>
            <div className="bg-muted rounded-lg p-2.5 text-sm text-muted-foreground">
              ••••••••
            </div>
          </div>
          <motion.div 
            animate={{ scale: [1, 1.02, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="bg-primary text-white rounded-lg py-2.5 text-center font-bold text-sm"
          >
            Criar Conta
          </motion.div>
        </div>

        {/* Social Login */}
        <div className="mt-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">ou</span>
            <div className="flex-1 h-px bg-border" />
          </div>
          <div className="flex gap-2">
            <div className="flex-1 bg-muted rounded-lg py-2 text-center text-xs font-medium flex items-center justify-center gap-2">
              <span>🍎</span> Apple
            </div>
            <div className="flex-1 bg-muted rounded-lg py-2 text-center text-xs font-medium flex items-center justify-center gap-2">
              <span>🔷</span> Google
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    step: 3,
    icon: Camera,
    title: 'Envie sua Receita',
    description: 'Fotografe ou faça upload da receita vencida',
    androidSteps: [
      'Na tela inicial, toque em "Nova Renovação"',
      'Permita acesso à câmera quando solicitado',
      'Fotografe a receita com boa iluminação',
      'Revise a imagem e confirme',
    ],
    iosSteps: [
      'Na tela inicial, toque em "Nova Renovação"',
      'Permita acesso à câmera quando solicitado',
      'Fotografe a receita com boa iluminação',
      'Revise a imagem e confirme',
    ],
    screenContent: (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-3 border-b border-border flex items-center gap-3">
          <span className="text-muted-foreground">←</span>
          <p className="font-bold text-foreground text-sm">Nova Renovação</p>
        </div>

        {/* Camera View */}
        <div className="flex-1 bg-gradient-to-b from-slate-800 to-slate-900 flex flex-col items-center justify-center p-4 relative">
          {/* Camera Frame */}
          <div className="w-full aspect-[3/4] border-2 border-dashed border-white/50 rounded-lg flex items-center justify-center mb-4">
            <div className="text-center">
              <div className="w-12 h-12 bg-white/20 rounded-full mx-auto flex items-center justify-center mb-2">
                <Camera className="w-6 h-6 text-white" />
              </div>
              <p className="text-white/80 text-xs">Posicione a receita aqui</p>
            </div>
          </div>

          {/* Tips */}
          <div className="absolute bottom-2 left-2 right-2">
            <div className="bg-black/50 backdrop-blur-sm rounded-lg p-2 text-center">
              <p className="text-white text-xs">💡 Use boa iluminação</p>
            </div>
          </div>
        </div>

        {/* Capture Button */}
        <div className="p-4 bg-slate-900">
          <motion.div 
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-16 h-16 bg-white rounded-full mx-auto flex items-center justify-center shadow-xl"
          >
            <div className="w-14 h-14 bg-primary rounded-full" />
          </motion.div>
        </div>
      </div>
    ),
  },
  {
    step: 4,
    icon: FileCheck,
    title: 'Receba sua Receita Digital',
    description: 'Documento com certificado digital válido',
    androidSteps: [
      'Acompanhe o status em "Meus Pedidos"',
      'Receba notificação quando estiver pronto',
      'Baixe o PDF com certificado digital',
      'Apresente na farmácia ou envie por WhatsApp',
    ],
    iosSteps: [
      'Acompanhe o status em "Meus Pedidos"',
      'Receba notificação quando estiver pronto',
      'Baixe o PDF com certificado digital',
      'Apresente na farmácia ou compartilhe',
    ],
    screenContent: (
      <div className="flex flex-col h-full p-3">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <p className="font-bold text-foreground text-sm">Meus Pedidos</p>
          <Bell className="w-5 h-5 text-primary" />
        </div>

        {/* Success Card */}
        <motion.div 
          animate={{ y: [0, -2, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="bg-success/10 border border-success/30 rounded-xl p-3 mb-3"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-success rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-foreground text-sm">Receita Pronta!</p>
              <p className="text-xs text-muted-foreground">Losartana 50mg</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs bg-success/20 text-success px-2 py-0.5 rounded-full">
                  ✓ Certificado Digital
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Download Button */}
        <motion.div 
          animate={{ scale: [1, 1.02, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="bg-primary text-white rounded-lg py-3 text-center font-bold text-sm flex items-center justify-center gap-2"
        >
          <Download className="w-4 h-4" />
          Baixar PDF
        </motion.div>

        {/* Share Options */}
        <div className="flex gap-2 mt-3">
          <div className="flex-1 bg-[#25D366]/10 border border-[#25D366]/30 rounded-lg py-2 text-center text-xs font-medium text-[#25D366]">
            📱 WhatsApp
          </div>
          <div className="flex-1 bg-muted rounded-lg py-2 text-center text-xs font-medium text-foreground">
            📤 Compartilhar
          </div>
        </div>

        {/* Certificate Info */}
        <div className="mt-auto pt-3 border-t border-border">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground">
              Assinado digitalmente - ICP-Brasil
            </span>
          </div>
        </div>
      </div>
    ),
  },
];

export function AppTutorialSection() {
  const [activeStep, setActiveStep] = useState(0);
  const [platform, setPlatform] = useState<'android' | 'ios'>('android');
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

  const currentStep = tutorialSteps[activeStep];

  const handleStepChange = (index: number) => {
    setActiveStep(index);
  };

  const nextStep = () => {
    if (activeStep < tutorialSteps.length - 1) {
      setActiveStep(activeStep + 1);
    }
  };

  const prevStep = () => {
    if (activeStep > 0) {
      setActiveStep(activeStep - 1);
    }
  };

  return (
    <section 
      id="tutorial" 
      ref={sectionRef}
      className="py-24 lg:py-32 bg-gradient-to-b from-background via-accent/20 to-background relative overflow-hidden"
    >
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-12"
        >
          <span className="inline-block text-primary font-semibold text-sm uppercase tracking-wider mb-4">
            Tutorial Completo
          </span>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-6">
            Como <span className="text-gradient">Baixar e Usar</span> o App
          </h2>
          <p className="text-lg text-muted-foreground">
            Siga o passo a passo interativo para começar a renovar suas receitas.
          </p>
        </motion.div>

        {/* Download Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex flex-col sm:flex-row gap-4 justify-center mb-12"
        >
          <a href={GOOGLE_PLAY_URL} target="_blank" rel="noopener noreferrer">
            <Button 
              size="lg" 
              className={`w-full sm:w-auto h-14 px-6 font-semibold gap-3 text-base transition-all ${
                platform === 'android' 
                  ? 'bg-primary shadow-primary hover:shadow-large' 
                  : 'bg-muted text-foreground hover:bg-primary hover:text-white'
              }`}
              onClick={() => setPlatform('android')}
            >
              <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
                <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/>
              </svg>
              <div className="text-left">
                <p className="text-xs opacity-80">Disponível no</p>
                <p className="font-bold">Google Play</p>
              </div>
            </Button>
          </a>
          
          <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer">
            <Button 
              size="lg" 
              variant="outline" 
              className={`w-full sm:w-auto h-14 px-6 font-semibold gap-3 text-base border-2 transition-all ${
                platform === 'ios' 
                  ? 'bg-foreground text-background border-foreground' 
                  : 'hover:bg-foreground hover:text-background'
              }`}
              onClick={() => setPlatform('ios')}
            >
              <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
                <path d="M18.71,19.5C17.88,20.74 17,21.95 15.66,21.97C14.32,22 13.89,21.18 12.37,21.18C10.84,21.18 10.37,21.95 9.1,22C7.79,22.05 6.8,20.68 5.96,19.47C4.25,17 2.94,12.45 4.7,9.39C5.57,7.87 7.13,6.91 8.82,6.88C10.1,6.86 11.32,7.75 12.11,7.75C12.89,7.75 14.37,6.68 15.92,6.84C16.57,6.87 18.39,7.1 19.56,8.82C19.47,8.88 17.39,10.1 17.41,12.63C17.44,15.65 20.06,16.66 20.09,16.67C20.06,16.74 19.67,18.11 18.71,19.5M13,3.5C13.73,2.67 14.94,2.04 15.94,2C16.07,3.17 15.6,4.35 14.9,5.19C14.21,6.04 13.07,6.7 11.95,6.61C11.8,5.46 12.36,4.26 13,3.5Z"/>
              </svg>
              <div className="text-left">
                <p className="text-xs opacity-80">Baixar na</p>
                <p className="font-bold">App Store</p>
              </div>
            </Button>
          </a>
        </motion.div>

        {/* Interactive Tutorial */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="max-w-6xl mx-auto"
        >
          {/* Step Indicators */}
          <div className="flex justify-center gap-2 mb-8">
            {tutorialSteps.map((step, index) => (
              <button
                key={step.step}
                onClick={() => handleStepChange(index)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
                  index === activeStep
                    ? 'bg-primary text-white shadow-primary'
                    : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                }`}
              >
                <span className="font-bold">{step.step}</span>
                <span className="hidden sm:inline text-sm">{step.title}</span>
              </button>
            ))}
          </div>

          {/* Main Content Grid */}
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* Phone Mockup */}
            <motion.div
              key={activeStep}
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              className="flex justify-center order-2 lg:order-1"
            >
              <div className="relative">
                {/* Phone Frame */}
                <div className="w-[280px] sm:w-[300px] aspect-[9/19] bg-foreground rounded-[3rem] p-3 shadow-2xl">
                  {/* Screen */}
                  <div className="w-full h-full bg-background rounded-[2.5rem] overflow-hidden">
                    {/* Status Bar */}
                    <div className="flex items-center justify-between px-6 py-2 bg-muted/50">
                      <span className="text-xs font-medium text-foreground">9:41</span>
                      <div className="flex items-center gap-1">
                        <div className="w-4 h-2 border border-foreground rounded-sm">
                          <div className="w-3/4 h-full bg-success rounded-sm"></div>
                        </div>
                      </div>
                    </div>

                    {/* Screen Content */}
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={activeStep}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.3 }}
                        className="h-[calc(100%-2rem)]"
                      >
                        {currentStep.screenContent}
                      </motion.div>
                    </AnimatePresence>
                  </div>

                  {/* Notch */}
                  <div className="absolute top-3 left-1/2 -translate-x-1/2 w-24 h-6 bg-foreground rounded-full" />
                </div>

                {/* Step Badge */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-4 -left-4 w-16 h-16 bg-primary rounded-2xl flex items-center justify-center shadow-primary"
                >
                  <span className="text-2xl font-bold text-white">{currentStep.step}</span>
                </motion.div>

                {/* Platform Badge */}
                <div className="absolute -bottom-2 -right-2 bg-card border border-border rounded-full px-3 py-1.5 shadow-lg flex items-center gap-2">
                  {platform === 'android' ? (
                    <>
                      <svg viewBox="0 0 24 24" className="w-4 h-4 text-success" fill="currentColor">
                        <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/>
                      </svg>
                      <span className="text-sm font-medium">Android</span>
                    </>
                  ) : (
                    <>
                      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                        <path d="M18.71,19.5C17.88,20.74 17,21.95 15.66,21.97C14.32,22 13.89,21.18 12.37,21.18C10.84,21.18 10.37,21.95 9.1,22C7.79,22.05 6.8,20.68 5.96,19.47C4.25,17 2.94,12.45 4.7,9.39C5.57,7.87 7.13,6.91 8.82,6.88C10.1,6.86 11.32,7.75 12.11,7.75C12.89,7.75 14.37,6.68 15.92,6.84C16.57,6.87 18.39,7.1 19.56,8.82C19.47,8.88 17.39,10.1 17.41,12.63C17.44,15.65 20.06,16.66 20.09,16.67C20.06,16.74 19.67,18.11 18.71,19.5M13,3.5C13.73,2.67 14.94,2.04 15.94,2C16.07,3.17 15.6,4.35 14.9,5.19C14.21,6.04 13.07,6.7 11.95,6.61C11.8,5.46 12.36,4.26 13,3.5Z"/>
                      </svg>
                      <span className="text-sm font-medium">iPhone</span>
                    </>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Instructions */}
            <motion.div
              key={`instructions-${activeStep}`}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="order-1 lg:order-2"
            >
              {/* Step Header */}
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
                  <currentStep.icon className="w-7 h-7 text-primary" />
                </div>
                <div>
                  <h3 className="font-display text-2xl font-bold text-foreground">
                    {currentStep.title}
                  </h3>
                  <p className="text-muted-foreground">{currentStep.description}</p>
                </div>
              </div>

              {/* Platform Tabs */}
              <div className="flex gap-2 mb-6">
                <button
                  onClick={() => setPlatform('android')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                    platform === 'android'
                      ? 'bg-success/10 border-2 border-success text-success'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                    <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/>
                  </svg>
                  <span className="font-medium">Android</span>
                </button>
                <button
                  onClick={() => setPlatform('ios')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                    platform === 'ios'
                      ? 'bg-foreground/10 border-2 border-foreground text-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                    <path d="M18.71,19.5C17.88,20.74 17,21.95 15.66,21.97C14.32,22 13.89,21.18 12.37,21.18C10.84,21.18 10.37,21.95 9.1,22C7.79,22.05 6.8,20.68 5.96,19.47C4.25,17 2.94,12.45 4.7,9.39C5.57,7.87 7.13,6.91 8.82,6.88C10.1,6.86 11.32,7.75 12.11,7.75C12.89,7.75 14.37,6.68 15.92,6.84C16.57,6.87 18.39,7.1 19.56,8.82C19.47,8.88 17.39,10.1 17.41,12.63C17.44,15.65 20.06,16.66 20.09,16.67C20.06,16.74 19.67,18.11 18.71,19.5M13,3.5C13.73,2.67 14.94,2.04 15.94,2C16.07,3.17 15.6,4.35 14.9,5.19C14.21,6.04 13.07,6.7 11.95,6.61C11.8,5.46 12.36,4.26 13,3.5Z"/>
                  </svg>
                  <span className="font-medium">iPhone</span>
                </button>
              </div>

              {/* Steps List */}
              <div className="bg-card rounded-2xl border border-border p-6 shadow-card">
                <AnimatePresence mode="wait">
                  <motion.ul
                    key={`${activeStep}-${platform}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-4"
                  >
                    {(platform === 'android' ? currentStep.androidSteps : currentStep.iosSteps).map((step, index) => (
                      <motion.li
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-start gap-3"
                      >
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-sm font-bold text-primary">{index + 1}</span>
                        </div>
                        <p className="text-foreground leading-relaxed">{step}</p>
                      </motion.li>
                    ))}
                  </motion.ul>
                </AnimatePresence>
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between mt-6">
                <Button
                  variant="outline"
                  onClick={prevStep}
                  disabled={activeStep === 0}
                  className="gap-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Anterior
                </Button>

                <div className="flex gap-1">
                  {tutorialSteps.map((_, index) => (
                    <div
                      key={index}
                      className={`w-2 h-2 rounded-full transition-all ${
                        index === activeStep ? 'w-6 bg-primary' : 'bg-muted-foreground/30'
                      }`}
                    />
                  ))}
                </div>

                <Button
                  onClick={nextStep}
                  disabled={activeStep === tutorialSteps.length - 1}
                  className="gap-2"
                >
                  Próximo
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="text-center mt-16"
        >
          <p className="text-muted-foreground mb-4">
            Precisa de ajuda? Estamos aqui para você!
          </p>
          <a 
            href="https://wa.me/5511986318000" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#25D366]/90 text-white px-6 py-3 rounded-full font-medium transition-all shadow-lg hover:shadow-xl"
          >
            <Smartphone className="w-5 h-5" />
            Fale com nosso suporte via WhatsApp
          </a>
        </motion.div>
      </div>
    </section>
  );
}
