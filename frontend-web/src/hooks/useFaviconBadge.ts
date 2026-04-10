/**
 * useFaviconBadge — Desenha badge vermelho com contagem no favicon.
 * Usado para notificações não lidas.
 */
import { useEffect, useRef } from 'react';

const FAVICON_SRC = '/icons/icon-96x96.png';
const BADGE_COLOR = '#dc2626'; // red-600
const BADGE_TEXT_COLOR = '#ffffff';

export function useFaviconBadge(count: number) {
  const originalHrefRef = useRef<string | null>(null);

  useEffect(() => {
    const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!link) return;

    if (count <= 0) {
      if (originalHrefRef.current) {
        link.href = originalHrefRef.current;
        originalHrefRef.current = null;
      }
      return;
    }

    if (!originalHrefRef.current) {
      originalHrefRef.current = link.href;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const size = 32;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(img, 0, 0, size, size);

      const badgeSize = Math.min(size * 0.45, 16);
      const badgeX = size - badgeSize * 0.6;
      const badgeY = 0;

      ctx.fillStyle = BADGE_COLOR;
      ctx.beginPath();
      ctx.arc(badgeX, badgeY + badgeSize / 2, badgeSize / 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.stroke();

      const text = count > 99 ? '99+' : String(count);
      ctx.fillStyle = BADGE_TEXT_COLOR;
      ctx.font = `bold ${Math.min(badgeSize * 0.6, 10)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, badgeX, badgeY + badgeSize / 2);

      link.href = canvas.toDataURL('image/png');
    };

    img.onerror = () => {
      if (originalHrefRef.current) link.href = originalHrefRef.current;
    };

    img.src = FAVICON_SRC;

    return () => {
      if (originalHrefRef.current) {
        link.href = originalHrefRef.current;
      }
    };
  }, [count]);
}
