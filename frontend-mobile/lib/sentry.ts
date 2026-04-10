/**
 * Sentry: erros + logs estruturados.
 * DSN via EXPO_PUBLIC_SENTRY_DSN. Se vazio, Sentry fica desativado.
 */
// eslint-disable-next-line import/no-unresolved -- types in types/sentry-react-native.d.ts
import * as Sentry from '@sentry/react-native';

const dsn = (process.env.EXPO_PUBLIC_SENTRY_DSN ?? '').trim();
if (dsn) {
  Sentry.init({
    dsn,
    enableLogs: true,
    tracesSampleRate: 0.1,
    beforeSend(event: { message?: string | null } & Record<string, unknown>) {
      const message = event.message ?? '';
      if (message.includes('502') || message.includes('503')) return null;
      return event;
    },
    beforeSendLog(log: { level: string } & Record<string, unknown>) {
      // Só envia warn+ ao Sentry: erros e avisos. Info/debug ficam no console.
      const levels = ['trace', 'debug', 'info'];
      if (levels.includes(log.level)) return null;
      return log;
    },
  });
}

export { Sentry };
