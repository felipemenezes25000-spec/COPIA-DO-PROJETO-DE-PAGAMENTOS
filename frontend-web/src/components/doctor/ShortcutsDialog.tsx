/**
 * Dialog de atalhos de teclado — mostra todos os atalhos disponíveis.
 * Estilo clean, inspirado no Notion/Linear.
 */
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { SHORTCUTS_LIST } from '@/hooks/useKeyboardShortcuts';
import { Keyboard } from 'lucide-react';

interface ShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShortcutsDialog({ open, onOpenChange }: ShortcutsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Keyboard className="h-4 w-4 text-primary" />
            Atalhos de teclado
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-1 pt-2">
          {SHORTCUTS_LIST.map((shortcut, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-lg px-1 py-2 transition-colors hover:bg-muted/50"
            >
              <span className="text-sm text-foreground">{shortcut.label}</span>
              <div className="flex items-center gap-1">
                {shortcut.keys.map((key, j) => (
                  <span key={j}>
                    {j > 0 && (
                      <span className="mx-0.5 text-xs text-muted-foreground">
                        +
                      </span>
                    )}
                    <kbd className="inline-flex h-6 min-w-[24px] items-center justify-center rounded-md border border-border/50 bg-muted px-1.5 font-mono text-[11px] text-muted-foreground shadow-sm">
                      {key}
                    </kbd>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="border-t border-border pt-2 text-center text-[10px] text-muted-foreground">
          No Windows/Linux, use{' '}
          <kbd className="rounded border border-border/50 bg-muted px-1 py-0.5 font-mono text-[10px]">
            Ctrl
          </kbd>{' '}
          no lugar de{' '}
          <kbd className="rounded border border-border/50 bg-muted px-1 py-0.5 font-mono text-[10px]">
            ⌘
          </kbd>
        </p>
      </DialogContent>
    </Dialog>
  );
}
