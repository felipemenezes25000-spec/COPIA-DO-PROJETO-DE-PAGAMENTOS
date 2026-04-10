import { memo } from 'react';
import { Users, Clock, CalendarCheck, CheckCircle, XCircle, Stethoscope, Brain, Apple, SmilePlus, HeartPulse } from 'lucide-react';
import type { AdminStats } from '../../types/admin';

interface StatsCardsProps {
  stats: AdminStats;
  loading?: boolean;
}

function StatsCards({ stats, loading }: StatsCardsProps) {
  const statusCards = [
    { label: 'Total', value: stats.total, icon: Users, color: 'text-slate-600', bg: 'bg-slate-100' },
    { label: 'Pendentes', value: stats.pendentes, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Em análise', value: stats.emAnalise, icon: CalendarCheck, color: 'text-sky-600', bg: 'bg-sky-50' },
    { label: 'Aprovados', value: stats.aprovados, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Rejeitados', value: stats.rejeitados, icon: XCircle, color: 'text-red-600', bg: 'bg-red-50' },
  ];

  const categoryCards = [
    { label: 'Médicos', value: stats.porCategoria.medico, icon: Stethoscope, color: 'text-primary-600', bg: 'bg-primary-50' },
    { label: 'Enfermeiros', value: stats.porCategoria.enfermeiro, icon: HeartPulse, color: 'text-rose-600', bg: 'bg-rose-50' },
    { label: 'Dentistas', value: stats.porCategoria.dentista, icon: SmilePlus, color: 'text-cyan-600', bg: 'bg-cyan-50' },
    { label: 'Psicólogos', value: stats.porCategoria.psicologo, icon: Brain, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Nutricionistas', value: stats.porCategoria.nutricionista, icon: Apple, color: 'text-teal-600', bg: 'bg-teal-50' },
  ];

  if (loading) {
    return (
      <div
        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4"
        role="status"
        aria-label="Carregando estatísticas"
      >
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 animate-pulse">
            <div className="h-4 bg-slate-200 rounded w-16 mb-3" />
            <div className="h-8 bg-slate-200 rounded w-12" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status cards */}
      <section aria-label="Visão geral de candidatos por status">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {statusCards.map(({ label, value, icon: Icon, color, bg }) => (
            <div
              key={label}
              className="bg-white rounded-xl border border-slate-200 p-4 transition-shadow hover:shadow-sm"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${bg}`} aria-hidden="true">
                  <Icon size={16} className={color} />
                </div>
                <span className="text-xs font-medium text-slate-500">{label}</span>
              </div>
              <p className={`text-2xl font-bold tabular-nums ${color}`} aria-label={`${label}: ${value}`}>
                {value}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Category cards */}
      <section aria-label="Candidatos por categoria profissional">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {categoryCards.map(({ label, value, icon: Icon, color, bg }) => (
            <div
              key={label}
              className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4 transition-shadow hover:shadow-sm"
            >
              <div className={`flex items-center justify-center w-12 h-12 rounded-xl ${bg}`} aria-hidden="true">
                <Icon size={22} className={color} />
              </div>
              <div>
                <p className="text-sm text-slate-500">{label}</p>
                <p className={`text-xl font-bold tabular-nums ${color}`}>{value}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default memo(StatsCards);
