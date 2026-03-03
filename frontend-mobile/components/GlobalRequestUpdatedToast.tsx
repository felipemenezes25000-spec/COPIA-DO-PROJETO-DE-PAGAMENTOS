import React, { useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { useRequestsEvents } from '../contexts/RequestsEventsContext';
import { useAuth } from '../contexts/AuthContext';
import { showToast } from './ui/Toast';
import type { RequestUpdatedPayload } from '../lib/requestsEvents';

export function getMessageForUser(payload: RequestUpdatedPayload): string {
  if (payload.message && payload.message.trim()) return payload.message.trim();
  const s = (payload.status || '').toLowerCase();
  const map: Record<string, string> = {
    paid: 'Pagamento confirmado.',
    signed: 'Documento assinado. Baixe em Meus pedidos.',
    delivered: 'Documento recebido.',
    approved_pending_payment: 'Solicitação aprovada. Realize o pagamento.',
    consultation_ready: 'Consulta pronta. Entre na sala de vídeo.',
    in_consultation: 'Médico na sala. Entre na chamada.',
    consultation_finished: 'Consulta encerrada.',
    cancelled: 'Pedido cancelado.',
    rejected: 'Pedido rejeitado.',
  };
  return map[s] || 'Seu pedido foi atualizado.';
}

/**
 * Escuta eventos RequestUpdated (SignalR): atualiza o banner na tela atual (pendingUpdate)
 * e mostra toast com "Ver pedido". Não renderiza nada.
 */
export function GlobalRequestUpdatedToast() {
  const router = useRouter();
  const { subscribe, setPendingUpdate } = useRequestsEvents();
  const { user } = useAuth();
  const routerRef = useRef(router);
  routerRef.current = router;

  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribe((payload: RequestUpdatedPayload) => {
      const message = getMessageForUser(payload);
      const requestId = payload.requestId || '';

      setPendingUpdate({ requestId, message });

      const isDoctor = user?.role === 'doctor';
      const path = requestId
        ? isDoctor
          ? `/doctor-request/${requestId}`
          : `/request-detail/${requestId}`
        : null;

      showToast({
        message,
        type: 'success',
        duration: 5000,
        ...(path
          ? {
              actionLabel: 'Ver pedido',
              onAction: () => {
                setPendingUpdate(null);
                routerRef.current.push(path as any);
              },
            }
          : {}),
      });
    });
    return unsubscribe;
  }, [user, subscribe, setPendingUpdate]);

  return null;
}
