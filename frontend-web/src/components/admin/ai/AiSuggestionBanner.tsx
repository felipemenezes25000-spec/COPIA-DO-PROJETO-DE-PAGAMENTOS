import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Info, AlertTriangle, CheckCircle2, X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type AiSuggestionVariant = 'info' | 'warning' | 'success';

export interface AiSuggestionBannerProps {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  dismissible?: boolean;
  variant?: AiSuggestionVariant;
  className?: string;
}

const VARIANTS: Record<
  AiSuggestionVariant,
  { bg: string; border: string; icon: typeof Info; iconColor: string }
> = {
  info: {
    bg: 'from-sky-500/10 via-background to-background',
    border: 'border-sky-500/30',
    icon: Info,
    iconColor: 'text-sky-500',
  },
  warning: {
    bg: 'from-amber-500/10 via-background to-background',
    border: 'border-amber-500/30',
    icon: AlertTriangle,
    iconColor: 'text-amber-500',
  },
  success: {
    bg: 'from-emerald-500/10 via-background to-background',
    border: 'border-emerald-500/30',
    icon: CheckCircle2,
    iconColor: 'text-emerald-500',
  },
};

export const AiSuggestionBanner = ({
  message,
  actionLabel,
  onAction,
  dismissible = false,
  variant = 'info',
  className,
}: AiSuggestionBannerProps) => {
  const [open, setOpen] = useState(true);
  const v = VARIANTS[variant];
  const Icon = v.icon;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className={cn(
            'relative flex items-center gap-3 rounded-lg border bg-gradient-to-r px-4 py-3',
            v.bg,
            v.border,
            className
          )}
          role="status"
        >
          <div className="relative shrink-0">
            <Icon className={cn('h-5 w-5', v.iconColor)} aria-hidden />
            <Sparkles
              className="absolute -right-1 -top-1 h-2.5 w-2.5 text-primary"
              aria-hidden
            />
          </div>
          <p className="flex-1 text-sm leading-snug text-foreground">
            {message}
          </p>
          {actionLabel && onAction && (
            <Button size="sm" variant="outline" onClick={onAction}>
              {actionLabel}
            </Button>
          )}
          {dismissible && (
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Fechar sugestão"
              className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AiSuggestionBanner;
