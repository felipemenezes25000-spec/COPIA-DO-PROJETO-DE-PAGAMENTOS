import type {
  AdminUser,
  ApiKeyItem,
  AuditLogEntry,
  IntegrationCardData,
  NotificationMatrix,
  SessionInfo,
  WebhookItem,
} from './types';

export const MOCK_USERS: AdminUser[] = [
  {
    id: 'u1',
    name: 'Ana Paula Ribeiro',
    email: 'ana.ribeiro@saude.gov.br',
    role: 'super_admin',
    lastActivity: 'há 2 minutos',
  },
  {
    id: 'u2',
    name: 'Carlos Henrique Souza',
    email: 'carlos.souza@saude.gov.br',
    role: 'admin',
    lastActivity: 'há 1 hora',
  },
  {
    id: 'u3',
    name: 'Mariana Lopes',
    email: 'mariana.lopes@saude.gov.br',
    role: 'admin',
    lastActivity: 'há 3 horas',
  },
  {
    id: 'u4',
    name: 'Roberto Almeida',
    email: 'roberto.almeida@saude.gov.br',
    role: 'viewer',
    lastActivity: 'há 1 dia',
  },
  {
    id: 'u5',
    name: 'Juliana Castro',
    email: 'juliana.castro@saude.gov.br',
    role: 'admin',
    lastActivity: 'há 5 horas',
  },
  {
    id: 'u6',
    name: 'Fernando Dias',
    email: 'fernando.dias@saude.gov.br',
    role: 'viewer',
    lastActivity: 'há 2 dias',
  },
  {
    id: 'u7',
    name: 'Patrícia Moreira',
    email: 'patricia.moreira@saude.gov.br',
    role: 'admin',
    lastActivity: 'há 30 minutos',
  },
  {
    id: 'u8',
    name: 'Lucas Fernandes',
    email: 'lucas.fernandes@saude.gov.br',
    role: 'viewer',
    lastActivity: 'há 4 dias',
  },
];

export const MOCK_INTEGRATIONS: IntegrationCardData[] = [
  {
    id: 'aws-s3',
    name: 'AWS S3',
    description: 'Armazenamento de prescrições, certificados e avatares.',
    status: 'connected',
    icon: 'cloud',
  },
  {
    id: 'daily',
    name: 'Daily.co',
    description: 'Vídeo e transcrição de consultas via Deepgram.',
    status: 'connected',
    icon: 'video',
  },
  {
    id: 'openai',
    name: 'OpenAI GPT-4o',
    description: 'IA principal para copiloto clínico.',
    status: 'connected',
    icon: 'sparkles',
  },
  {
    id: 'gemini',
    name: 'Gemini 2.5 Flash',
    description: 'Fallback de IA para alta disponibilidade.',
    status: 'connected',
    icon: 'sparkles',
  },
  {
    id: 'smtp',
    name: 'SMTP',
    description: 'Servidor de envio de e-mails transacionais.',
    status: 'configure',
    icon: 'mail',
  },
  {
    id: 'webhook',
    name: 'Webhook genérico',
    description: 'Envio de eventos para sistemas externos.',
    status: 'configure',
    icon: 'webhook',
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'Notificações em canais do Slack.',
    status: 'disconnected',
    icon: 'slack',
  },
  {
    id: 'teams',
    name: 'Microsoft Teams',
    description: 'Notificações em canais do Teams.',
    status: 'disconnected',
    icon: 'users',
  },
];

export const MOCK_SESSIONS: SessionInfo[] = [
  {
    id: 's1',
    device: 'Chrome 128 · Windows 11',
    ip: '189.32.14.221',
    location: 'Uberlândia, MG',
    current: true,
  },
  {
    id: 's2',
    device: 'Safari · iPhone 15',
    ip: '177.48.212.9',
    location: 'Belo Horizonte, MG',
    current: false,
  },
  {
    id: 's3',
    device: 'Edge · MacOS',
    ip: '200.155.88.14',
    location: 'São Paulo, SP',
    current: false,
  },
];

export const MOCK_AUDIT: AuditLogEntry[] = [
  {
    id: 'a1',
    actor: 'Ana Ribeiro',
    action: 'Aprovou médico',
    target: 'Dr. João Silva (CRM 12345)',
    timestamp: '08/04 14:32',
  },
  {
    id: 'a2',
    actor: 'Carlos Souza',
    action: 'Alterou permissão',
    target: 'Mariana Lopes → admin',
    timestamp: '08/04 13:12',
  },
  {
    id: 'a3',
    actor: 'Ana Ribeiro',
    action: 'Regenerou API key',
    target: 'key_prod_***a12',
    timestamp: '08/04 11:04',
  },
  {
    id: 'a4',
    actor: 'Sistema',
    action: 'Backup executado',
    target: 'S3://renoveja-backups',
    timestamp: '08/04 06:00',
  },
  {
    id: 'a5',
    actor: 'Juliana Castro',
    action: 'Convidou usuário',
    target: 'novo.admin@saude.gov.br',
    timestamp: '07/04 18:45',
  },
  {
    id: 'a6',
    actor: 'Carlos Souza',
    action: 'Desativou integração',
    target: 'Slack',
    timestamp: '07/04 16:20',
  },
  {
    id: 'a7',
    actor: 'Ana Ribeiro',
    action: 'Rejeitou médico',
    target: 'Dr. Paulo R. (CRM 98765)',
    timestamp: '07/04 14:11',
  },
  {
    id: 'a8',
    actor: 'Sistema',
    action: 'Anomalia detectada',
    target: 'Pico de solicitações (IA)',
    timestamp: '07/04 10:02',
  },
  {
    id: 'a9',
    actor: 'Patrícia Moreira',
    action: 'Atualizou política de senha',
    target: 'min 12 chars',
    timestamp: '06/04 22:18',
  },
  {
    id: 'a10',
    actor: 'Lucas Fernandes',
    action: 'Exportou dados',
    target: 'CSV médicos',
    timestamp: '06/04 20:05',
  },
];

export const MOCK_API_KEYS: ApiKeyItem[] = [
  {
    id: 'k1',
    name: 'Produção Principal',
    createdAt: '12/01/2025',
    lastUsed: 'há 2 min',
    maskedKey: 'rnv_prod_****************a12f',
  },
  {
    id: 'k2',
    name: 'Homologação',
    createdAt: '03/02/2025',
    lastUsed: 'há 4 horas',
    maskedKey: 'rnv_hml_****************9b21',
  },
  {
    id: 'k3',
    name: 'CI/CD GitHub Actions',
    createdAt: '19/03/2025',
    lastUsed: 'há 1 dia',
    maskedKey: 'rnv_ci_*****************77cc',
  },
];

export const MOCK_WEBHOOKS: WebhookItem[] = [
  {
    id: 'w1',
    event: 'doctor.approved',
    url: 'https://hooks.sus.gov.br/doctor',
    active: true,
  },
  {
    id: 'w2',
    event: 'prescription.signed',
    url: 'https://api.parceiro.com/rx',
    active: true,
  },
  {
    id: 'w3',
    event: 'ai.anomaly',
    url: 'https://alerts.renoveja.app/ai',
    active: false,
  },
];

export const DEFAULT_NOTIFICATIONS: NotificationMatrix = {
  newDoctors: { email: true, push: true, sms: false },
  pendingApprovals: { email: true, push: true, sms: true },
  weeklyReports: { email: true, push: false, sms: false },
  aiAnomalies: { email: true, push: true, sms: true },
  systemUpdates: { email: false, push: true, sms: false },
  securityAlerts: { email: true, push: true, sms: true },
};

export const NOTIFICATION_LABELS: Record<
  keyof NotificationMatrix,
  { title: string; description: string }
> = {
  newDoctors: {
    title: 'Novos cadastros de médicos',
    description: 'Quando um médico envia documentação para aprovação.',
  },
  pendingApprovals: {
    title: 'Aprovações pendentes > 48h',
    description: 'Alerta para solicitações paradas há mais de 48 horas.',
  },
  weeklyReports: {
    title: 'Relatórios semanais',
    description: 'Resumo semanal de métricas do painel administrativo.',
  },
  aiAnomalies: {
    title: 'Anomalias detectadas pela IA',
    description: 'Quando a IA identifica padrões fora do comum.',
  },
  systemUpdates: {
    title: 'Atualizações do sistema',
    description: 'Novas versões, manutenções programadas e deploys.',
  },
  securityAlerts: {
    title: 'Alertas de segurança',
    description: 'Tentativas de acesso suspeitas e violações de política.',
  },
};
