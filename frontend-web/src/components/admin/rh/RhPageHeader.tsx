import { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface RhBreadcrumb {
  label: string;
  href?: string;
}

export interface RhPageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  breadcrumbs?: RhBreadcrumb[];
  className?: string;
}

export const RhPageHeader = ({
  title,
  subtitle,
  actions,
  breadcrumbs,
  className,
}: RhPageHeaderProps) => {
  return (
    <header className={cn('flex flex-col gap-3', className)}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="breadcrumb">
          <ol className="flex items-center gap-1 text-[11px] text-muted-foreground">
            {breadcrumbs.map((bc, i) => {
              const isLast = i === breadcrumbs.length - 1;
              return (
                <li
                  key={`${bc.label}-${i}`}
                  className="flex items-center gap-1"
                >
                  {bc.href && !isLast ? (
                    <a
                      href={bc.href}
                      className="transition-colors hover:text-foreground"
                    >
                      {bc.label}
                    </a>
                  ) : (
                    <span
                      className={isLast ? 'font-medium text-foreground' : ''}
                    >
                      {bc.label}
                    </span>
                  )}
                  {!isLast && <ChevronRight className="h-3 w-3" aria-hidden />}
                </li>
              );
            })}
          </ol>
        </nav>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
        {actions && (
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        )}
      </div>
    </header>
  );
};

export default RhPageHeader;
