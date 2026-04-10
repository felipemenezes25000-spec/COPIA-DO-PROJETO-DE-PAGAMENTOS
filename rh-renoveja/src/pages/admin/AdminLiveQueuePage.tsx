import { useCallback, useMemo, useState, useEffect } from 'react';
import { AlertCircle, Clock, Radio, Users, Zap } from 'lucide-react';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import { usePoll } from '../../hooks/useAdaptivePolling';
import { fetchLiveQueue } from '../../lib/productivity-api';
import {
  formatInt,
  formatRelative,
  priorityLabel,
  requestTypeLabel,
  statusLabel,
} from '../../lib/productivity-utils';
import type { QueueItem } from '../../types/productivity';
import KpiGrid, { type KpiItem } from '../../components/admin/productivity/KpiGrid';

/**
 * Fila ao vivo — polling rápido (10s visível, 60s idle, pausa em background).
 * Mostra pedidos pendentes, urgentes, SLA violado e médicos online agora.
 */
export default function AdminLiveQueuePage() {
  const { user } = useAdminAuth();
  const token = user?.token;

  const liveQuery = usePoll(
    useCallback((signal) => fetchLiveQueue(token, signal), [token]),
    { activeInterval: 10_000, idleInterval: 60_000, deps: [token] },
  );

  // Relógio interno pra recalcular "há 3min" sem precisar de novo fetch.
  const [now, setNow] = useState<number>(Date.now());
  useEffect(() => {
    const tick = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(tick);
  }, []);

  const data = liveQuery.data;

  const kpiItems: KpiItem[] = useMemo(() => {
    if (!data) {
      return [
        { label: 'Pedidos pendentes', value: '—', icon: Clock },
        { label: 'Sem médico', value: '—', icon: Users },
        { label: 'Urgentes', value: '—', icon: AlertCircle, tone: 'danger' },
        { label: 'SLA violado', value: '—', icon: Radio, tone: 'warning' },
        { label: 'Médicos online', value: '—', icon: Zap, tone: 'success' },
      ];
    }
    return [
      {
        label: 'Pedidos pendentes',
        value: formatInt(data.totalPending),
        icon: Clock,
      },
      {
        label: 'Sem médico',
        value: formatInt(data.unassignedCount),
        icon: Users,
        tone: data.unassignedCount > 5 ? 'warning' : 'default',
      },
      {
        label: 'Urgentes',
        value: formatInt(data.urgentCount),
        icon: AlertCircle,
        tone: data.urgentCount > 0 ? 'danger' : 'default',
      },
      {
        label: 'SLA violado',
        value: formatInt(data.breachingSlaCount),
        sublabel: 'Além do tempo target',
        icon: Radio,
        tone: data.breachingSlaCount > 0 ? 'warning' : 'default',
      },
      {
        label: 'Médicos online',
        value: formatInt(data.online.length),
        sublabel: 'ações nos últimos 5 min',
        icon: Zap,
        tone: 'success',
      },
    ];
  }, [data]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative flex h-3 w-3 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Fila ao vivo</h1>
            <p className="text-sm text-slate-500">
              Atualiza a cada 10s · última leitura {liveQuery.lastUpdated ? formatRelative(liveQuery.lastUpdated, now) : '—'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={liveQuery.refresh}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
        >
          Atualizar agora
        </button>
      </header>

      {liveQuery.error ? (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Erro ao buscar fila ao vivo. Tentando novamente…
        </div>
      ) : null}

      <section>
        <KpiGrid items={kpiItems} />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <QueueList
          title="Urgentes"
          subtitle="Prioridade máxima — atender em até 10 min"
          items={data?.urgent ?? []}
          tone="danger"
          emptyMessage="Nenhum pedido urgente agora 🎉"
          now={now}
        />

        <QueueList
          title="Mais antigos sem médico"
          subtitle="Aguardando alguém assumir"
          items={data?.oldestUnassigned ?? []}
          tone="warning"
          emptyMessage="Todos atribuídos"
          now={now}
        />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <Zap size={16} className="text-emerald-600" />
          <h2 className="text-sm font-semibold text-slate-900">Médicos online agora</h2>
        </div>
        {data && data.online.length > 0 ? (
          <ul className="divide-y divide-slate-100 text-sm">
            {data.online.map((d) => (
              <li
                key={d.doctorProfileId}
                className="flex items-center justify-between gap-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-900 truncate">{d.name}</p>
                  <p className="text-xs text-slate-500">{d.specialty}</p>
                </div>
                <div className="text-right text-xs text-slate-500">
                  <p className="tabular-nums">{formatRelative(d.lastActivityAt, now)}</p>
                  <p>
                    {d.actionsLast5Min} ação{d.actionsLast5Min === 1 ? '' : 'ões'} · {d.lastAction}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">Nenhum médico com atividade nos últimos 5 minutos.</p>
        )}
      </section>
    </div>
  );
}

interface QueueListProps {
  title: string;
  subtitle: string;
  items: QueueItem[];
  tone: 'danger' | 'warning';
  emptyMessage: string;
  now: number;
}

function QueueList({ title, subtitle, items, tone, emptyMessage, now }: QueueListProps) {
  const headerTone =
    tone === 'danger' ? 'border-l-red-500' : 'border-l-amber-500';

  return (
    <div className={`rounded-xl border border-slate-200 border-l-4 bg-white p-4 shadow-sm ${headerTone}`}>
      <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
      <p className="text-xs text-slate-500">{subtitle}</p>

      {items.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">{emptyMessage}</p>
      ) : (
        <ul className="mt-3 divide-y divide-slate-100 text-sm">
          {items.map((item) => {
            const p = priorityLabel(item.priority);
            return (
              <li key={item.id} className="flex items-start justify-between gap-3 py-2">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-slate-400">{item.shortCode || '—'}</span>
                    <span className="font-medium text-slate-900">{requestTypeLabel(item.requestType)}</span>
                    <span className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase ${p.color}`}>
                      {p.label}
                    </span>
                    {item.slaBreached ? (
                      <span className="rounded-md bg-red-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-red-700">
                        SLA
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {statusLabel(item.status)}
                    {item.requiredSpecialty ? ` · ${item.requiredSpecialty}` : ''}
                    {item.doctorName ? ` · Dr(a). ${item.doctorName}` : ' · Aguardando médico'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold tabular-nums text-slate-900">
                    {item.minutesWaiting}min
                  </p>
                  <p className="text-[10px] text-slate-400">{formatRelative(item.createdAt, now)}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
