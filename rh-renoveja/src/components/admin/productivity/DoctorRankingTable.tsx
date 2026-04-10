import { memo } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import type { DoctorProductivityRow } from '../../../types/productivity';
import {
  formatCents,
  formatInt,
  formatMinutes,
  formatPercent,
  formatRelative,
} from '../../../lib/productivity-utils';

interface DoctorRankingTableProps {
  rows: DoctorProductivityRow[];
  loading?: boolean;
}

function DoctorRankingTableInner({ rows, loading }: DoctorRankingTableProps) {
  if (!loading && rows.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-slate-200 text-sm text-slate-500">
        Nenhum médico com atividade no período selecionado.
      </div>
    );
  }

  return (
    <div
      className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm"
      style={{ contentVisibility: 'auto' }}
    >
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          <tr>
            <th className="px-4 py-2 text-left">Médico</th>
            <th className="px-3 py-2 text-right">Pedidos</th>
            <th className="px-3 py-2 text-right">Assinados</th>
            <th className="px-3 py-2 text-right">Em lote</th>
            <th className="px-3 py-2 text-right">p50</th>
            <th className="px-3 py-2 text-right">p95</th>
            <th className="px-3 py-2 text-right">Receita</th>
            <th className="px-3 py-2 text-right">Ociosidade</th>
            <th className="px-3 py-2 text-right">Utilização</th>
            <th className="px-3 py-2 text-right">Última atividade</th>
            <th className="px-2 py-2" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-sm">
          {rows.map((r) => (
            <tr key={r.doctorProfileId} className="group hover:bg-slate-50">
              <td className="px-4 py-2">
                <div className="flex flex-col">
                  <span className="font-medium text-slate-900">{r.name}</span>
                  <span className="text-xs text-slate-500">{r.specialty}</span>
                </div>
              </td>
              <td className="px-3 py-2 text-right tabular-nums text-slate-700">
                {formatInt(r.requestsHandled)}
              </td>
              <td className="px-3 py-2 text-right tabular-nums text-slate-700">
                {formatInt(r.signed)}
              </td>
              <td className="px-3 py-2 text-right tabular-nums text-slate-700">
                {formatInt(r.batchSigned)}
                <div className="text-[10px] text-slate-400">{formatPercent(r.batchSignRate, 0)}</div>
              </td>
              <td className="px-3 py-2 text-right tabular-nums text-slate-700">
                {formatMinutes(r.p50MinutesToSign)}
              </td>
              <td className="px-3 py-2 text-right tabular-nums text-slate-700">
                {formatMinutes(r.p95MinutesToSign)}
              </td>
              <td className="px-3 py-2 text-right tabular-nums font-semibold text-emerald-700">
                {formatCents(r.revenueCents)}
              </td>
              <td className="px-3 py-2 text-right tabular-nums text-red-600">
                {r.idleCostCents > 0 ? formatCents(r.idleCostCents) : '—'}
              </td>
              <td className="px-3 py-2 text-right tabular-nums text-slate-700">
                {r.utilizationRate !== null ? formatPercent(r.utilizationRate, 0) : '—'}
              </td>
              <td className="px-3 py-2 text-right text-xs text-slate-500">
                {r.lastActivityAt ? formatRelative(r.lastActivityAt) : '—'}
              </td>
              <td className="px-2 py-2 text-slate-400">
                <Link
                  to={`/admin/produtividade/${r.doctorProfileId}`}
                  className="inline-flex items-center justify-center rounded-md p-1 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
                  aria-label={`Ver detalhes de ${r.name}`}
                >
                  <ChevronRight size={16} />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {loading ? (
        <div className="border-t border-slate-200 px-4 py-2 text-center text-xs text-slate-400">
          Atualizando…
        </div>
      ) : null}
    </div>
  );
}

export default memo(DoctorRankingTableInner);
