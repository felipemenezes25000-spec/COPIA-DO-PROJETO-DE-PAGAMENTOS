import type { PeriodKey } from '../../../types/productivity';

const OPTIONS: { key: PeriodKey; label: string }[] = [
  { key: 'today', label: 'Hoje' },
  { key: '7d', label: '7 dias' },
  { key: '30d', label: '30 dias' },
  { key: '90d', label: '90 dias' },
];

interface PeriodPickerProps {
  value: PeriodKey;
  onChange: (key: PeriodKey) => void;
}

/**
 * Seletor de período pré-definido. Fase 1: apenas opções fixas. Range custom
 * fica para fase 2 (requer date picker, mais complexo).
 */
export default function PeriodPicker({ value, onChange }: PeriodPickerProps) {
  return (
    <div
      role="tablist"
      aria-label="Selecionar período"
      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-sm"
    >
      {OPTIONS.map((opt) => {
        const active = opt.key === value;
        return (
          <button
            key={opt.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.key)}
            className={[
              'px-3 py-1.5 text-xs font-medium rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400',
              active
                ? 'bg-primary-500 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100',
            ].join(' ')}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
