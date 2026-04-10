import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { Check } from 'lucide-react';

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: ReactNode;
  error?: string;
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, error, className = '', id: externalId, checked, ...rest }, ref) => {
    const generatedId = useId();
    const id = externalId ?? generatedId;
    const errorId = `${id}-error`;

    return (
      <div className="flex flex-col gap-1">
        <label htmlFor={id} className="inline-flex items-start gap-3 cursor-pointer group">
          <span className="relative mt-0.5 flex shrink-0">
            <input
              ref={ref}
              id={id}
              type="checkbox"
              checked={checked}
              aria-invalid={error ? 'true' : undefined}
              aria-describedby={error ? errorId : undefined}
              className="peer sr-only"
              {...rest}
            />
            <span
              className={[
                'flex h-5 w-5 items-center justify-center rounded-md border-2 transition-all duration-200',
                'peer-focus-visible:ring-2 peer-focus-visible:ring-primary-500 peer-focus-visible:ring-offset-2',
                'peer-disabled:opacity-50 peer-disabled:cursor-not-allowed',
                checked
                  ? 'border-primary-600 bg-primary-600'
                  : 'border-slate-300 bg-white group-hover:border-primary-400',
                error ? 'border-error' : '',
                className,
              ]
                .filter(Boolean)
                .join(' ')}
              aria-hidden="true"
            >
              <Check
                className={[
                  'h-3.5 w-3.5 text-white transition-all duration-200',
                  checked ? 'scale-100 opacity-100' : 'scale-75 opacity-0',
                ].join(' ')}
                strokeWidth={3}
              />
            </span>
          </span>

          {label && (
            <span className="text-sm text-slate-600 leading-snug select-none">{label}</span>
          )}
        </label>

        {error && (
          <p id={errorId} className="text-sm text-error font-medium ml-8" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  },
);

Checkbox.displayName = 'Checkbox';

export { Checkbox };
export type { CheckboxProps };
