import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  toast: (type: ToastType, message: string) => void;
}

/* ------------------------------------------------------------------ */
/* Context                                                             */
/* ------------------------------------------------------------------ */

const ToastContext = createContext<ToastContextValue | null>(null);

function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast deve ser usado dentro de <ToastProvider>');
  }
  return ctx;
}

/* ------------------------------------------------------------------ */
/* Styling helpers                                                     */
/* ------------------------------------------------------------------ */

const typeConfig: Record<
  ToastType,
  { icon: typeof CheckCircle; bg: string; iconColor: string; border: string }
> = {
  success: {
    icon: CheckCircle,
    bg: 'bg-white',
    iconColor: 'text-emerald-500',
    border: 'border-emerald-200',
  },
  error: {
    icon: XCircle,
    bg: 'bg-white',
    iconColor: 'text-red-500',
    border: 'border-red-200',
  },
  info: {
    icon: Info,
    bg: 'bg-white',
    iconColor: 'text-primary-500',
    border: 'border-primary-200',
  },
};

/* ------------------------------------------------------------------ */
/* Provider                                                            */
/* ------------------------------------------------------------------ */

const AUTO_DISMISS_MS = 5000;

function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const toast = useCallback(
    (type: ToastType, message: string) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setToasts((prev) => [...prev, { id, type, message }]);

      const timer = setTimeout(() => removeToast(id), AUTO_DISMISS_MS);
      timersRef.current.set(id, timer);
    },
    [removeToast],
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}

      {/* Toast container */}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="fixed top-4 right-4 z-[100] flex flex-col gap-3 pointer-events-none w-full max-w-sm"
      >
        <AnimatePresence initial={false}>
          {toasts.map((t) => {
            const cfg = typeConfig[t.type];
            const Icon = cfg.icon;

            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95, transition: { duration: 0.15 } }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                className={[
                  'pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 shadow-elevated',
                  cfg.bg,
                  cfg.border,
                ].join(' ')}
                role="status"
              >
                <Icon className={`h-5 w-5 mt-0.5 shrink-0 ${cfg.iconColor}`} aria-hidden="true" />
                <p className="flex-1 text-sm font-medium text-slate-700">{t.message}</p>
                <button
                  type="button"
                  onClick={() => removeToast(t.id)}
                  className="shrink-0 flex h-6 w-6 items-center justify-center rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                  aria-label="Fechar notificação"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export { ToastProvider, useToast };
export type { ToastType, Toast, ToastContextValue };
