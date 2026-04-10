import { forwardRef, type ButtonHTMLAttributes, type ElementType, type ReactNode } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { Loader2 } from 'lucide-react';

type Variant = 'primary' | 'secondary' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

interface ButtonOwnProps {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
  as?: ElementType;
  children: ReactNode;
}

type ButtonProps = ButtonOwnProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof ButtonOwnProps> &
  Omit<HTMLMotionProps<'button'>, keyof ButtonOwnProps>;

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-md hover:shadow-glow disabled:from-primary-300 disabled:to-primary-200',
  secondary:
    'bg-white border-2 border-primary-500 text-primary-700 hover:bg-primary-50 disabled:border-slate-200 disabled:text-slate-400',
  ghost:
    'bg-transparent text-primary-700 hover:bg-primary-50 disabled:text-slate-400',
};

const sizeClasses: Record<Size, string> = {
  sm: 'px-4 py-2 text-sm rounded-lg gap-1.5',
  md: 'px-6 py-3 text-base rounded-xl gap-2',
  lg: 'px-8 py-4 text-lg rounded-xl gap-2.5',
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      fullWidth = false,
      as: Component,
      children,
      disabled,
      className = '',
      ...rest
    },
    ref,
  ) => {
    const Tag = Component
      ? motion(Component as ElementType)
      : motion.button;

    return (
      <Tag
        ref={ref}
        disabled={disabled || loading}
        whileHover={disabled || loading ? undefined : { scale: 1.02 }}
        whileTap={disabled || loading ? undefined : { scale: 0.98 }}
        className={[
          'inline-flex items-center justify-center font-body font-semibold transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-70',
          variantClasses[variant],
          sizeClasses[size],
          fullWidth ? 'w-full' : '',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        {...rest}
      >
        {loading && (
          <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden="true" />
        )}
        {children}
      </Tag>
    );
  },
);

Button.displayName = 'Button';

export { Button };
export type { ButtonProps };
