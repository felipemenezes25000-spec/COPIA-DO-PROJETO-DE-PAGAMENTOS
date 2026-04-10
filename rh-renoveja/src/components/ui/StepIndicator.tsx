import { motion, useReducedMotion } from 'framer-motion';
import { Check } from 'lucide-react';

interface StepIndicatorProps {
  steps: string[];
  currentStep: number;
}

function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  const prefersReduced = useReducedMotion();
  const circleTransition = prefersReduced ? { duration: 0 } : undefined;
  const checkTransition = prefersReduced
    ? { duration: 0 }
    : { type: 'spring' as const, stiffness: 400, damping: 20 };
  const pulseAnimate = prefersReduced
    ? { scale: 1, opacity: 0.6 }
    : { scale: [1, 1.15, 1], opacity: [0.6, 0, 0.6] };
  const pulseTransition = prefersReduced
    ? { duration: 0 }
    : { duration: 2, repeat: Infinity, ease: 'easeInOut' as const };
  const barTransition = prefersReduced
    ? { duration: 0 }
    : { duration: 0.4, ease: 'easeInOut' as const };
  return (
    <>
      {/* Desktop */}
      <nav aria-label="Progresso" className="hidden md:block">
        <ol className="flex items-center justify-between">
          {steps.map((label, index) => {
            const stepNum = index + 1;
            const isCompleted = stepNum < currentStep;
            const isActive = stepNum === currentStep;
            const isPending = stepNum > currentStep;

            return (
              <li key={label} className="flex flex-1 items-center last:flex-none">
                <div className="flex flex-col items-center gap-2">
                  <motion.div
                    initial={false}
                    animate={{
                      scale: isActive ? 1 : 0.95,
                      backgroundColor: isCompleted
                        ? 'var(--color-primary-600)'
                        : isActive
                          ? 'white'
                          : 'var(--color-slate-100)',
                    }}
                    transition={circleTransition}
                    className={[
                      'relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
                      isCompleted ? 'text-white' : '',
                      isActive
                        ? 'ring-2 ring-primary-500 ring-offset-2 text-primary-700'
                        : '',
                      isPending ? 'text-slate-400' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    {isCompleted ? (
                      <motion.span
                        initial={{ scale: prefersReduced ? 1 : 0 }}
                        animate={{ scale: 1 }}
                        transition={checkTransition}
                      >
                        <Check className="h-5 w-5" strokeWidth={2.5} />
                      </motion.span>
                    ) : (
                      stepNum
                    )}

                    {isActive && (
                      <motion.span
                        className="absolute inset-0 rounded-full border-2 border-primary-400"
                        animate={pulseAnimate}
                        transition={pulseTransition}
                      />
                    )}
                  </motion.div>

                  <span
                    className={[
                      'text-xs font-medium text-center max-w-[90px] leading-tight',
                      isCompleted || isActive ? 'text-primary-700' : 'text-slate-400',
                    ].join(' ')}
                  >
                    {label}
                  </span>
                </div>

                {/* Connector line */}
                {index < steps.length - 1 && (
                  <div className="relative mx-2 h-0.5 flex-1 bg-slate-200 self-start mt-5">
                    <motion.div
                      className="absolute inset-y-0 left-0 bg-primary-500 rounded-full"
                      initial={false}
                      animate={{ width: isCompleted ? '100%' : '0%' }}
                      transition={barTransition}
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Mobile */}
      <nav aria-label="Progresso" className="md:hidden">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-700">
              Etapa {currentStep} de {steps.length}
            </span>
            <span className="text-sm font-medium text-primary-600">
              {steps[currentStep - 1]}
            </span>
          </div>

          <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-primary-600 to-primary-500"
              initial={false}
              animate={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
              transition={{ duration: 0.4, ease: 'easeInOut' }}
            />
          </div>
        </div>
      </nav>
    </>
  );
}

export { StepIndicator };
export type { StepIndicatorProps };
