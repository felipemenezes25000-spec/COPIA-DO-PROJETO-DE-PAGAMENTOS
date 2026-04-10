/**
 * Hook de atalhos de teclado globais para o portal do médico.
 *
 * Shortcuts:
 * - Cmd/Ctrl + K: Command palette (handled by CommandPalette)
 * - Cmd/Ctrl + 1-5: Navegar para seções
 * - Cmd/Ctrl + D: Toggle dark mode
 * - Cmd/Ctrl + /: Mostrar atalhos
 * - Escape: Fechar modais/dialogs
 */
import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

interface ShortcutHandlers {
  onToggleDarkMode?: () => void;
  onShowShortcuts?: () => void;
}

const NAV_SHORTCUTS: Record<string, string> = {
  '1': '/dashboard',
  '2': '/pedidos',
  '3': '/consultas',
  '4': '/notificacoes',
  '5': '/perfil',
};

export function useKeyboardShortcuts({
  onToggleDarkMode,
  onShowShortcuts,
}: ShortcutHandlers = {}) {
  const navigate = useNavigate();

  const handler = useCallback(
    (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      const target = e.target as HTMLElement;

      // Don't intercept when typing in inputs
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      ) {
        return;
      }

      // Cmd/Ctrl + number: navigate
      if (meta && NAV_SHORTCUTS[e.key]) {
        e.preventDefault();
        navigate(NAV_SHORTCUTS[e.key]);
        return;
      }

      // Cmd/Ctrl + D: dark mode
      if (meta && e.key === 'd') {
        e.preventDefault();
        onToggleDarkMode?.();
        return;
      }

      // Cmd/Ctrl + /: show shortcuts
      if (meta && e.key === '/') {
        e.preventDefault();
        onShowShortcuts?.();
        return;
      }
    },
    [navigate, onToggleDarkMode, onShowShortcuts]
  );

  useEffect(() => {
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handler]);
}

/** Display-only: list of available shortcuts for the help dialog */
export const SHORTCUTS_LIST = [
  { keys: ['⌘', 'K'], label: 'Busca rápida' },
  { keys: ['⌘', '1'], label: 'Painel' },
  { keys: ['⌘', '2'], label: 'Pedidos' },
  { keys: ['⌘', '3'], label: 'Consultas' },
  { keys: ['⌘', '4'], label: 'Notificações' },
  { keys: ['⌘', '5'], label: 'Perfil' },
  { keys: ['⌘', 'D'], label: 'Modo escuro/claro' },
  { keys: ['⌘', '/'], label: 'Atalhos' },
  { keys: ['Esc'], label: 'Fechar' },
];
