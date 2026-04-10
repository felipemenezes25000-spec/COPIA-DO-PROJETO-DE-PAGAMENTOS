import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Código curto (12 hex) para URLs de pedidos. Aceita UUID completo ou short code. */
export function toShortId(id: string): string {
  const clean = id.replace(/-/g, '').toLowerCase();
  return clean.length >= 12 ? clean.slice(0, 12) : clean;
}
