import { useLocation } from "react-router-dom";
import { NavLink } from "./NavLink";
import {
  LayoutDashboard, UserCheck, Settings, Menu, X, LogOut,
  TrendingUp, Moon, Sun, ChevronDown, Calculator, BarChart3,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { logout } from "@/services/adminApi";
import { useTheme } from "@/hooks/useTheme";

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: { to: string; label: string; icon: React.ComponentType<{ className?: string }> }[];
}

const navItems: NavItem[] = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/medicos", label: "Médicos", icon: UserCheck },
  {
    to: "/admin/financeiro",
    label: "Financeiro",
    icon: TrendingUp,
    children: [
      { to: "/admin/financeiro/simulacoes", label: "Simulações", icon: Calculator },
      { to: "/admin/financeiro/relatorios", label: "Relatórios", icon: BarChart3 },
    ],
  },
  { to: "/admin/configuracoes", label: "Configurações", icon: Settings },
];

export const AdminSidebar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { isDark, toggleDarkMode } = useTheme();
  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    navItems.forEach((item) => {
      if (item.children && location.pathname.startsWith(item.to)) {
        initial.add(item.to);
      }
    });
    return initial;
  });

  const toggleExpand = (to: string) => {
    setExpandedMenus((prev) => {
      const next = new Set(prev);
      if (next.has(to)) next.delete(to);
      else next.add(to);
      return next;
    });
  };

  const isActive = (to: string, hasChildren: boolean) => {
    if (hasChildren) return location.pathname.startsWith(to);
    return location.pathname === to;
  };

  return (
    <>
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed top-4 left-4 z-50 lg:hidden rounded-lg bg-card p-2 shadow-md border border-border"
        aria-label="Abrir menu"
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
          "fixed lg:sticky top-0 left-0 z-40 h-screen w-64 bg-sidebar border-r border-sidebar-border flex flex-col transition-transform duration-200",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="p-6 border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">R</span>
            </div>
            <div>
              <span className="font-bold text-foreground">Renove</span>
              <span className="font-bold text-primary">Já</span>
              <span className="text-primary font-bold">+</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Painel Administrativo</p>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto" aria-label="Menu principal">
          {navItems.map((item) => {
            const hasChildren = !!item.children?.length;
            const active = isActive(item.to, hasChildren);
            const expanded = expandedMenus.has(item.to);

            if (hasChildren) {
              return (
                <div key={item.to}>
                  <button
                    onClick={() => toggleExpand(item.to)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors w-full",
                      active
                        ? "bg-sidebar-accent text-sidebar-primary"
                        : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    )}
                  >
                    <item.icon className="h-4 w-4" aria-hidden />
                    <span className="flex-1 text-left">{item.label}</span>
                    <ChevronDown
                      className={cn(
                        "h-3.5 w-3.5 transition-transform duration-200",
                        expanded && "rotate-180"
                      )}
                      aria-hidden
                    />
                  </button>
                  <div
                    className={cn(
                      "overflow-hidden transition-all duration-200",
                      expanded ? "max-h-40 opacity-100 mt-1" : "max-h-0 opacity-0"
                    )}
                  >
                    <div className="ml-4 pl-3 border-l border-sidebar-border space-y-0.5">
                      {item.children!.map((child) => {
                        const childActive = location.pathname === child.to;
                        return (
                          <NavLink
                            key={child.to}
                            to={child.to}
                            onClick={() => setMobileOpen(false)}
                            className={cn(
                              "flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[13px] font-medium transition-colors",
                              childActive
                                ? "bg-sidebar-accent text-sidebar-primary"
                                : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                            )}
                          >
                            <child.icon className="h-3.5 w-3.5" aria-hidden />
                            {child.label}
                          </NavLink>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-primary"
                    : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <item.icon className="h-4 w-4" aria-hidden />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 border-t border-sidebar-border space-y-3">
          <button
            onClick={toggleDarkMode}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full"
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {isDark ? "Modo claro" : "Modo escuro"}
          </button>
          <button
            onClick={logout}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-destructive transition-colors w-full"
          >
            <LogOut className="h-4 w-4" aria-hidden />
            Sair
          </button>
          <p className="text-xs text-muted-foreground">© 2026 RenoveJá Saúde</p>
        </div>
      </aside>
    </>
  );
};
