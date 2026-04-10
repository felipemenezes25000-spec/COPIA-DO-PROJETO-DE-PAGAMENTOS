import * as React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Checkbox primitive simples (sem radix). Compatível com o shape
 * do shadcn: aceita `checked`, `onCheckedChange`, `disabled`.
 */
export interface CheckboxProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'onChange' | 'type'
> {
  onCheckedChange?: (checked: boolean) => void;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, checked, onCheckedChange, disabled, ...props }, ref) => {
    return (
      <label
        className={cn(
          'relative inline-flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center rounded border border-primary ring-offset-background focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
          checked && 'bg-primary text-primary-foreground',
          disabled && 'cursor-not-allowed opacity-50',
          className
        )}
      >
        <input
          ref={ref}
          type="checkbox"
          className="sr-only"
          checked={!!checked}
          disabled={disabled}
          onChange={(e) => onCheckedChange?.(e.target.checked)}
          {...props}
        />
        {checked && <Check className="h-3 w-3" aria-hidden />}
      </label>
    );
  }
);
Checkbox.displayName = 'Checkbox';
