import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Download, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ComingSoonModal } from '@/components/ui/coming-soon-modal';
import logo from '@/assets/logo-renoveja-new.png';

const navLinks = [
  { name: 'Início', href: '#hero' },
  { name: 'Como Funciona', href: '#steps' },
  { name: 'Benefícios', href: '#benefits' },
  { name: 'Telas', href: '#screenshots' },
  { name: 'Tutorial', href: '#tutorial' },
  { name: 'Preços', href: '#pricing' },
  { name: 'Depoimentos', href: '#testimonials' },
  { name: 'FAQ', href: '#faq' },
];

export function AppHeader() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('hero');
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
      setShowScrollTop(window.scrollY > 500);
      
      // Calculate scroll progress
      const scrollHeight = document.body.scrollHeight - window.innerHeight;
      const progress = scrollHeight > 0 ? (window.scrollY / scrollHeight) * 100 : 0;
      setScrollProgress(Math.min(100, progress));

      // Detect active section
      const sections = navLinks.map(link => link.href.replace('#', ''));
      for (const section of sections.reverse()) {
        const element = document.getElementById(section);
        if (element) {
          const rect = element.getBoundingClientRect();
          if (rect.top <= 150) {
            setActiveSection(section);
            break;
          }
        }
      }
    };
    
    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Initial call
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (href: string) => {
    const element = document.querySelector(href);
    if (element) {
      const offset = 80; // Header height
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;
      
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
    setIsMobileMenuOpen(false);
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          isScrolled
            ? 'bg-card/95 backdrop-blur-xl shadow-elevated border-b border-border/50'
            : 'bg-card/80 backdrop-blur-sm'
        }`}
      >
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16 sm:h-20">
            {/* Logo */}
            <button 
              onClick={scrollToTop}
              className="flex items-center gap-2 sm:gap-3 group"
            >
              <motion.div 
                className="relative"
                initial={{ opacity: 0, scale: 0.8, rotate: -10 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
                whileHover={{ scale: 1.05, rotate: 2 }}
              >
                <img 
                  src={logo} 
                  alt="RenoveJá+" 
                  className="h-10 sm:h-12 w-auto drop-shadow-md" 
                />
              </motion.div>
              <motion.span 
                className="text-lg sm:text-xl font-bold hidden sm:block"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, ease: "easeOut", delay: 0.4 }}
              >
                <span className="text-primary">Renove</span>
                <span className="text-foreground">Já</span>
                <span className="text-primary">+</span>
              </motion.span>
            </button>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-1">
              {navLinks.map((link) => {
                const isActive = activeSection === link.href.replace('#', '');
                return (
                  <button
                    key={link.name}
                    onClick={() => scrollToSection(link.href)}
                    className={`px-4 py-2 rounded-xl font-medium transition-all duration-300 text-sm relative ${
                      isActive 
                        ? 'text-primary bg-primary/10' 
                        : 'text-foreground/70 hover:text-primary hover:bg-primary/5'
                    }`}
                  >
                    {link.name}
                    {isActive && (
                      <motion.div
                        layoutId="activeSection"
                        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary"
                      />
                    )}
                  </button>
                );
              })}
            </nav>

            {/* CTA Button */}
            <div className="hidden lg:flex items-center gap-3">
              <Button 
                onClick={() => setModalOpen(true)}
                className="font-semibold shadow-primary hover:shadow-elevated transition-all duration-300 gap-2 rounded-xl"
              >
                <Download className="w-4 h-4" />
                Baixar App
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg transition-colors text-foreground hover:bg-muted"
              aria-label="Menu"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Scroll Progress Bar */}
        <motion.div
          className="absolute bottom-0 left-0 h-0.5 bg-primary"
          style={{ width: `${scrollProgress}%` }}
        />
      </motion.header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm lg:hidden"
            />
            
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="fixed inset-x-0 top-20 z-50 lg:hidden bg-background/95 backdrop-blur-xl border border-border/50 shadow-elevated mx-4 rounded-2xl overflow-hidden"
            >
              <nav className="p-4 flex flex-col gap-1">
                {navLinks.map((link) => {
                  const isActive = activeSection === link.href.replace('#', '');
                  return (
                    <button
                      key={link.name}
                      onClick={() => scrollToSection(link.href)}
                      className={`px-4 py-3 rounded-xl font-medium text-left transition-all ${
                        isActive 
                          ? 'text-primary bg-primary/10' 
                          : 'text-foreground hover:bg-muted'
                      }`}
                    >
                      {link.name}
                    </button>
                  );
                })}
                <div className="pt-3 mt-2 border-t border-border">
                  <Button 
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setModalOpen(true);
                    }}
                    className="w-full font-semibold gap-2 h-12"
                  >
                    <Download className="w-5 h-5" />
                    Baixar App Grátis
                  </Button>
                </div>
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Scroll to Top Button */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={scrollToTop}
            className="fixed bottom-24 right-6 z-40 w-12 h-12 bg-primary text-white rounded-full shadow-primary flex items-center justify-center hover:scale-110 transition-transform"
            aria-label="Voltar ao topo"
          >
            <ChevronUp className="w-6 h-6" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Coming Soon Modal */}
      <ComingSoonModal 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)} 
        platform="android" 
      />
    </>
  );
}
