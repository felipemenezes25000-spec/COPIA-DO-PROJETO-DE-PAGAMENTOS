import { useRef, type KeyboardEvent } from 'react';
import type { LucideIcon } from 'lucide-react';

export interface TabItem {
  id: string;
  label: string;
  icon: LucideIcon;
  /** Optional numeric badge rendered inline (e.g. notes count). */
  badge?: number;
}

interface CandidateTabsProps {
  tabs: TabItem[];
  active: string;
  onChange: (id: string) => void;
}

export default function CandidateTabs({ tabs, active, onChange }: CandidateTabsProps) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  function handleKeyDown(e: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'Home' && e.key !== 'End') {
      return;
    }
    e.preventDefault();
    let next = index;
    if (e.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
    else if (e.key === 'ArrowRight') next = (index + 1) % tabs.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = tabs.length - 1;
    const tab = tabs[next];
    if (tab) {
      onChange(tab.id);
      refs.current[next]?.focus();
    }
  }

  return (
    <div
      role="tablist"
      aria-label="Seções do candidato"
      className="flex gap-1 overflow-x-auto border-b border-slate-200 -mx-4 sm:mx-0 px-4 sm:px-0 scrollbar-hide"
    >
      {tabs.map((tab, i) => {
        const Icon = tab.icon;
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            role="tab"
            type="button"
            id={`tab-${tab.id}`}
            aria-selected={isActive}
            aria-controls={`panel-${tab.id}`}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={(e) => handleKeyDown(e, i)}
            className={[
              'relative inline-flex items-center gap-2 px-4 py-3 text-sm font-semibold whitespace-nowrap border-b-2 -mb-px transition-all',
              isActive
                ? 'text-primary-600 border-primary-600'
                : 'text-slate-500 border-transparent hover:text-slate-800 hover:border-slate-200',
            ].join(' ')}
          >
            <Icon
              size={15}
              aria-hidden="true"
              className={isActive ? 'text-primary-500' : ''}
            />
            {tab.label}
            {typeof tab.badge === 'number' && tab.badge > 0 && (
              <span
                className={[
                  'inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full text-[10px] font-bold tabular-nums',
                  isActive
                    ? 'bg-primary-100 text-primary-700'
                    : 'bg-slate-100 text-slate-600',
                ].join(' ')}
                aria-label={`${tab.badge} ${tab.badge === 1 ? 'item' : 'itens'}`}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
