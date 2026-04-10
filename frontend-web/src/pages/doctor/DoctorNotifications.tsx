import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { DoctorLayout } from '@/components/doctor/DoctorLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Pagination } from '@/components/ui/pagination';
import {
  getNotifications,
  markNotificationRead,
  type NotificationItem,
} from '@/services/doctorApi';
import { useNotifications } from '@/contexts/NotificationContext';
import { useRequestEvents } from '@/hooks/useSignalR';
import { parseApiList } from '@/lib/doctor-helpers';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import {
  Loader2,
  Bell,
  BellOff,
  CheckCheck,
  FileText,
  Stethoscope,
  ChevronRight,
  Clock,
  ExternalLink,
} from 'lucide-react';

type FilterType = 'all' | 'requests' | 'consultations';

function getCategoryIcon(type: string | undefined) {
  const t = (type ?? '').toLowerCase();
  if (t.includes('consult')) return Stethoscope;
  if (t.includes('request') || t.includes('pedido')) return FileText;
  return Bell;
}

/** Returns a left-border color class based on notification type */
function getBorderColor(type: string | undefined): string {
  const t = (type ?? '').toLowerCase();
  if (t.includes('request') || t.includes('pedido')) return 'border-l-blue-500';
  if (t.includes('consult')) return 'border-l-violet-500';
  if (t.includes('success') || t.includes('sucesso'))
    return 'border-l-emerald-500';
  if (t.includes('reminder') || t.includes('lembrete'))
    return 'border-l-amber-400';
  return 'border-l-blue-500';
}

function getTimeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Agora';
  if (mins < 60) return `${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
  });
}

/** Temporal notifications (e.g. "consultation in X min") older than 2h are expired. */
function isExpiredTemporal(item: NotificationItem): boolean {
  const msg = (item.message ?? '').toLowerCase();
  const title = (item.title ?? '').toLowerCase();
  const temporal =
    msg.includes('começa em') ||
    msg.includes('minuto') ||
    msg.includes('toque para entrar') ||
    title.includes('começa em') ||
    title.includes('minuto') ||
    title.includes('toque para entrar');
  if (!temporal) return false;
  const ageMs = Date.now() - new Date(item.createdAt).getTime();
  return ageMs > 2 * 60 * 60 * 1000;
}

/** Extract requestId from data (may come camelCase or PascalCase from backend). */
function getRequestId(item: NotificationItem): string | undefined {
  const d = item.data;
  if (!d) return undefined;
  return (d.requestId ?? d.RequestId ?? d.request_id) as string | undefined;
}

function matchesFilter(item: NotificationItem, filter: FilterType): boolean {
  if (filter === 'all') return true;
  const t = (item.notificationType ?? '').toLowerCase();
  if (filter === 'requests')
    return t.includes('request') || t.includes('pedido');
  if (filter === 'consultations') return t.includes('consult');
  return true;
}

function groupByDate(items: NotificationItem[]) {
  const groups: { label: string; items: NotificationItem[] }[] = [];
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  const weekAgo = Date.now() - 7 * 86400000;

  items.forEach((item) => {
    const d = new Date(item.createdAt);
    const ds = d.toDateString();
    let label = '';
    if (ds === today) label = 'HOJE';
    else if (ds === yesterday) label = 'ONTEM';
    else if (d.getTime() > weekAgo) label = 'ESTA SEMANA';
    else
      label = d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' });

    const existing = groups.find((g) => g.label === label);
    if (existing) existing.items.push(item);
    else groups.push({ label, items: [item] });
  });

  return groups;
}

const PAGE_SIZE = 20;

const FILTERS: { key: FilterType; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'requests', label: 'Pedidos' },
  { key: 'consultations', label: 'Consultas' },
];

export default function DoctorNotifications() {
  const navigate = useNavigate();
  const { unreadCount, decrementUnreadCount, markAllReadOptimistic } =
    useNotifications();

  useEffect(() => {
    document.title =
      unreadCount > 0
        ? `Alertas (${unreadCount}) — RenoveJa+`
        : 'Alertas — RenoveJa+';
    return () => {
      document.title = 'RenoveJa+';
    };
  }, [unreadCount]);

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');

  const fetchNotifications = useCallback((p: number) => {
    getNotifications({ page: p, pageSize: PAGE_SIZE })
      .then((data) => {
        const parsed = data as
          | { items?: NotificationItem[]; totalCount?: number }
          | NotificationItem[];
        if (Array.isArray(parsed)) {
          setNotifications(parsed);
          setTotalCount(parsed.length);
        } else {
          setNotifications(
            parsed.items ?? parseApiList<NotificationItem>(data)
          );
          setTotalCount(parsed.totalCount ?? 0);
        }
      })
      .catch(() => {
        // Antes mostrávamos apenas empty state, o que fazia o médico pensar
        // que não havia notificações quando na verdade a API falhou.
        setNotifications([]);
        setTotalCount(0);
        toast.error('Erro ao carregar notificações. Tente novamente.');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchNotifications(page);
  }, [page, fetchNotifications]);

  useRequestEvents(
    useCallback(() => {
      fetchNotifications(page);
    }, [fetchNotifications, page])
  );

  const handleMarkRead = async (item: NotificationItem) => {
    if (item.read) {
      handleNavigate(item);
      return;
    }
    try {
      await markNotificationRead(item.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, read: true } : n))
      );
      decrementUnreadCount();
      handleNavigate(item);
    } catch {
      // Antes silenciava: médico clicava e nada acontecia. Agora avisamos
      // e ainda assim navegamos (o ato de abrir o pedido é o mais importante —
      // a marcação como lida pode ser tentada de novo depois).
      toast.error(
        'Não foi possível marcar como lida. Abrindo pedido mesmo assim.'
      );
      handleNavigate(item);
    }
  };

  const handleNavigate = (item: NotificationItem) => {
    const requestId = getRequestId(item);
    if (requestId) navigate(`/pedidos/${requestId}`);
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllReadOptimistic();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      toast.success('Todas marcadas como lidas');
    } catch {
      toast.error('Erro ao marcar');
    }
  };

  const handlePageChange = (p: number) => {
    setPage(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const sorted = [...notifications].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const filtered = sorted.filter((item) => matchesFilter(item, filter));
  const groups = groupByDate(filtered);
  const hasAnyUnread = notifications.some((n) => !n.read);

  return (
    <DoctorLayout>
      <div className="mx-auto max-w-3xl space-y-4 px-2 sm:space-y-6 sm:px-0">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="flex items-center gap-2 text-lg font-bold tracking-tight sm:gap-3 sm:text-2xl">
              Alertas
              {unreadCount > 0 && (
                <span className="inline-flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-bold text-white">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </h1>
          </div>
          {(unreadCount > 0 || hasAnyUnread) && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllRead}
              className="shrink-0 gap-1.5 text-xs sm:text-sm"
            >
              <CheckCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Ler todas</span>
              <span className="sm:hidden">Ler</span>
            </Button>
          )}
        </div>

        {/* Segmented filter tabs */}
        <div className="flex w-max max-w-full gap-1 rounded-lg bg-muted p-1">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-all sm:px-4 ${
                filter === f.key
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <Card className="shadow-sm">
            <CardContent className="py-16 text-center">
              <BellOff className="mx-auto mb-3 h-12 w-12 text-muted-foreground/30" />
              <p className="font-medium text-muted-foreground">
                {filter !== 'all'
                  ? 'Nenhuma notificação neste filtro'
                  : 'Nenhuma notificação'}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Você receberá alertas de novos pedidos aqui
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="space-y-5 sm:space-y-6">
              {groups.map((group) => (
                <div key={group.label}>
                  {/* Date group separator */}
                  <div className="mb-2.5 flex items-center gap-3 px-1">
                    <p className="whitespace-nowrap text-[11px] font-bold uppercase tracking-wider text-foreground/60 sm:text-xs">
                      {group.label}
                    </p>
                    <div className="h-px flex-1 bg-border" />
                  </div>
                  <div className="space-y-2">
                    {group.items.map((item, i) => {
                      const Icon = getCategoryIcon(item.notificationType);
                      const expired = isExpiredTemporal(item);
                      const requestId = getRequestId(item);
                      const hasLink = !!requestId;
                      const borderColor = getBorderColor(item.notificationType);

                      return (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.03 }}
                        >
                          <Card
                            className={`group relative cursor-pointer overflow-hidden border-l-[3px] transition-all ${borderColor} ${
                              expired
                                ? 'opacity-50 shadow-none'
                                : !item.read
                                  ? 'shadow-sm hover:shadow-md'
                                  : 'opacity-65 shadow-none hover:opacity-90 hover:shadow-sm'
                            }`}
                            onClick={() => handleMarkRead(item)}
                          >
                            <CardContent className="flex items-start gap-3 p-3 sm:items-center sm:p-4">
                              {/* Icon */}
                              <div
                                className={`mt-0.5 shrink-0 rounded-xl p-2 sm:mt-0 sm:p-2.5 ${
                                  expired
                                    ? 'bg-muted/50'
                                    : !item.read
                                      ? 'bg-primary/10'
                                      : 'bg-muted'
                                }`}
                              >
                                {expired ? (
                                  <Clock className="h-4 w-4 text-muted-foreground/50" />
                                ) : (
                                  <Icon
                                    className={`h-4 w-4 ${!item.read ? 'text-primary' : 'text-muted-foreground'}`}
                                  />
                                )}
                              </div>

                              {/* Content */}
                              <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-2 sm:items-center">
                                  <div className="min-w-0 flex-1">
                                    <p
                                      className={`text-sm leading-snug ${
                                        expired
                                          ? 'font-medium text-muted-foreground/60 line-through decoration-muted-foreground/30'
                                          : !item.read
                                            ? 'font-semibold text-foreground'
                                            : 'font-medium text-muted-foreground'
                                      }`}
                                    >
                                      {item.title}
                                    </p>
                                  </div>
                                  <div className="flex shrink-0 items-center gap-1.5">
                                    {expired && (
                                      <span className="hidden rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground/60 sm:inline-block">
                                        Expirada
                                      </span>
                                    )}
                                    <span
                                      className={`whitespace-nowrap text-[11px] sm:text-xs ${
                                        expired
                                          ? 'text-muted-foreground/40'
                                          : !item.read
                                            ? 'font-medium text-primary'
                                            : 'text-muted-foreground'
                                      }`}
                                    >
                                      {getTimeAgo(item.createdAt)}
                                    </span>
                                    {!item.read && !expired && (
                                      <div className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                                    )}
                                  </div>
                                </div>

                                <p
                                  className={`mt-0.5 line-clamp-2 text-xs ${
                                    expired
                                      ? 'text-muted-foreground/40'
                                      : !item.read
                                        ? 'text-muted-foreground'
                                        : 'text-muted-foreground/70'
                                  }`}
                                >
                                  {item.message}
                                </p>

                                {hasLink && !expired && (
                                  <p className="mt-1.5 flex items-center gap-1 text-[11px] text-primary/70 transition-colors group-hover:text-primary">
                                    <ExternalLink className="h-3 w-3" />
                                    Ver pedido
                                    <ChevronRight className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
                                  </p>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <Pagination
              page={page}
              pageSize={PAGE_SIZE}
              totalCount={totalCount}
              onPageChange={handlePageChange}
            />
          </>
        )}
      </div>
    </DoctorLayout>
  );
}
