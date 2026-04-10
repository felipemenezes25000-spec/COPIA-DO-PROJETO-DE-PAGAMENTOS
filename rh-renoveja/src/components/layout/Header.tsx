import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { Container } from './Container';
import { Logo } from '../ui/Logo';

const drawerVariants = {
  hidden: { x: '100%', opacity: 0 },
  visible: { x: 0, opacity: 1, transition: { type: 'spring' as const, damping: 26, stiffness: 300 } },
  exit: { x: '100%', opacity: 0, transition: { duration: 0.2, ease: 'easeIn' as const } },
};

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > 10);
    }
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  return (
    <>
      {/* Skip to content (accessibility) */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[60] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-primary-600 focus:text-white focus:outline-none"
      >
        Pular para o conteúdo
      </a>

      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-white/95 backdrop-blur-md shadow-card'
            : 'bg-transparent'
        }`}
      >
        <Container>
          <div className="flex items-center justify-between h-16 lg:h-20">
            <Link to="/" aria-label="RenoveJá - Página inicial">
              <Logo size={36} />
            </Link>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-4">
              <Link to="/cadastro" className="btn-primary text-sm px-6 py-2.5">
                Cadastre-se
              </Link>
            </div>

            {/* Mobile hamburger */}
            <button
              type="button"
              className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
              onClick={() => setMobileOpen(true)}
              aria-label="Abrir menu"
              aria-expanded={mobileOpen}
            >
              <Menu size={24} />
            </button>
          </div>
        </Container>

        {/* Mobile drawer */}
        <AnimatePresence>
          {mobileOpen && (
            <>
              <motion.div
                className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm md:hidden"
                variants={overlayVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                onClick={() => setMobileOpen(false)}
                aria-hidden="true"
              />
              <motion.div
                className="fixed top-0 right-0 bottom-0 z-50 w-80 max-w-[85vw] bg-white shadow-elevated md:hidden"
                variants={drawerVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                role="dialog"
                aria-modal="true"
                aria-label="Menu de navegação"
              >
                <div className="flex items-center justify-between p-4 border-b border-slate-100">
                  <Logo size={32} />
                  <button
                    type="button"
                    className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
                    onClick={() => setMobileOpen(false)}
                    aria-label="Fechar menu"
                  >
                    <X size={22} />
                  </button>
                </div>

                <nav className="flex flex-col gap-2 p-4">
                  <Link
                    to="/cadastro"
                    className="btn-primary text-center"
                    onClick={() => setMobileOpen(false)}
                  >
                    Cadastre-se
                  </Link>
                </nav>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </header>
    </>
  );
}
