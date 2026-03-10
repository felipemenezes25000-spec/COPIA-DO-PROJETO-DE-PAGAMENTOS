/**
 * doctor-api-doctors.ts — Notifications, certificates, and video rooms.
 */

import { authFetch } from './doctor-api-auth';

// ── Notifications ──

export async function getNotifications(params?: { page?: number; pageSize?: number }) {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.pageSize) query.set('pageSize', String(params.pageSize));
  const qs = query.toString();
  const res = await authFetch(`/api/notifications${qs ? `?${qs}` : ''}`);
  if (!res.ok) throw new Error('Erro ao buscar notificações');
  return res.json();
}

export async function markNotificationRead(id: string) {
  const res = await authFetch(`/api/notifications/${id}/read`, { method: 'PUT' });
  if (!res.ok) throw new Error('Erro ao marcar como lida');
  return res.json();
}

export async function markAllNotificationsRead() {
  const res = await authFetch('/api/notifications/read-all', { method: 'PUT' });
  if (!res.ok) throw new Error('Erro ao marcar todas como lidas');
  return res.json();
}

// ── Certificates ──

export async function getActiveCertificate() {
  const res = await authFetch('/api/certificates/active');
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error('Erro ao buscar certificado');
  }
  return res.json();
}

export async function uploadCertificate(file: File, password: string) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('password', password);
  const res = await authFetch('/api/certificates/upload', { method: 'POST', body: formData });
  if (!res.ok) throw new Error('Erro ao enviar certificado');
  return res.json();
}

// ── Video ──

export async function createVideoRoom(requestId: string) {
  const res = await authFetch('/api/video/rooms', {
    method: 'POST',
    body: JSON.stringify({ requestId }),
  });
  if (!res.ok) throw new Error('Erro ao criar sala');
  return res.json();
}

export async function getJoinToken(requestId: string) {
  const res = await authFetch('/api/video/join-token', {
    method: 'POST',
    body: JSON.stringify({ requestId }),
  });
  if (!res.ok) throw new Error('Erro ao obter token de vídeo');
  return res.json();
}

export async function getVideoRoom(requestId: string) {
  const res = await authFetch(`/api/video/by-request/${requestId}`);
  if (!res.ok) return null;
  return res.json();
}
