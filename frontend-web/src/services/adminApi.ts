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

const ADMIN_TOKEN_KEY = "admin_auth_token";
const ADMIN_LOGIN_AT_KEY = "admin_login_at";
/** Tokens do backend expiram em 30 dias; consideramos expirado após 25 dias no client para evitar UX quebrada. */
const TOKEN_VALID_DAYS = 25;

function getToken(): string | null {
  return localStorage.getItem(ADMIN_TOKEN_KEY);
}

function getLoginTimestamp(): number | null {
  const raw = localStorage.getItem(ADMIN_LOGIN_AT_KEY);
  if (!raw) return null;
  const ts = parseInt(raw, 10);
  return Number.isNaN(ts) ? null : ts;
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
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    localStorage.removeItem(ADMIN_LOGIN_AT_KEY);
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
  localStorage.setItem(ADMIN_TOKEN_KEY, data.token);
  localStorage.setItem(ADMIN_LOGIN_AT_KEY, String(Date.now()));
  return data;
}

export function logout() {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
  localStorage.removeItem(ADMIN_LOGIN_AT_KEY);
  window.location.href = "/admin/login";
}

export function isAuthenticated(): boolean {
  const token = getToken();
  if (!token) return false;
  const loginAt = getLoginTimestamp();
  if (loginAt == null) return true; // token antigo sem timestamp — deixa a primeira chamada API retornar 401
  const ageDays = (Date.now() - loginAt) / (1000 * 60 * 60 * 24);
  if (ageDays > TOKEN_VALID_DAYS) {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    localStorage.removeItem(ADMIN_LOGIN_AT_KEY);
    return false;
  }
  return true;
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
