import { useState } from 'react';
import { Bell, Mail, MessageSquare, Smartphone } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { DEFAULT_NOTIFICATIONS, NOTIFICATION_LABELS } from './mockData';
import type {
  NotificationChannel,
  NotificationKey,
  NotificationMatrix,
} from './types';
import { SectionShell } from './SectionShell';

interface NotificacoesSectionProps {
  onDirty: () => void;
}

const CHANNELS: {
  key: NotificationChannel;
  label: string;
  icon: typeof Mail;
}[] = [
  { key: 'email', label: 'E-mail', icon: Mail },
  { key: 'push', label: 'Push', icon: Smartphone },
  { key: 'sms', label: 'SMS', icon: MessageSquare },
];

export const NotificacoesSection = ({ onDirty }: NotificacoesSectionProps) => {
  const [matrix, setMatrix] = useState<NotificationMatrix>(
    DEFAULT_NOTIFICATIONS
  );

  const toggle = (key: NotificationKey, channel: NotificationChannel) => {
    setMatrix((prev) => ({
      ...prev,
      [key]: { ...prev[key], [channel]: !prev[key][channel] },
    }));
    onDirty();
  };

  const keys = Object.keys(NOTIFICATION_LABELS) as NotificationKey[];

  return (
    <SectionShell
      title="Notificações"
      description="Controle quais alertas você recebe e em quais canais."
    >
      <div className="space-y-3">
        {keys.map((key) => {
          const meta = NOTIFICATION_LABELS[key];
          return (
            <div
              key={key}
              className="flex flex-col justify-between gap-4 rounded-lg border border-border bg-card/40 p-4 sm:flex-row sm:items-center"
            >
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-semibold">{meta.title}</h4>
                <p className="text-xs text-muted-foreground">
                  {meta.description}
                </p>
              </div>
              <div className="flex items-center gap-5">
                {CHANNELS.map(({ key: ch, label, icon: Icon }) => (
                  <div key={ch} className="flex items-center gap-2">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="hidden text-xs text-muted-foreground sm:inline">
                      {label}
                    </span>
                    <Switch
                      checked={matrix[key][ch]}
                      onCheckedChange={() => toggle(key, ch)}
                    />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-lg border border-dashed border-primary/30 bg-primary/5 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
            <Bell className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-primary">
              Pré-visualização
            </p>
            <p className="mt-0.5 text-sm font-medium">
              Anomalia detectada pela IA
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Pico de +38% em solicitações de renovação na última hora. Clique
              para ver detalhes no dashboard.
            </p>
          </div>
        </div>
      </div>
    </SectionShell>
  );
};
