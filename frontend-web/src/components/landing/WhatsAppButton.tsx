import { motion } from 'framer-motion';
import { MessageCircle } from 'lucide-react';

export function WhatsAppButton() {
  return (
    <motion.a
      href="https://wa.me/5511986318000"
      target="_blank"
      rel="noopener noreferrer"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 1, type: 'spring', stiffness: 200 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-[#25D366] text-white px-5 py-4 rounded-full shadow-2xl hover:shadow-[0_8px_32px_rgba(37,211,102,0.4)] transition-shadow group"
    >
      <MessageCircle className="w-6 h-6" />
      <span className="font-semibold hidden sm:inline-block group-hover:inline-block transition-all">
        Falar no WhatsApp
      </span>
    </motion.a>
  );
}
