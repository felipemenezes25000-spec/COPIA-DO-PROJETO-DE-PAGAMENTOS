/**
 * Banner fixo no topo quando o usuário está offline.
 * Alinhado ao mobile (OfflineBanner).
 */
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { WifiOff } from 'lucide-react';

export function OfflineBanner() {
  const { isConnected } = useNetworkStatus();

  if (isConnected !== false) return null;

  return (
    <div
      className="fixed left-0 right-0 top-0 z-[999] flex items-center justify-center gap-2 bg-destructive px-4 py-2 text-destructive-foreground"
      role="alert"
      aria-live="assertive"
      aria-label="Sem conexão com a internet"
    >
      <WifiOff className="h-4 w-4 shrink-0" aria-hidden />
      <span className="text-sm font-semibold">Sem conexão com a internet</span>
    </div>
  );
}
