import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Header } from '../components/layout/Header';
import { Footer } from '../components/layout/Footer';
import { Hero } from '../components/sections/Hero';
import { Benefits } from '../components/sections/Benefits';
import { HowItWorks } from '../components/sections/HowItWorks';
import { FAQ } from '../components/sections/FAQ';

function HomePage() {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.2 }}
    >
      <Header />
      <main id="main-content">
        <Hero />
        <Benefits />
        <HowItWorks />
        <FAQ />
      </main>
      <Footer />
    </motion.div>
  );
}

export default HomePage;
