import { Outlet, NavLink, Navigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Activity,
  Radio,
  FileBarChart,
  DollarSign,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import { LogoIcon } from '../ui/Logo';

const navItems = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/admin/candidatos', icon: Users, label: 'Candidatos', end: false },
  // ── Monitor de Produtividade Médica ────────────────────────
  // Spec: docs/superpowers/specs/2026-04-09-monitor-produtividade-medica-design.md
  { to: '/admin/produtividade', icon: Activity, label: 'Produtividade', end: false },
  { to: '/admin/fila', icon: Radio, label: 'Fila ao vivo', end: false },
  { to: '/admin/relatorios', icon: FileBarChart, label: 'Relatórios', end: false },
  { to: '/admin/precificacao', icon: DollarSign, label: 'Precificação', end: false },
];

/** Extract up to two uppercase initials from an admin display name/email. */
function getInitials(name: string | undefined, email: string): string {
  const source = (name && name.trim()) || (email ? email.split('@')[0] : '') || '?';
  const parts = source
    .replace(/[._-]+/g, ' ')
    .split(' ')
    .filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function AdminLayout() {
  const { user, logout, hydrated } = useAdminAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Compute identity bits *before* any early return so hook order stays stable.
  const initials = useMemo(
    () => getInitials(user?.nome, user?.email ?? ''),
    [user?.nome, user?.email],
  );
  const displayName = user?.nome?.trim() || user?.email?.split('@')[0] || '';

  // Wait for sessionStorage hydration before deciding to redirect — otherwise
  // a refresh on /admin briefly bounces to /admin/login.
  if (!hydrated) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div
          role="status"
          aria-label="Carregando..."
          className="h-8 w-8 rounded-full border-2 border-slate-200 border-t-primary-500 animate-spin"
        />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/admin/login" replace />;
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Skip link for keyboard users */}
      <a
        href="#admin-main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-slate-900 focus:text-white focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary-400"
      >
        Pular para o conteúdo
      </a>

      {/* Sidebar overlay (mobile) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        id="admin-sidebar"
        className={[
          'fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white flex flex-col transition-transform duration-300 lg:static lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
        aria-label="Barra lateral"
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-5 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <LogoIcon size={28} />
            <span className="text-base font-display tracking-tight">
              <span className="text-white">Renove</span>
              <span className="text-primary-400">Já</span>
              <span className="text-slate-500 text-xs ml-1 uppercase tracking-widest">RH</span>
            </span>
          </div>
          <button
            type="button"
            className="lg:hidden p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
            onClick={() => setSidebarOpen(false)}
            aria-label="Fechar menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav
          aria-label="Navegação principal"
          className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto"
        >
          {navItems.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                [
                  'group relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400/70',
                  isActive
                    ? 'bg-primary-500/10 text-white border-l-2 border-primary-400 pl-[10px]'
                    : 'text-slate-400 border-l-2 border-transparent hover:text-white hover:bg-slate-800/70',
                ].join(' ')
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    size={17}
                    className={isActive ? 'text-primary-300' : 'text-slate-500 group-hover:text-slate-300'}
                  />
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User + logout */}
        <div className="px-3 py-3 border-t border-slate-800 shrink-0">
          <div className="flex items-center gap-3 px-2 py-2 rounded-lg">
            <div
              aria-hidden="true"
              className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 text-white text-xs font-bold shrink-0"
            >
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-white truncate">{displayName}</p>
              <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={logout}
            className="mt-1 w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-red-300 hover:bg-red-500/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400/60"
          >
            <LogOut size={15} />
            Sair
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center px-4 lg:px-8 shrink-0">
          <button
            type="button"
            className="lg:hidden p-2 -ml-2 mr-2 rounded-lg text-slate-500 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
            onClick={() => setSidebarOpen(true)}
            aria-label="Abrir menu"
            aria-expanded={sidebarOpen}
            aria-controls="admin-sidebar"
          >
            <Menu size={22} />
          </button>
          <h1 className="text-base lg:text-lg font-semibold text-slate-800 font-display">
            Painel Administrativo
          </h1>
          <div className="ml-auto hidden sm:flex items-center gap-3 text-xs text-slate-500">
            <span className="hidden md:inline">Olá, <span className="font-semibold text-slate-700">{displayName}</span></span>
            <div
              aria-hidden="true"
              className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 text-white text-[11px] font-bold"
            >
              {initials}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main
          id="admin-main-content"
          tabIndex={-1}
          className="flex-1 overflow-y-auto p-4 lg:p-8 focus:outline-none"
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
