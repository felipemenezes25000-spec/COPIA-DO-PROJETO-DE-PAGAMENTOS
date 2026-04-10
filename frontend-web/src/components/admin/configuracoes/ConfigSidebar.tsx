import { motion } from 'framer-motion';
import {
  Bell,
  Building2,
  Database,
  Info,
  KeyRound,
  Palette,
  Plug,
  Shield,
  User,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { SectionId } from './types';

interface SectionMeta {
  id: SectionId;
  label: string;
  icon: LucideIcon;
  badge?: string;
}

// eslint-disable-next-line react-refresh/only-export-components
export const SECTIONS: SectionMeta[] = [
  { id: 'perfil', label: 'Perfil', icon: User },
  { id: 'organizacao', label: 'Organização', icon: Building2 },
  { id: 'usuarios', label: 'Usuários & Permissões', icon: Users, badge: '8' },
  { id: 'notificacoes', label: 'Notificações', icon: Bell },
  { id: 'integracoes', label: 'Integrações', icon: Plug, badge: '8' },
  { id: 'seguranca', label: 'Segurança', icon: Shield },
  { id: 'aparencia', label: 'Aparência', icon: Palette },
  { id: 'api', label: 'API & Webhooks', icon: KeyRound, badge: '3' },
  { id: 'backup', label: 'Backup & Dados', icon: Database },
  { id: 'sobre', label: 'Sobre', icon: Info },
];

interface ConfigSidebarProps {
  active: SectionId;
  onChange: (id: SectionId) => void;
}

export const ConfigSidebar = ({ active, onChange }: ConfigSidebarProps) => {
  return (
    <>
      {/* Desktop */}
      <aside className="hidden w-64 shrink-0 lg:block">
        <nav className="sticky top-6 space-y-1">
          {SECTIONS.map((section) => {
            const Icon = section.icon;
            const isActive = active === section.id;
            return (
              <button
                key={section.id}
                type="button"
                onClick={() => onChange(section.id)}
                className={cn(
                  'relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors',
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="config-sidebar-active"
                    className="absolute inset-0 rounded-lg border border-primary/20 bg-primary/10"
                    transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                  />
                )}
                <Icon className="relative z-10 h-4 w-4 shrink-0" />
                <span className="relative z-10 flex-1 truncate">
                  {section.label}
                </span>
                {section.badge && (
                  <Badge
                    variant="secondary"
                    className="relative z-10 h-5 px-1.5 text-[10px] font-semibold"
                  >
                    {section.badge}
                  </Badge>
                )}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Mobile tabs */}
      <div className="scrollbar-thin -mx-4 overflow-x-auto px-4 lg:hidden">
        <div className="flex min-w-max gap-2 pb-2">
          {SECTIONS.map((section) => {
            const Icon = section.icon;
            const isActive = active === section.id;
            return (
              <button
                key={section.id}
                type="button"
                onClick={() => onChange(section.id)}
                className={cn(
                  'flex items-center gap-2 whitespace-nowrap rounded-full border px-3 py-2 text-xs font-medium transition-colors',
                  isActive
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-background text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {section.label}
                {section.badge && (
                  <span
                    className={cn(
                      'rounded-full px-1.5 text-[10px]',
                      isActive ? 'bg-primary-foreground/20' : 'bg-muted'
                    )}
                  >
                    {section.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
};
