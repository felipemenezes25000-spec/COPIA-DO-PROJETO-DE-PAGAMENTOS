import * as React from 'react';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';

type CommandContextValue = {
  search: string;
  setSearch: (value: string) => void;
  activeValue: string | null;
  setActiveValue: (value: string | null) => void;
  registerItem: (value: string, label: string) => void;
  unregisterItem: (value: string) => void;
  itemsMap: ReadonlyMap<string, string>;
  onSelectItem: (value: string) => void;
  registerOnSelect: (value: string, cb: () => void) => void;
  listboxId: string;
};

const CommandContext = React.createContext<CommandContextValue | null>(null);

const useCommandContext = () => {
  const ctx = React.useContext(CommandContext);
  if (!ctx)
    throw new Error('Command subcomponents must be used within <Command>');
  return ctx;
};

const normalize = (s: string) => s.toLowerCase().trim();

const matches = (label: string, search: string) => {
  if (!search) return true;
  return normalize(label).includes(normalize(search));
};

export type CommandProps = React.HTMLAttributes<HTMLDivElement>;

const Command = React.forwardRef<HTMLDivElement, CommandProps>(
  ({ className, children, ...props }, ref) => {
    const listboxId = React.useId();
    const [search, setSearch] = React.useState('');
    const [activeValue, setActiveValue] = React.useState<string | null>(null);
    const [itemsMap, setItemsMap] = React.useState<ReadonlyMap<string, string>>(
      () => new Map()
    );
    const selectHandlers = React.useRef<Map<string, () => void>>(new Map());

    const registerItem = React.useCallback((value: string, label: string) => {
      setItemsMap((prev) => {
        if (prev.get(value) === label) return prev;
        const next = new Map(prev);
        next.set(value, label);
        return next;
      });
    }, []);

    const unregisterItem = React.useCallback((value: string) => {
      setItemsMap((prev) => {
        if (!prev.has(value)) return prev;
        const next = new Map(prev);
        next.delete(value);
        return next;
      });
      selectHandlers.current.delete(value);
    }, []);

    const registerOnSelect = React.useCallback(
      (value: string, cb: () => void) => {
        selectHandlers.current.set(value, cb);
      },
      []
    );

    const onSelectItem = React.useCallback((value: string) => {
      selectHandlers.current.get(value)?.();
    }, []);

    const visibleValues = React.useMemo(() => {
      const list: string[] = [];
      itemsMap.forEach((label, value) => {
        if (matches(label, search)) list.push(value);
      });
      return list;
    }, [search, itemsMap]);

    React.useEffect(() => {
      if (visibleValues.length === 0) {
        setActiveValue((v) => (v === null ? v : null));
        return;
      }
      setActiveValue((current) => {
        if (current && visibleValues.includes(current)) return current;
        return visibleValues[0] ?? null;
      });
    }, [visibleValues]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (visibleValues.length === 0) return;
      const idx = activeValue ? visibleValues.indexOf(activeValue) : -1;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const next = idx < visibleValues.length - 1 ? idx + 1 : 0;
        setActiveValue(visibleValues[next] ?? null);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const next = idx > 0 ? idx - 1 : visibleValues.length - 1;
        setActiveValue(visibleValues[next] ?? null);
      } else if (e.key === 'Enter') {
        if (activeValue) {
          e.preventDefault();
          onSelectItem(activeValue);
        }
      }
    };

    const value: CommandContextValue = {
      search,
      setSearch,
      activeValue,
      setActiveValue,
      registerItem,
      unregisterItem,
      itemsMap,
      onSelectItem,
      registerOnSelect,
      listboxId,
    };

    return (
      <CommandContext.Provider value={value}>
        <div
          ref={ref}
          role="combobox"
          tabIndex={-1}
          aria-expanded="true"
          aria-controls={listboxId}
          onKeyDown={handleKeyDown}
          className={cn(
            'flex h-full w-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground',
            className
          )}
          {...props}
        >
          {children}
        </div>
      </CommandContext.Provider>
    );
  }
);
Command.displayName = 'Command';

export type CommandInputProps = React.InputHTMLAttributes<HTMLInputElement>;

const CommandInput = React.forwardRef<HTMLInputElement, CommandInputProps>(
  ({ className, onChange, ...props }, ref) => {
    const { search, setSearch } = useCommandContext();
    return (
      <div className="flex items-center border-b px-3" cmdk-input-wrapper="">
        <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
        <input
          ref={ref}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            onChange?.(e);
          }}
          className={cn(
            'flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50',
            className
          )}
          {...props}
        />
      </div>
    );
  }
);
CommandInput.displayName = 'CommandInput';

const CommandList = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, id, ...props }, ref) => {
  const { listboxId } = useCommandContext();
  return (
    <div
      ref={ref}
      id={id ?? listboxId}
      role="listbox"
      className={cn(
        'max-h-[300px] overflow-y-auto overflow-x-hidden',
        className
      )}
      {...props}
    />
  );
});
CommandList.displayName = 'CommandList';

const CommandEmpty = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  const { search, itemsMap } = useCommandContext();
  const hasVisible = React.useMemo(() => {
    let found = false;
    itemsMap.forEach((label) => {
      if (matches(label, search)) found = true;
    });
    return found;
  }, [search, itemsMap]);

  if (hasVisible) return null;

  return (
    <div
      ref={ref}
      className={cn(
        'py-6 text-center text-sm text-muted-foreground',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
});
CommandEmpty.displayName = 'CommandEmpty';

export interface CommandGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  heading?: React.ReactNode;
}

const CommandGroup = React.forwardRef<HTMLDivElement, CommandGroupProps>(
  ({ className, heading, children, ...props }, ref) => (
    <div
      ref={ref}
      role="group"
      className={cn('overflow-hidden p-1 text-foreground', className)}
      {...props}
    >
      {heading && (
        <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
          {heading}
        </div>
      )}
      {children}
    </div>
  )
);
CommandGroup.displayName = 'CommandGroup';

export interface CommandItemProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  'onSelect'
> {
  value: string;
  disabled?: boolean;
  onSelect?: (value: string) => void;
}

const CommandItem = React.forwardRef<HTMLDivElement, CommandItemProps>(
  (
    {
      className,
      value,
      disabled,
      onSelect,
      onClick,
      onMouseEnter,
      onKeyDown,
      children,
      ...props
    },
    ref
  ) => {
    const {
      search,
      activeValue,
      setActiveValue,
      registerItem,
      unregisterItem,
      registerOnSelect,
    } = useCommandContext();

    const label = React.useMemo(() => {
      if (typeof children === 'string') return children;
      return value;
    }, [children, value]);

    React.useEffect(() => {
      registerItem(value, label);
      return () => unregisterItem(value);
    }, [value, label, registerItem, unregisterItem]);

    React.useEffect(() => {
      registerOnSelect(value, () => {
        if (!disabled) onSelect?.(value);
      });
    }, [value, disabled, onSelect, registerOnSelect]);

    if (!matches(label, search)) return null;

    const isActive = activeValue === value;

    return (
      <div
        ref={ref}
        role="option"
        tabIndex={disabled ? -1 : 0}
        aria-selected={isActive}
        aria-disabled={disabled || undefined}
        data-selected={isActive ? '' : undefined}
        data-disabled={disabled ? '' : undefined}
        onMouseEnter={(e) => {
          if (!disabled) setActiveValue(value);
          onMouseEnter?.(e);
        }}
        onClick={(e) => {
          onClick?.(e);
          if (!disabled) onSelect?.(value);
        }}
        onKeyDown={(e) => {
          onKeyDown?.(e);
          if (disabled) return;
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelect?.(value);
          }
        }}
        className={cn(
          'relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none',
          'data-[selected]:bg-accent data-[selected]:text-accent-foreground',
          'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
CommandItem.displayName = 'CommandItem';

export {
  Command,
  CommandInput,
  CommandList,
  CommandItem,
  CommandEmpty,
  CommandGroup,
};
