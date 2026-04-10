import {
  Cloud,
  Mail,
  MessageSquare,
  Sparkles,
  Users,
  Video,
  Webhook,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MOCK_INTEGRATIONS } from './mockData';
import { SectionShell } from './SectionShell';

const ICONS: Record<string, LucideIcon> = {
  cloud: Cloud,
  video: Video,
  sparkles: Sparkles,
  mail: Mail,
  webhook: Webhook,
  slack: MessageSquare,
  users: Users,
};

const STATUS_META = {
  connected: {
    label: 'Conectado',
    className:
      'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30',
    cta: 'Desconectar',
    variant: 'outline' as const,
  },
  configure: {
    label: 'Configurar',
    className:
      'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300 border-amber-200 dark:border-amber-500/30',
    cta: 'Configurar',
    variant: 'default' as const,
  },
  disconnected: {
    label: 'Desconectado',
    className:
      'bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300 border-slate-200 dark:border-slate-500/30',
    cta: 'Conectar',
    variant: 'default' as const,
  },
};

export const IntegracoesSection = () => {
  return (
    <SectionShell
      title="Integrações"
      description="Serviços externos conectados ao RenoveJá+."
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {MOCK_INTEGRATIONS.map((it) => {
          const Icon = ICONS[it.icon] ?? Cloud;
          const meta = STATUS_META[it.status];
          return (
            <div
              key={it.id}
              className="group flex flex-col rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/40 hover:shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <Badge variant="outline" className={meta.className}>
                  {meta.label}
                </Badge>
              </div>
              <h4 className="mt-3 text-sm font-semibold">{it.name}</h4>
              <p className="mt-1 flex-1 text-xs text-muted-foreground">
                {it.description}
              </p>
              <Button
                size="sm"
                variant={meta.variant}
                className="mt-4 w-full"
                onClick={() => toast.info(`${meta.cta}: ${it.name}`)}
              >
                {meta.cta}
              </Button>
            </div>
          );
        })}
      </div>
    </SectionShell>
  );
};
