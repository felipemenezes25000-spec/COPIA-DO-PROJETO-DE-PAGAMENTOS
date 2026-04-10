import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

export type AiAnomalySeveridade = 'baixa' | 'media' | 'alta';

export interface AiAnomalyBadgeProps {
  severidade: AiAnomalySeveridade;
  children?: ReactNode;
  className?: string;
}

const STYLES: Record<AiAnomalySeveridade, string> = {
  baixa: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
  media:
    'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  alta: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
};

const LABELS: Record<AiAnomalySeveridade, string> = {
  baixa: 'Anomalia baixa',
  media: 'Anomalia média',
  alta: 'Anomalia alta',
};

export const AiAnomalyBadge = ({
  severidade,
  children,
  className,
}: AiAnomalyBadgeProps) => {
  const label = children ?? LABELS[severidade];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold',
        STYLES[severidade],
        className
      )}
    >
      {severidade === 'alta' ? (
        <motion.span
          animate={{ scale: [1, 1.25, 1], opacity: [1, 0.7, 1] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
          className="inline-flex"
          aria-hidden
        >
          <AlertTriangle className="h-3 w-3" />
        </motion.span>
      ) : (
        <AlertTriangle className="h-3 w-3" aria-hidden />
      )}
      {label}
    </span>
  );
};

export default AiAnomalyBadge;
