import { useLocation } from 'react-router-dom';
import { NavLink } from '@/components/admin/NavLink';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useDoctorAuth } from '@/contexts/DoctorAuthContext';
import {
  LayoutDashboard,
  FileText,
  Bell,
  User,
  Menu,
  X,
  LogOut,
  Stethoscope,
  Video,
} from 'lucide-react';

const navItems = [
  { to: '/dashboard', label: 'Painel', icon: LayoutDashboard },
  { to: '/pedidos', label: 'Pedidos', icon: FileText },
  { to: '/consultas', label: 'Consultas', icon: Video },
  { to: '/notificacoes', label: 'Notificações', icon: Bell },
  { to: '/perfil', label: 'Meu Perfil', icon: User },
];

export function DoctorSidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { user, signOut } = useDoctorAuth();

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : 'MD';

  return (
    <>
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed top-4 left-4 z-50 lg:hidden rounded-xl bg-card p-2.5 shadow-lg border border-border"
        aria-label={mobileOpen ? 'Fechar menu' : 'Abrir menu'}
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-foreground/20 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden
        />
      )}

      <aside
        className={cn(
          'fixed lg:sticky top-0 left-0 z-40 h-screen w-72 bg-sidebar border-r border-sidebar-border flex flex-col transition-transform duration-200',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        <div className="p-6 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-sm">
              <Stethoscope className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <div className="flex items-baseline gap-0.5">
                <span className="font-bold text-lg text-foreground">Renove</span>
                <span className="font-bold text-lg text-primary">Já</span>
                <span className="text-primary font-bold text-lg">+</span>
              </div>
              <p className="text-xs text-muted-foreground -mt-0.5">Portal do Médico</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1" aria-label="Menu principal">
          {navItems.map((item) => {
            const isActive =
              item.to === '/dashboard'
                ? location.pathname === '/' || location.pathname === '/dashboard'
                : location.pathname.startsWith(item.to);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-150',
                  isActive
                    ? 'bg-primary/10 text-primary shadow-sm'
                    : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                )}
              >
                <item.icon className={cn('h-[18px] w-[18px]', isActive && 'text-primary')} aria-hidden />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 border-t border-sidebar-border space-y-4">
          {user && (
            <div className="flex items-center gap-3 px-2">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  className="w-9 h-9 rounded-full object-cover ring-2 ring-primary/20"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-xs font-bold text-primary">{initials}</span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user.name}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>
            </div>
          )}
          <button
            onClick={signOut}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-destructive transition-colors w-full px-2 py-1.5 rounded-lg hover:bg-destructive/5"
          >
            <LogOut className="h-4 w-4" aria-hidden />
            Sair
          </button>
        </div>
      </aside>
    </>
  );
}
