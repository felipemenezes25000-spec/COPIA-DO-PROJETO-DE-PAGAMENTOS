import * as React from 'react';
import { cn } from '@/lib/utils';

type DropdownContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  contentRef: React.RefObject<HTMLDivElement | null>;
  activeIndex: number;
  setActiveIndex: (index: number) => void;
  itemCount: React.MutableRefObject<number>;
};

const DropdownContext = React.createContext<DropdownContextValue | null>(null);

const useDropdownContext = () => {
  const ctx = React.useContext(DropdownContext);
  if (!ctx)
    throw new Error(
      'DropdownMenu subcomponents must be used within <DropdownMenu>'
    );
  return ctx;
};

export interface DropdownMenuProps {
  children: React.ReactNode;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const DropdownMenu: React.FC<DropdownMenuProps> = ({
  children,
  defaultOpen = false,
  open: controlledOpen,
  onOpenChange,
}) => {
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen);
  const open = controlledOpen ?? internalOpen;
  const setOpen = React.useCallback(
    (next: boolean) => {
      if (controlledOpen === undefined) setInternalOpen(next);
      onOpenChange?.(next);
    },
    [controlledOpen, onOpenChange]
  );

  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const contentRef = React.useRef<HTMLDivElement>(null);
  const itemCount = React.useRef(0);
  const [activeIndex, setActiveIndex] = React.useState(-1);

  // Click outside
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        !triggerRef.current?.contains(target) &&
        !contentRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, setOpen]);

  // Escape key
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, setOpen]);

  React.useEffect(() => {
    if (!open) setActiveIndex(-1);
  }, [open]);

  const value = React.useMemo(
    () => ({
      open,
      setOpen,
      triggerRef,
      contentRef,
      activeIndex,
      setActiveIndex,
      itemCount,
    }),
    [open, setOpen, activeIndex]
  );

  return (
    <DropdownContext.Provider value={value}>
      {children}
    </DropdownContext.Provider>
  );
};

export interface DropdownMenuTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

const DropdownMenuTrigger = React.forwardRef<
  HTMLButtonElement,
  DropdownMenuTriggerProps
>(({ className, onClick, children, ...props }, forwardedRef) => {
  const { open, setOpen, triggerRef } = useDropdownContext();

  React.useImperativeHandle(
    forwardedRef,
    () => triggerRef.current as HTMLButtonElement
  );

  return (
    <button
      ref={triggerRef}
      type="button"
      aria-haspopup="menu"
      aria-expanded={open}
      className={cn('inline-flex items-center outline-none', className)}
      onClick={(e) => {
        setOpen(!open);
        onClick?.(e);
      }}
      {...props}
    >
      {children}
    </button>
  );
});
DropdownMenuTrigger.displayName = 'DropdownMenuTrigger';

export interface DropdownMenuContentProps extends React.HTMLAttributes<HTMLDivElement> {
  align?: 'start' | 'center' | 'end';
  sideOffset?: number;
}

const DropdownMenuContent = React.forwardRef<
  HTMLDivElement,
  DropdownMenuContentProps
>(
  (
    { className, align = 'start', sideOffset = 4, children, style, ...props },
    forwardedRef
  ) => {
    const { open, contentRef, activeIndex, setActiveIndex, itemCount } =
      useDropdownContext();

    React.useImperativeHandle(
      forwardedRef,
      () => contentRef.current as HTMLDivElement
    );

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
      const count = itemCount.current;
      if (count === 0) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex(activeIndex < count - 1 ? activeIndex + 1 : 0);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex(activeIndex > 0 ? activeIndex - 1 : count - 1);
      } else if (e.key === 'Home') {
        e.preventDefault();
        setActiveIndex(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        setActiveIndex(count - 1);
      }
    };

    // Reset item count on each render
    // eslint-disable-next-line react-hooks/immutability
    itemCount.current = 0;

    if (!open) return null;

    const alignClass =
      align === 'end'
        ? 'right-0'
        : align === 'center'
          ? 'left-1/2 -translate-x-1/2'
          : 'left-0';

    return (
      <div className="relative">
        <div
          ref={contentRef}
          role="menu"
          tabIndex={-1}
          onKeyDown={handleKeyDown}
          style={{ marginTop: sideOffset, ...style }}
          className={cn(
            'absolute z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95',
            alignClass,
            className
          )}
          {...props}
        >
          {children}
        </div>
      </div>
    );
  }
);
DropdownMenuContent.displayName = 'DropdownMenuContent';

export interface DropdownMenuItemProps extends React.HTMLAttributes<HTMLDivElement> {
  disabled?: boolean;
  inset?: boolean;
}

const DropdownMenuItem = React.forwardRef<
  HTMLDivElement,
  DropdownMenuItemProps
>(
  (
    { className, disabled, inset, onClick, onMouseEnter, children, ...props },
    ref
  ) => {
    const { setOpen, activeIndex, setActiveIndex, itemCount } =
      useDropdownContext();
    const indexRef = React.useRef<number>(-1);

    // Assign an index on render

    if (indexRef.current === -1) indexRef.current = itemCount.current;
    // eslint-disable-next-line react-hooks/immutability
    itemCount.current += 1;
    const thisIndex = indexRef.current;

    const innerRef = React.useRef<HTMLDivElement>(null);
    React.useImperativeHandle(ref, () => innerRef.current as HTMLDivElement);

    React.useEffect(() => {
      if (activeIndex === thisIndex) {
        innerRef.current?.focus();
      }
    }, [activeIndex, thisIndex]);

    return (
      <div
        ref={innerRef}
        role="menuitem"
        tabIndex={-1}
        aria-disabled={disabled || undefined}
        data-disabled={disabled ? '' : undefined}
        onClick={(e) => {
          if (disabled) return;
          onClick?.(e);
          setOpen(false);
        }}
        onMouseEnter={(e) => {
          if (!disabled) setActiveIndex(thisIndex);
          onMouseEnter?.(e);
        }}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
            e.preventDefault();
            (e.currentTarget as HTMLDivElement).click();
          }
        }}
        className={cn(
          'relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
          inset && 'pl-8',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
DropdownMenuItem.displayName = 'DropdownMenuItem';

const DropdownMenuLabel = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { inset?: boolean }
>(({ className, inset, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'px-2 py-1.5 text-sm font-semibold text-foreground',
      inset && 'pl-8',
      className
    )}
    {...props}
  />
));
DropdownMenuLabel.displayName = 'DropdownMenuLabel';

const DropdownMenuSeparator = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    role="separator"
    className={cn('-mx-1 my-1 h-px bg-muted', className)}
    {...props}
  />
));
DropdownMenuSeparator.displayName = 'DropdownMenuSeparator';

export interface DropdownMenuCheckboxItemProps extends Omit<
  DropdownMenuItemProps,
  'onSelect'
> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

const DropdownMenuCheckboxItem = React.forwardRef<
  HTMLDivElement,
  DropdownMenuCheckboxItemProps
>(
  (
    { className, children, checked, onCheckedChange, onClick, ...props },
    ref
  ) => {
    return (
      <DropdownMenuItem
        ref={ref}
        className={cn('pl-8 pr-2', className)}
        onClick={(e) => {
          e.preventDefault();
          onCheckedChange?.(!checked);
          onClick?.(e);
        }}
        {...props}
      >
        <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
          {checked && (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={3}
              className="h-3.5 w-3.5"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </span>
        {children}
      </DropdownMenuItem>
    );
  }
);
DropdownMenuCheckboxItem.displayName = 'DropdownMenuCheckboxItem';

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
};
