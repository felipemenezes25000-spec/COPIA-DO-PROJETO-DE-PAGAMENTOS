/**
 * Breadcrumbs — Navegação hierárquica por pathname.
 * Apenas em desktop (hidden em mobile).
 */
import { useLocation, Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

const ROUTE_MAP: Record<string, string> = {
  '/dashboard': 'Painel',
  '/': 'Painel',
  '/pedidos': 'Pedidos',
  '/consultas': 'Consultas',
  '/pacientes': 'Pacientes',
  '/perfil': 'Perfil',
  '/notificacoes': 'Alertas',
};

function parseBreadcrumbs(pathname: string): { label: string; path: string }[] {
  const segments = pathname.split('/').filter(Boolean);
  const crumbs: { label: string; path: string }[] = [];

  if (pathname.startsWith('/paciente/') && segments.length >= 2) {
    crumbs.push({ label: 'Pacientes', path: '/pacientes' });
    crumbs.push({ label: 'Prontuário', path: pathname });
    return crumbs;
  }

  let acc = '';
  for (let i = 0; i < segments.length; i++) {
    acc += (acc ? '/' : '') + segments[i];
    const fullPath = '/' + acc;

    if (fullPath === '/dashboard' || fullPath === '/') {
      crumbs.push({ label: 'Painel', path: '/dashboard' });
    } else if (fullPath === '/pedidos') {
      crumbs.push({ label: 'Pedidos', path: '/pedidos' });
    } else if (fullPath.startsWith('/pedidos/') && segments[i] !== 'editor') {
      const id = segments[i];
      crumbs.push({ label: `Pedido #${id.slice(0, 8)}`, path: fullPath });
    } else if (fullPath.endsWith('/editor')) {
      crumbs.push({ label: 'Editor', path: fullPath });
    } else if (fullPath === '/consultas') {
      crumbs.push({ label: 'Consultas', path: '/consultas' });
    } else if (fullPath === '/perfil') {
      crumbs.push({ label: 'Perfil', path: '/perfil' });
    } else if (fullPath === '/notificacoes') {
      crumbs.push({ label: 'Alertas', path: '/notificacoes' });
    } else if (fullPath === '/pacientes') {
      crumbs.push({ label: 'Pacientes', path: '/pacientes' });
    }
  }

  if (crumbs.length === 0 && pathname !== '/') {
    const label = ROUTE_MAP[pathname] ?? pathname;
    crumbs.push({ label, path: pathname });
  }

  return crumbs;
}

export function Breadcrumbs() {
  const { pathname } = useLocation();
  const crumbs = parseBreadcrumbs(pathname);

  if (crumbs.length <= 1) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      className="hidden md:flex items-center gap-1.5 text-sm text-muted-foreground mb-4"
    >
      {crumbs.map((crumb, idx) => (
        <span key={crumb.path} className="flex items-center gap-1.5">
          {idx > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden />}
          {idx === crumbs.length - 1 ? (
            <span className="font-medium text-foreground">{crumb.label}</span>
          ) : (
            <Link
              to={crumb.path}
              className="hover:text-foreground transition-colors truncate max-w-[140px]"
            >
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
