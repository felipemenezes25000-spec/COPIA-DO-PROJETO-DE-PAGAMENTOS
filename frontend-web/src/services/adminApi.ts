/**
 * API do painel admin — aprovação/reprovação de médicos.
 * Usa VITE_API_URL (mesma URL do backend que o frontend-web usa para verify).
 */

function getApiBase(): string {
  const env = (import.meta.env.VITE_API_URL ?? "").trim().replace(/\/$/, "");
  if (env) return env;
  if (typeof window !== "undefined" && window.location?.origin) return window.location.origin;
  return "";
}

function getToken(): string | null {
  return localStorage.getItem("admin_auth_token");
}

async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const base = getApiBase();
  if (!base) throw new Error("URL da API não configurada. Defina VITE_API_URL.");
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${base}${url}`, { ...options, headers });
  if (res.status === 401) {
    localStorage.removeItem("admin_auth_token");
    window.location.href = "/admin/login";
    throw new Error("Não autorizado");
  }
  return res;
}

export async function login(email: string, password: string) {
  const base = getApiBase();
  if (!base) throw new Error("URL da API não configurada. Defina VITE_API_URL.");
  const res = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error("Credenciais inválidas");
  const data = await res.json();
  localStorage.setItem("admin_auth_token", data.token);
  return data;
}

export function logout() {
  localStorage.removeItem("admin_auth_token");
  window.location.href = "/admin/login";
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

export async function getDoctors(status?: string) {
  const query = status && status !== "all" ? `?status=${status}` : "";
  const res = await authFetch(`/api/admin/doctors${query}`);
  if (!res.ok) throw new Error("Erro ao buscar médicos");
  return res.json();
}

export async function approveDoctor(id: string) {
  const res = await authFetch(`/api/admin/doctors/${id}/approve`, { method: "POST" });
  if (!res.ok) throw new Error("Erro ao aprovar médico");
  return res.json();
}

export async function rejectDoctor(id: string, reason?: string) {
  const res = await authFetch(`/api/admin/doctors/${id}/reject`, {
    method: "POST",
    body: JSON.stringify({ reason: reason || "" }),
  });
  if (!res.ok) throw new Error("Erro ao recusar médico");
  return res.json();
}
