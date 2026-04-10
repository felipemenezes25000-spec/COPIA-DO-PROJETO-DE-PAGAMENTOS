import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * CSS-only tooltip (hover/focus reveal) — no positioning engine.
 * `TooltipContent` is positioned above the trigger via Tailwind classes.
 * Use `side` prop on `TooltipContent` to change direction.
 */

const TooltipProvider: React.FC<{
  children: React.ReactNode;
  delayDuration?: number;
  skipDelayDuration?: number;
  disableHoverableContent?: boolean;
}> = ({ children }) => <>{children}</>;

const Tooltip = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement>
>(({ className, children, ...props }, ref) => (
  <span
    ref={ref}
    className={cn('group/tooltip relative inline-flex', className)}
    {...props}
  >
    {children}
  </span>
));
Tooltip.displayName = 'Tooltip';

export interface TooltipTriggerProps extends React.HTMLAttributes<HTMLSpanElement> {
  asChild?: boolean;
}

const TooltipTrigger = React.forwardRef<HTMLSpanElement, TooltipTriggerProps>(
  ({ className, children, ...props }, ref) => (
    <span
      ref={ref}
      role="button"
      tabIndex={0}
      className={cn('inline-flex outline-none', className)}
      {...props}
    >
      {children}
    </span>
  )
);
TooltipTrigger.displayName = 'TooltipTrigger';

export interface TooltipContentProps extends React.HTMLAttributes<HTMLDivElement> {
  side?: 'top' | 'bottom' | 'left' | 'right';
}

const sideClasses: Record<NonNullable<TooltipContentProps['side']>, string> = {
  top: 'bottom-full left-1/2 mb-2 -translate-x-1/2',
  bottom: 'top-full left-1/2 mt-2 -translate-x-1/2',
  left: 'right-full top-1/2 mr-2 -translate-y-1/2',
  right: 'left-full top-1/2 ml-2 -translate-y-1/2',
};

const TooltipContent = React.forwardRef<HTMLDivElement, TooltipContentProps>(
  ({ className, side = 'top', role = 'tooltip', ...props }, ref) => (
    <div
      ref={ref}
      role={role}
      className={cn(
        'pointer-events-none absolute z-50 whitespace-nowrap rounded-md border bg-popover px-3 py-1.5 text-xs text-popover-foreground opacity-0 shadow-md transition-opacity duration-150 group-focus-within/tooltip:opacity-100 group-hover/tooltip:opacity-100',
        sideClasses[side],
        className
      )}
      {...props}
    />
  )
);
TooltipContent.displayName = 'TooltipContent';

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
