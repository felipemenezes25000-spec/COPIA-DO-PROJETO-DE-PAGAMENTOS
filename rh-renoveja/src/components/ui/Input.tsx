import { forwardRef, useId, type InputHTMLAttributes, type ChangeEvent } from 'react';

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label?: string;
  error?: string;
  transform?: (value: string) => string;
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, transform, onChange, className = '', id: externalId, ...rest }, ref) => {
    const generatedId = useId();
    const id = externalId ?? generatedId;
    const errorId = `${id}-error`;

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
      if (transform) {
        e.target.value = transform(e.target.value);
      }
      onChange?.(e);
    };

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={id}
            className="font-semibold text-[13px] text-slate-700 tracking-wide"
          >
            {label}
          </label>
        )}

        <input
          ref={ref}
          id={id}
          onChange={handleChange}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? errorId : undefined}
          className={[
            'input-field',
            'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-800',
            'placeholder:text-slate-400 font-body',
            'transition-all duration-200',
            'focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500',
            error
              ? 'border-error ring-1 ring-error/30'
              : 'hover:border-slate-300',
            'disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed',
            className,
          ]
            .filter(Boolean)
            .join(' ')}
          {...rest}
        />

        {error && (
          <p id={errorId} className="text-sm text-error font-medium" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';

export { Input };
export type { InputProps };
