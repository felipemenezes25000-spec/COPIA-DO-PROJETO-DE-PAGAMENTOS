import type { ReactNode } from 'react';

type BadgeVariant = 'teal' | 'gray' | 'amber';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  teal: 'bg-primary-50 text-primary-700 ring-primary-200',
  gray: 'bg-slate-100 text-slate-600 ring-slate-200',
  amber: 'bg-amber-50 text-amber-700 ring-amber-200',
};

function Badge({ children, variant = 'teal', className = '' }: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center rounded-full px-3 py-0.5 text-xs font-semibold ring-1 ring-inset',
        variantClasses[variant],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </span>
  );
}

export { Badge };
export type { BadgeProps, BadgeVariant };
