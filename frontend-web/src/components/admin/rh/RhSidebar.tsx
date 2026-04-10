import { motion } from 'framer-motion';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Clock,
  Palmtree,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface RhNavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
  badge?: number;
}

const NAV_ITEMS: RhNavItem[] = [
  { to: '/admin/rh', label: 'Dashboard RH', icon: LayoutDashboard, end: true },
  {
    to: '/admin/rh/colaboradores',
    label: 'Colaboradores',
    icon: Users,
    badge: 42,
  },
  {
    to: '/admin/rh/recrutamento',
    label: 'Recrutamento',
    icon: Briefcase,
    badge: 56,
  },
  { to: '/admin/rh/ponto', label: 'Ponto & Horas', icon: Clock },
  {
    to: '/admin/rh/ferias',
    label: 'Férias & Ausências',
    icon: Palmtree,
    badge: 12,
  },
  { to: '/admin/rh/desempenho', label: 'Desempenho', icon: TrendingUp },
  { to: '/admin/rh/folha', label: 'Folha de Pagamento', icon: Wallet },
];

export const RhSidebar = () => {
  return (
    <motion.aside
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={cn(
        'shrink-0 border-border bg-card',
        // Desktop: left rail 220px vertical
        'lg:min-h-full lg:w-[220px] lg:border-r',
        // Mobile/tablet: top bar horizontal scroll
        'w-full border-b lg:border-b-0'
      )}
      aria-label="Navegação do Portal RH"
    >
      {/* Header */}
      <div className="hidden px-4 pb-3 pt-5 lg:block">
        <p className="text-sm font-bold leading-tight text-foreground">
          Portal RH
        </p>
        <p className="text-[11px] text-muted-foreground">RenoveJá+ Saúde</p>
      </div>

      {/* Nav */}
      <nav
        className={cn(
          'flex gap-1 px-2 py-2 lg:flex-col lg:py-1',
          'overflow-x-auto lg:overflow-x-visible'
        )}
      >
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'group flex items-center gap-2.5 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  'hover:bg-muted hover:text-foreground',
                  isActive
                    ? 'border-l-2 border-primary bg-primary/10 pl-[10px] text-primary'
                    : 'border-l-2 border-transparent text-muted-foreground'
                )
              }
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden />
              <span className="flex-1">{item.label}</span>
              {typeof item.badge === 'number' && (
                <span className="ml-auto inline-flex h-[18px] min-w-[20px] items-center justify-center rounded-full bg-primary/15 px-1.5 text-[10px] font-semibold text-primary">
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer stats */}
      <div className="mt-auto hidden border-t border-border/60 px-4 py-4 lg:block">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground">Headcount</span>
            <span className="font-semibold text-foreground">42</span>
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground">Vagas abertas</span>
            <span className="font-semibold text-foreground">18</span>
          </div>
        </div>
      </div>
    </motion.aside>
  );
};

export default RhSidebar;
