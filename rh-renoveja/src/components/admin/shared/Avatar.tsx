import { memo } from 'react';

interface AvatarProps {
  name: string;
  /** Pixel size of the circle — 32, 40, 48, 64, 88. */
  size?: 32 | 40 | 48 | 64 | 88;
  /** Optional ring color override (default: none). */
  ring?: 'primary' | 'emerald' | 'amber' | 'red' | 'violet' | 'none';
  /** Subtle elevation shadow — used on the detail sidebar's big avatar. */
  elevated?: boolean;
  className?: string;
}

/* ------------------------------------------------------------------ */
/* Deterministic color from a name string                              */
/*                                                                     */
/* We keep the palette to 8 slate-friendly pairs so every avatar reads */
/* as "part of the brand" instead of a random rainbow. The seed is a   */
/* tiny DJB2 hash so the same name always produces the same hue across */
/* mounts and across pages.                                             */
/* ------------------------------------------------------------------ */

const GRADIENTS: Array<[from: string, to: string, text: string]> = [
  ['from-sky-400', 'to-sky-600', 'text-white'],
  ['from-teal-400', 'to-emerald-600', 'text-white'],
  ['from-violet-400', 'to-purple-600', 'text-white'],
  ['from-rose-400', 'to-pink-600', 'text-white'],
  ['from-amber-400', 'to-orange-600', 'text-white'],
  ['from-indigo-400', 'to-blue-600', 'text-white'],
  ['from-cyan-400', 'to-sky-600', 'text-white'],
  ['from-fuchsia-400', 'to-purple-600', 'text-white'],
];

function hash(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = (h * 33) ^ s.charCodeAt(i);
  }
  return h >>> 0;
}

function getInitials(name: string): string {
  const clean = (name || '').trim();
  if (!clean) return '?';
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const SIZE_MAP: Record<NonNullable<AvatarProps['size']>, { box: string; text: string }> = {
  32: { box: 'w-8 h-8', text: 'text-[11px]' },
  40: { box: 'w-10 h-10', text: 'text-xs' },
  48: { box: 'w-12 h-12', text: 'text-sm' },
  64: { box: 'w-16 h-16', text: 'text-lg' },
  88: { box: 'w-[88px] h-[88px]', text: 'text-2xl' },
};

const RING_MAP: Record<NonNullable<AvatarProps['ring']>, string> = {
  none: '',
  primary: 'ring-2 ring-primary-200',
  emerald: 'ring-2 ring-emerald-200',
  amber: 'ring-2 ring-amber-200',
  red: 'ring-2 ring-red-200',
  violet: 'ring-2 ring-violet-200',
};

function AvatarImpl({
  name,
  size = 40,
  ring = 'none',
  elevated = false,
  className = '',
}: AvatarProps) {
  const initials = getInitials(name);
  const palette = GRADIENTS[hash(name) % GRADIENTS.length];
  const [from, to, text] = palette;
  const dims = SIZE_MAP[size];
  const ringCls = RING_MAP[ring];

  return (
    <div
      aria-hidden="true"
      className={[
        'inline-flex items-center justify-center shrink-0 rounded-full font-bold tracking-tight bg-gradient-to-br',
        from,
        to,
        text,
        dims.box,
        dims.text,
        ringCls,
        elevated ? 'shadow-[0_10px_24px_-8px_rgba(15,23,42,0.25)]' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {initials}
    </div>
  );
}

const Avatar = memo(AvatarImpl);
export default Avatar;
