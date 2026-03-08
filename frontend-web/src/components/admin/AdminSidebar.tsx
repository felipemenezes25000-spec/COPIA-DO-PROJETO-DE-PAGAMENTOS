import { useLocation } from "react-router-dom";
import { NavLink } from "./NavLink";
import { LayoutDashboard, UserCheck, Settings, Menu, X, LogOut } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { logout } from "@/services/adminApi";

const navItems = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/medicos", label: "Médicos", icon: UserCheck },
  { to: "/admin/configuracoes", label: "Configurações", icon: Settings },
];

export const AdminSidebar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

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

        <nav className="flex-1 p-4 space-y-1" aria-label="Menu principal">
          {navItems.map((item) => {
            const isActive = location.pathname === item.to;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive
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
