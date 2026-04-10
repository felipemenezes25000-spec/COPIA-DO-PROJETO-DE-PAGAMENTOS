import { useLocation, useNavigate } from 'react-router-dom';
import { NavLink } from '@/components/admin/NavLink';
import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { useDoctorAuth } from '@/hooks/useDoctorAuth';
import { useNotifications } from '@/contexts/NotificationContext';
import { usePWA } from '@/hooks/usePWA';
import { useWebPush } from '@/hooks/useWebPush';
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
  Download,
  Share2,
  Settings,
  BellRing,
  Users,
  Shield,
  Inbox,
  MoreHorizontal,
  AlertTriangle,
} from 'lucide-react';

/**
 * All navigation items.
 * The first 5 are shown in the mobile bottom nav bar.
 * The rest are accessible via the "More" slide-up sheet on mobile.
 */
const navItems = [
  { to: '/dashboard', label: 'Painel', icon: LayoutDashboard },
  { to: '/pedidos', label: 'Pedidos', icon: FileText },
  { to: '/consultas', label: 'Consultas', icon: Video },
  { to: '/notificacoes', label: 'Alertas', icon: Bell },
  { to: '/perfil', label: 'Perfil', icon: User },
  // --- below the fold on mobile bottom nav ---
  { to: '/fila', label: 'Fila', icon: Inbox },
  { to: '/rejeitados-ia', label: 'Rejeitados pela IA', icon: AlertTriangle },
  { to: '/pacientes', label: 'Pacientes', icon: Users },
  { to: '/certificado', label: 'Certificado', icon: Shield },
  { to: '/configuracoes', label: 'Configurações', icon: Settings },
];

/** Items shown in mobile bottom tab bar (first 4 + "More" button) */
const BOTTOM_NAV_COUNT = 4;
const bottomNavItems = navItems.slice(0, BOTTOM_NAV_COUNT);
const moreNavItems = navItems.slice(BOTTOM_NAV_COUNT);

export function DoctorSidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [moreSheetOpen, setMoreSheetOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, signOut } = useDoctorAuth();
  const { unreadCount } = useNotifications();
  const { canInstall, isIOS, isInstalled, promptInstall } = usePWA();
  const {
    supported: pushSupported,
    permission: pushPermission,
    requestPermission,
  } = useWebPush(isAuthenticated);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [installDismissed, setInstallDismissed] = useState(
    () => sessionStorage.getItem('pwa-install-dismissed') === '1'
  );
  const [pushDismissed, setPushDismissed] = useState(
    () => sessionStorage.getItem('push-permission-dismissed') === '1'
  );

  const dismissPush = () => {
    setPushDismissed(true);
    sessionStorage.setItem('push-permission-dismissed', '1');
  };

  const handleEnablePush = async () => {
    const granted = await requestPermission();
    if (granted) setPushDismissed(true);
  };

  const dismissInstall = () => {
    setInstallDismissed(true);
    sessionStorage.setItem('pwa-install-dismissed', '1');
  };

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((w) => w[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'MD';

  // Close mobile drawer on Escape
  useEffect(() => {
    if (!mobileOpen && !moreSheetOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileOpen(false);
        setMoreSheetOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [mobileOpen, moreSheetOpen]);

  /** Navigate and close all mobile menus */
  const navigateAndClose = useCallback(
    (to: string) => {
      navigate(to);
      setMoreSheetOpen(false);
      setMobileOpen(false);
    },
    [navigate]
  );

  // Lock body scroll when mobile drawer or more sheet is open
  useEffect(() => {
    if (mobileOpen || moreSheetOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen, moreSheetOpen]);

  const isVideoPage = location.pathname.startsWith('/video/');

  const isItemActive = useCallback(
    (to: string) => {
      if (to === '/dashboard') {
        return location.pathname === '/' || location.pathname === '/dashboard';
      }
      return location.pathname.startsWith(to);
    },
    [location.pathname]
  );

  // Check if any "more" item is currently active (to highlight the More button)
  const isMoreItemActive = moreNavItems.some((item) => isItemActive(item.to));

  // Don't show sidebar/nav on video call page
  if (isVideoPage) return null;

  return (
    <>
      {/* ── Mobile: Hamburger button (top-left) ── */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed left-3 top-3 z-50 rounded-xl border border-border/50 bg-card/90 p-2.5 shadow-lg backdrop-blur-sm md:hidden"
        aria-label={mobileOpen ? 'Fechar menu' : 'Abrir menu'}
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* ── Mobile: Backdrop overlay for slide-in drawer ── */}
      <div
        className={cn(
          'fixed inset-0 z-30 bg-foreground/20 backdrop-blur-sm transition-opacity duration-300 md:hidden',
          mobileOpen
            ? 'pointer-events-auto opacity-100'
            : 'pointer-events-none opacity-0'
        )}
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
      />

      {/* ── Desktop sidebar + Mobile slide-in drawer ── */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-40 h-screen w-64 md:sticky lg:w-72',
          'border-r border-sidebar-border bg-white dark:bg-sidebar',
          'flex flex-col',
          'transition-transform duration-300 ease-out will-change-transform',
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
      >
        {/* Logo */}
        <div className="shrink-0 border-b border-sidebar-border p-4 lg:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-sm lg:h-10 lg:w-10">
              <Stethoscope className="h-4 w-4 text-primary-foreground lg:h-5 lg:w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-baseline gap-0.5">
                <span className="text-base font-bold text-foreground lg:text-lg">
                  Renove
                </span>
                <span className="text-base font-bold text-primary lg:text-lg">
                  Já
                </span>
                <span className="text-base font-bold text-primary lg:text-lg">
                  +
                </span>
              </div>
              <p className="-mt-0.5 truncate text-[10px] text-muted-foreground lg:text-xs">
                Portal do Médico
              </p>
            </div>
          </div>
        </div>

        {/* Nav items */}
        <nav
          className="flex-1 space-y-1 overflow-y-auto p-3 lg:p-4"
          aria-label="Menu principal"
        >
          {navItems.map((item) => {
            const isActive = isItemActive(item.to);
            const isAlerts = item.to === '/notificacoes';
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 lg:px-4 lg:py-3',
                  isActive
                    ? 'bg-primary/10 text-primary shadow-sm'
                    : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                )}
              >
                <item.icon
                  className={cn(
                    'h-[18px] w-[18px] shrink-0',
                    isActive && 'text-primary'
                  )}
                  aria-hidden
                />
                <span className="truncate">{item.label}</span>
                {isAlerts && unreadCount > 0 && (
                  <span
                    className="ml-auto inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground duration-200 animate-in zoom-in-50"
                    aria-label={`${unreadCount > 99 ? 'mais de 99' : unreadCount} alertas não lidos`}
                  >
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* PWA Install Banner (sidebar) */}
        {!isInstalled && !installDismissed && (canInstall || isIOS) && (
          <div className="mx-3 mb-3 shrink-0 rounded-xl border border-primary/10 bg-primary/5 p-3 lg:mx-4">
            <p className="mb-1.5 text-xs font-semibold text-foreground">
              Instalar aplicativo
            </p>
            <p className="mb-2.5 text-[10px] leading-relaxed text-muted-foreground">
              Adicione o portal como app no seu dispositivo para acesso rápido.
            </p>
            {canInstall ? (
              <div className="flex gap-2">
                <button
                  onClick={promptInstall}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  <Download className="h-3 w-3" /> Instalar
                </button>
                <button
                  onClick={dismissInstall}
                  className="rounded-lg px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted"
                >
                  Depois
                </button>
              </div>
            ) : isIOS ? (
              <div className="space-y-2">
                <button
                  onClick={() => setShowIOSGuide(!showIOSGuide)}
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
                >
                  <Share2 className="h-3 w-3" /> Como instalar
                </button>
                {showIOSGuide && (
                  <div className="space-y-1 rounded-lg bg-muted/50 p-2 text-[10px] text-muted-foreground">
                    <p>
                      1. Toque em <strong>Compartilhar</strong>{' '}
                      <Share2 className="inline h-2.5 w-2.5" />
                    </p>
                    <p>
                      2. Role e toque em{' '}
                      <strong>"Adicionar à Tela de Início"</strong>
                    </p>
                    <p>
                      3. Toque em <strong>Adicionar</strong>
                    </p>
                  </div>
                )}
                <button
                  onClick={dismissInstall}
                  className="w-full text-[10px] text-muted-foreground"
                >
                  Não mostrar novamente
                </button>
              </div>
            ) : null}
          </div>
        )}

        {/* Push Notification Banner */}
        {pushSupported && pushPermission === 'default' && !pushDismissed && (
          <div className="mx-3 mb-3 shrink-0 rounded-xl border border-primary/10 bg-primary/5 p-3 lg:mx-4">
            <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <BellRing className="h-3.5 w-3.5 text-primary" />
              Ativar alertas
            </p>
            <p className="mb-2.5 text-[10px] leading-relaxed text-muted-foreground">
              Receba notificações de novos pedidos mesmo com a aba minimizada.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleEnablePush}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <Bell className="h-3 w-3" /> Ativar
              </button>
              <button
                onClick={dismissPush}
                className="rounded-lg px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted"
              >
                Depois
              </button>
            </div>
          </div>
        )}

        {/* User info + logout */}
        <div className="shrink-0 space-y-3 border-t border-sidebar-border p-3 lg:p-4">
          {user && (
            <div className="flex items-center gap-2.5 px-1">
              <div className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 ring-2 ring-primary/20 lg:h-9 lg:w-9">
                <span className="text-[10px] font-bold text-primary lg:text-xs">
                  {initials}
                </span>
                {user.avatarUrl && (
                  <img
                    src={user.avatarUrl}
                    alt={user.name}
                    className="absolute inset-0 h-full w-full rounded-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium lg:text-sm">
                  {user.name}
                </p>
                <p className="truncate text-[10px] text-muted-foreground lg:text-xs">
                  {user.email}
                </p>
              </div>
            </div>
          )}
          <button
            onClick={signOut}
            className="flex w-full items-center gap-2 rounded-lg px-1 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-destructive/5 hover:text-destructive lg:text-sm"
          >
            <LogOut className="h-3.5 w-3.5 lg:h-4 lg:w-4" aria-hidden />
            Sair
          </button>
        </div>
      </aside>

      {/* ══════════════════════════════════════════════════════
       *  Mobile: Bottom Tab Navigation
       *  Shows 4 key items + "More" button (5 total).
       *  Visible only on small screens.
       * ══════════════════════════════════════════════════════ */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/50 bg-white/95 backdrop-blur-lg dark:bg-card/95 md:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        aria-label="Navegação principal"
      >
        <div className="flex h-14 items-center justify-around px-1">
          {bottomNavItems.map((item) => {
            const isActive = isItemActive(item.to);
            const isAlerts = item.to === '/notificacoes';
            return (
              <button
                key={item.to}
                onClick={() => navigateAndClose(item.to)}
                aria-label={
                  isAlerts && unreadCount > 0
                    ? `${item.label} — ${unreadCount > 99 ? 'mais de 99' : unreadCount} alertas não lidos`
                    : item.label
                }
                className={cn(
                  'relative flex max-w-[72px] flex-1 flex-col items-center justify-center gap-0.5 rounded-xl py-1 transition-colors duration-150',
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground active:scale-95'
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                <div className="relative">
                  <item.icon
                    className={cn('h-5 w-5', isActive && 'text-primary')}
                    aria-hidden
                  />
                  {isAlerts && unreadCount > 0 && (
                    <span
                      className="absolute -right-2.5 -top-1.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground"
                      aria-hidden="true"
                    >
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </div>
                <span
                  aria-hidden="true"
                  className={cn(
                    'text-[10px] font-medium leading-tight',
                    isActive ? 'text-primary' : 'text-muted-foreground'
                  )}
                >
                  {item.label}
                </span>
                {isActive && (
                  <div
                    className="absolute left-1/2 top-0 h-0.5 w-5 -translate-x-1/2 rounded-full bg-primary"
                    aria-hidden="true"
                  />
                )}
              </button>
            );
          })}

          {/* "More" button */}
          <button
            onClick={() => setMoreSheetOpen(true)}
            aria-label="Mais opções"
            className={cn(
              'relative flex max-w-[72px] flex-1 flex-col items-center justify-center gap-0.5 rounded-xl py-1 transition-colors duration-150',
              isMoreItemActive
                ? 'text-primary'
                : 'text-muted-foreground active:scale-95'
            )}
          >
            <MoreHorizontal
              className={cn('h-5 w-5', isMoreItemActive && 'text-primary')}
              aria-hidden
            />
            <span
              aria-hidden="true"
              className={cn(
                'text-[10px] font-medium leading-tight',
                isMoreItemActive ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              Mais
            </span>
            {isMoreItemActive && (
              <div
                className="absolute left-1/2 top-0 h-0.5 w-5 -translate-x-1/2 rounded-full bg-primary"
                aria-hidden="true"
              />
            )}
          </button>
        </div>
      </nav>

      {/* ══════════════════════════════════════════════════════
       *  Mobile: "More" bottom sheet
       *  Slides up from bottom, shows overflow nav items.
       * ══════════════════════════════════════════════════════ */}
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-50 bg-foreground/20 backdrop-blur-sm transition-opacity duration-300 md:hidden',
          moreSheetOpen
            ? 'pointer-events-auto opacity-100'
            : 'pointer-events-none opacity-0'
        )}
        onClick={() => setMoreSheetOpen(false)}
        aria-hidden="true"
      />
      {/* Sheet */}
      <div
        className={cn(
          'fixed bottom-0 left-0 right-0 z-50 md:hidden',
          'rounded-t-2xl bg-white shadow-2xl dark:bg-card',
          'transition-transform duration-300 ease-out will-change-transform',
          moreSheetOpen ? 'translate-y-0' : 'translate-y-full'
        )}
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        role="dialog"
        aria-label="Mais opções de navegação"
      >
        {/* Drag handle */}
        <div className="flex justify-center pb-1 pt-3">
          <div className="h-1 w-10 rounded-full bg-muted-foreground/20" />
        </div>

        {/* Sheet nav items */}
        <nav className="space-y-1 px-4 pb-4" aria-label="Opções adicionais">
          {moreNavItems.map((item) => {
            const isActive = isItemActive(item.to);
            return (
              <button
                key={item.to}
                onClick={() => navigateAndClose(item.to)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors duration-150',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted active:bg-muted'
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                <item.icon
                  className={cn('h-5 w-5 shrink-0', isActive && 'text-primary')}
                  aria-hidden
                />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Close button */}
        <div className="px-4 pb-4">
          <button
            onClick={() => setMoreSheetOpen(false)}
            className="w-full rounded-xl bg-muted/50 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted"
          >
            Fechar
          </button>
        </div>
      </div>
    </>
  );
}
