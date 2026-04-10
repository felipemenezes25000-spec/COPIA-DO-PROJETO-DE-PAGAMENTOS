export type SectionId =
  | 'perfil'
  | 'organizacao'
  | 'usuarios'
  | 'notificacoes'
  | 'integracoes'
  | 'seguranca'
  | 'aparencia'
  | 'api'
  | 'backup'
  | 'sobre';

export type AdminRole = 'super_admin' | 'admin' | 'viewer';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  lastActivity: string;
  avatarUrl?: string;
}

export interface IntegrationCardData {
  id: string;
  name: string;
  description: string;
  status: 'connected' | 'configure' | 'disconnected';
  icon: string;
}

export interface SessionInfo {
  id: string;
  device: string;
  ip: string;
  location: string;
  current: boolean;
}

export interface AuditLogEntry {
  id: string;
  actor: string;
  action: string;
  target: string;
  timestamp: string;
}

export interface ApiKeyItem {
  id: string;
  name: string;
  createdAt: string;
  lastUsed: string;
  maskedKey: string;
}

export interface WebhookItem {
  id: string;
  event: string;
  url: string;
  active: boolean;
}

export type NotificationChannel = 'email' | 'push' | 'sms';
export type NotificationKey =
  | 'newDoctors'
  | 'pendingApprovals'
  | 'weeklyReports'
  | 'aiAnomalies'
  | 'systemUpdates'
  | 'securityAlerts';

export type NotificationMatrix = Record<
  NotificationKey,
  Record<NotificationChannel, boolean>
>;

export interface PasswordPolicy {
  minChars: number;
  requireUppercase: boolean;
  requireNumbers: boolean;
  requireSymbols: boolean;
  expiresDays: number;
}

export interface AppearanceSettings {
  theme: 'light' | 'dark' | 'system';
  primaryColor: string;
  density: 'compact' | 'comfortable';
  language: 'pt-BR' | 'en' | 'es';
  timezone: string;
}
