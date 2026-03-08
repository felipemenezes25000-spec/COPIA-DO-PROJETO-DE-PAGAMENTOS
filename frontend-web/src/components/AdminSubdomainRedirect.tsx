import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

/**
 * Quando o usuário acessa admin.renovejasaude.com.br/ (raiz),
 * redireciona para /admin (dashboard) ou /admin/login.
 */
export function AdminSubdomainRedirect() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const isAdminSubdomain = window.location.hostname.startsWith("admin.");
    if (isAdminSubdomain && location.pathname === "/") {
      navigate("/admin", { replace: true });
    }
  }, [navigate, location.pathname]);

  return null;
}
