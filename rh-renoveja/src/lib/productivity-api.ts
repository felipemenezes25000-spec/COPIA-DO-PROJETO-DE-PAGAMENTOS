/**
 * Cliente do Monitor de Produtividade Médica.
 *
 * Reaproveita a `getApi()` do admin-api existente para compartilhar o
 * MESMO AxiosInstance (e, portanto, os interceptors de 401/429/rate-limit).
 * Isso é crítico porque todas as 4 páginas admin (Produtividade, Fila ao
 * vivo, Relatórios, Precificação) fazem polling agressivo — um token expirado
 * durante polling precisa disparar o evento `admin:unauthorized` UMA vez
 * e mandar pra tela de login, em vez de ficar martelando o backend com 401.
 *
 * Antes desta correção, este arquivo tinha sua própria getApi() que criava
 * nova AxiosInstance a cada chamada, sem interceptors, e o comentário aqui
 * mentia dizendo que reaproveitava — as 4 páginas ficavam presas em loop
 * de erro se o admin deixasse a aba aberta por horas.
 *
 * Todos os endpoints aqui são GET, exceto os CRUDs de pricing/contracts
 * que suportam PUT/POST/DELETE.
 */

import axios, { AxiosError } from 'axios';
import { getApi, authHeaders } from './admin-api';
import type {
  OverviewDto,
  DoctorProductivityRow,
  DoctorDetailDto,
  FunnelDto,
  SlaDto,
  LiveQueueDto,
  ProductPriceDto,
  UpsertProductPriceDto,
  CreateCustomProductDto,
  DoctorContractDto,
  UpsertDoctorContractDto,
} from '../types/productivity';

function toIso(d: Date): string {
  return d.toISOString();
}

/** Query string helper — só adiciona parâmetros não-vazios. */
function buildParams(record: Record<string, string | number | undefined | null>): URLSearchParams {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(record)) {
    if (v !== undefined && v !== null && v !== '') {
      params.set(k, String(v));
    }
  }
  return params;
}

/**
 * Wrapper para evitar ruído em cancelamentos de polling: quando o AbortController
 * dispara cancel(), o axios rejeita com `code = 'ERR_CANCELED'`. Convertemos para
 * um valor especial que o hook de polling entende como "ignorar, tente depois".
 */
function isCancelled(err: unknown): boolean {
  if (axios.isCancel(err)) return true;
  const e = err as AxiosError;
  return e?.code === 'ERR_CANCELED';
}

/* ─────────────────────────────────────────────────────────────── */
/* Productivity GET endpoints                                        */
/* ─────────────────────────────────────────────────────────────── */

export async function fetchOverview(
  from: Date,
  to: Date,
  token?: string | null,
  signal?: AbortSignal,
): Promise<OverviewDto> {
  const api = getApi();
  const params = buildParams({ from: toIso(from), to: toIso(to) });
  const { data } = await api.get<OverviewDto>('/api/admin/productivity/overview', {
    params,
    headers: authHeaders(token),
    signal,
  });
  return data;
}

export async function fetchDoctorRanking(
  from: Date,
  to: Date,
  opts?: { sort?: 'revenue' | 'volume' | 'p50'; limit?: number },
  token?: string | null,
  signal?: AbortSignal,
): Promise<DoctorProductivityRow[]> {
  const api = getApi();
  const params = buildParams({
    from: toIso(from),
    to: toIso(to),
    sort: opts?.sort ?? 'revenue',
    limit: opts?.limit ?? 50,
  });
  const { data } = await api.get<DoctorProductivityRow[]>('/api/admin/productivity/doctors', {
    params,
    headers: authHeaders(token),
    signal,
  });
  return data;
}

export async function fetchDoctorDetail(
  doctorProfileId: string,
  from: Date,
  to: Date,
  token?: string | null,
  signal?: AbortSignal,
): Promise<DoctorDetailDto | null> {
  const api = getApi();
  const params = buildParams({ from: toIso(from), to: toIso(to) });
  try {
    const { data } = await api.get<DoctorDetailDto>(
      `/api/admin/productivity/doctors/${doctorProfileId}`,
      { params, headers: authHeaders(token), signal },
    );
    return data;
  } catch (err) {
    if (isCancelled(err)) throw err;
    if ((err as AxiosError)?.response?.status === 404) return null;
    throw err;
  }
}

export async function fetchFunnel(
  from: Date,
  to: Date,
  token?: string | null,
  signal?: AbortSignal,
): Promise<FunnelDto> {
  const api = getApi();
  const params = buildParams({ from: toIso(from), to: toIso(to) });
  const { data } = await api.get<FunnelDto>('/api/admin/productivity/funnel', {
    params,
    headers: authHeaders(token),
    signal,
  });
  return data;
}

export async function fetchSla(
  from: Date,
  to: Date,
  token?: string | null,
  signal?: AbortSignal,
): Promise<SlaDto> {
  const api = getApi();
  const params = buildParams({ from: toIso(from), to: toIso(to) });
  const { data } = await api.get<SlaDto>('/api/admin/productivity/sla', {
    params,
    headers: authHeaders(token),
    signal,
  });
  return data;
}

export async function fetchLiveQueue(
  token?: string | null,
  signal?: AbortSignal,
): Promise<LiveQueueDto> {
  const api = getApi();
  const { data } = await api.get<LiveQueueDto>('/api/admin/productivity/queue/live', {
    headers: authHeaders(token),
    signal,
  });
  return data;
}

export async function downloadReportCsv(
  from: Date,
  to: Date,
  token?: string | null,
): Promise<Blob> {
  const api = getApi();
  const params = buildParams({ from: toIso(from), to: toIso(to), format: 'csv' });
  const { data } = await api.get<Blob>('/api/admin/productivity/reports/export', {
    params,
    headers: authHeaders(token),
    responseType: 'blob',
  });
  return data;
}

/* ─────────────────────────────────────────────────────────────── */
/* Pricing CRUD                                                      */
/* ─────────────────────────────────────────────────────────────── */

export async function fetchProductPrices(
  includeInactive = false,
  token?: string | null,
): Promise<ProductPriceDto[]> {
  const api = getApi();
  const params = buildParams({ includeInactive: includeInactive ? 'true' : undefined });
  const { data } = await api.get<ProductPriceDto[]>('/api/admin/pricing/products', {
    params,
    headers: authHeaders(token),
  });
  return data;
}

export async function updateProductPrice(
  productKey: string,
  dto: UpsertProductPriceDto,
  token?: string | null,
): Promise<ProductPriceDto> {
  const api = getApi();
  const { data } = await api.put<ProductPriceDto>(
    `/api/admin/pricing/products/${encodeURIComponent(productKey)}`,
    dto,
    { headers: authHeaders(token) },
  );
  return data;
}

export async function createCustomProduct(
  dto: CreateCustomProductDto,
  token?: string | null,
): Promise<ProductPriceDto> {
  const api = getApi();
  const { data } = await api.post<ProductPriceDto>('/api/admin/pricing/products', dto, {
    headers: authHeaders(token),
  });
  return data;
}

export async function deactivateProduct(
  productKey: string,
  token?: string | null,
): Promise<void> {
  const api = getApi();
  await api.delete(`/api/admin/pricing/products/${encodeURIComponent(productKey)}`, {
    headers: authHeaders(token),
  });
}

/* ─────────────────────────────────────────────────────────────── */
/* Contracts CRUD                                                    */
/* ─────────────────────────────────────────────────────────────── */

export async function fetchActiveContracts(
  token?: string | null,
): Promise<DoctorContractDto[]> {
  const api = getApi();
  const { data } = await api.get<DoctorContractDto[]>('/api/admin/contracts', {
    headers: authHeaders(token),
  });
  return data;
}

export async function fetchContractByDoctor(
  doctorProfileId: string,
  token?: string | null,
): Promise<DoctorContractDto | null> {
  const api = getApi();
  try {
    const { data } = await api.get<DoctorContractDto>(
      `/api/admin/contracts/doctors/${doctorProfileId}`,
      { headers: authHeaders(token) },
    );
    return data;
  } catch (err) {
    if ((err as AxiosError)?.response?.status === 404) return null;
    throw err;
  }
}

export async function upsertContract(
  doctorProfileId: string,
  dto: UpsertDoctorContractDto,
  token?: string | null,
): Promise<DoctorContractDto> {
  const api = getApi();
  const { data } = await api.put<DoctorContractDto>(
    `/api/admin/contracts/doctors/${doctorProfileId}`,
    dto,
    { headers: authHeaders(token) },
  );
  return data;
}

export async function deactivateContract(
  doctorProfileId: string,
  token?: string | null,
): Promise<void> {
  const api = getApi();
  await api.delete(`/api/admin/contracts/doctors/${doctorProfileId}`, {
    headers: authHeaders(token),
  });
}
