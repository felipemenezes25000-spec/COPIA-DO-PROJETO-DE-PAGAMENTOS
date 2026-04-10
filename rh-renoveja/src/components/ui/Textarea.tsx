import { forwardRef, useId, type TextareaHTMLAttributes } from 'react';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, maxLength, value, className = '', id: externalId, ...rest }, ref) => {
    const generatedId = useId();
    const id = externalId ?? generatedId;
    const errorId = `${id}-error`;

    const currentLength = typeof value === 'string' ? value.length : 0;

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

        <textarea
          ref={ref}
          id={id}
          value={value}
          maxLength={maxLength}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? errorId : undefined}
          className={[
            'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-800',
            'placeholder:text-slate-400 font-body resize-y min-h-[120px]',
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

        <div className="flex items-center justify-between">
          {error ? (
            <p id={errorId} className="text-sm text-error font-medium" role="alert">
              {error}
            </p>
          ) : (
            <span />
          )}

          {maxLength != null && (
            <span
              aria-live="polite"
              aria-atomic="true"
              className={[
                'text-xs font-medium tabular-nums',
                currentLength >= maxLength ? 'text-error' : 'text-slate-400',
              ].join(' ')}
            >
              {currentLength}/{maxLength}
            </span>
          )}
        </div>
      </div>
    );
  },
);

Textarea.displayName = 'Textarea';

export { Textarea };
export type { TextareaProps };
