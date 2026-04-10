import type { ReactNode } from 'react';

export function InfoRow({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-1 py-2">
      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider sm:w-40 shrink-0">
        {label}
      </span>
      <span className="text-sm text-slate-700 break-words">{value}</span>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-10 px-4">
      {icon && <div className="mb-3 text-slate-300">{icon}</div>}
      <p className="text-sm font-semibold text-slate-600">{title}</p>
      {description && (
        <p className="text-xs text-slate-400 mt-1 max-w-sm">{description}</p>
      )}
    </div>
  );
}
