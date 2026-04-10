import type { ReactNode } from 'react';
import { AlertTriangle, Sparkles, Clock, CircleDashed } from 'lucide-react';

export type QuickFilterKey = 'stale' | 'high_score' | 'unanalyzed' | 'recent' | null;

interface QuickFilterChipsProps {
  active: QuickFilterKey;
  onChange: (key: QuickFilterKey) => void;
  /** Count for the "stale" filter (pendentes há +3 dias). */
  staleCount: number;
  /** Count of candidates with AI score ≥ 80 waiting for a decision. */
  highScoreCount: number;
  /** Count of candidates without any AI analysis. */
  unanalyzedCount: number;
  /** Count of candidates registered in the last 7 days. */
  recentCount: number;
  /** Whether AI features are available — hides the AI-related chips when not. */
  aiAvailable: boolean;
}

interface ChipDef {
  key: QuickFilterKey;
  label: string;
  icon: ReactNode;
  count: number;
  activeClass: string;
  inactiveClass: string;
  hidden?: boolean;
}

/**
 * Row of "smart filter" chips shown above the main filter bar.
 *
 * Clicking a chip toggles its filter on or off (repeated click clears it).
 * Only one chip can be active at a time — they're mutually exclusive and
 * stack on top of whatever is configured in the regular filter bar.
 *
 * Chips with a zero count are rendered at reduced opacity but still
 * clickable — clicking them simply reveals the empty state, which is
 * a useful confirmation of "no stale candidates right now".
 */
export default function QuickFilterChips({
  active,
  onChange,
  staleCount,
  highScoreCount,
  unanalyzedCount,
  recentCount,
  aiAvailable,
}: QuickFilterChipsProps) {
  const chips: ChipDef[] = [
    {
      key: 'stale',
      label: 'Parados há +3 dias',
      icon: <AlertTriangle size={13} strokeWidth={2.5} aria-hidden="true" />,
      count: staleCount,
      activeClass:
        'bg-gradient-to-r from-amber-500 to-orange-500 text-white border-transparent shadow-[0_6px_16px_-6px_rgba(251,146,60,0.5)]',
      inactiveClass:
        'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100',
    },
    {
      key: 'high_score',
      label: 'Score IA ≥ 80',
      icon: <Sparkles size={13} strokeWidth={2.5} aria-hidden="true" />,
      count: highScoreCount,
      activeClass:
        'bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white border-transparent shadow-[0_6px_16px_-6px_rgba(139,92,246,0.5)]',
      inactiveClass:
        'bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100',
      hidden: !aiAvailable,
    },
    {
      key: 'unanalyzed',
      label: 'Sem análise IA',
      icon: <CircleDashed size={13} strokeWidth={2.5} aria-hidden="true" />,
      count: unanalyzedCount,
      activeClass:
        'bg-gradient-to-r from-slate-700 to-slate-900 text-white border-transparent shadow-[0_6px_16px_-6px_rgba(15,23,42,0.5)]',
      inactiveClass:
        'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200',
      hidden: !aiAvailable,
    },
    {
      key: 'recent',
      label: 'Últimos 7 dias',
      icon: <Clock size={13} strokeWidth={2.5} aria-hidden="true" />,
      count: recentCount,
      activeClass:
        'bg-gradient-to-r from-sky-500 to-blue-500 text-white border-transparent shadow-[0_6px_16px_-6px_rgba(14,165,233,0.5)]',
      inactiveClass:
        'bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100',
    },
  ];

  return (
    <div
      role="group"
      aria-label="Filtros rápidos"
      className="flex flex-wrap items-center gap-2"
    >
      <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400 pr-1">
        Atalhos
      </span>
      {chips
        .filter((chip) => !chip.hidden)
        .map((chip) => {
          const isActive = active === chip.key;
          return (
            <button
              key={chip.key ?? 'none'}
              type="button"
              onClick={() => onChange(isActive ? null : chip.key)}
              aria-pressed={isActive}
              aria-label={`${chip.label}: ${chip.count} candidato${chip.count === 1 ? '' : 's'}`}
              className={[
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400',
                isActive ? chip.activeClass : chip.inactiveClass,
                chip.count === 0 && !isActive ? 'opacity-60' : '',
              ].join(' ')}
            >
              {chip.icon}
              {chip.label}
              <span
                className={[
                  'inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full text-[10px] font-bold tabular-nums',
                  isActive
                    ? 'bg-white/25 text-white'
                    : 'bg-white/70 text-slate-700',
                ].join(' ')}
              >
                {chip.count}
              </span>
            </button>
          );
        })}
    </div>
  );
}
