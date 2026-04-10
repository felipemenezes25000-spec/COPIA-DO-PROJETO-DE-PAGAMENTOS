/**
 * Layout-accurate skeleton for the admin dashboard. Reproduces the actual
 * grid positions (header, attention strip, KPI row, funnel, charts row,
 * AI row, recent list) so the loading state doesn't flash into a radically
 * different layout on hydration.
 */
export default function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Carregando dashboard">
      {/* Rich header */}
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-primary-50 via-white to-teal-50/40 px-6 py-5 md:px-8 md:py-7">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
          <div className="space-y-2">
            <div className="h-3 w-28 rounded bg-slate-200/80 animate-pulse" />
            <div className="h-8 w-56 rounded-md bg-slate-200 animate-pulse" />
            <div className="h-3 w-72 rounded bg-slate-200/70 animate-pulse" />
          </div>
          <div className="flex gap-2">
            <div className="h-10 w-24 rounded-xl bg-slate-200/70 animate-pulse" />
            <div className="h-10 w-24 rounded-xl bg-slate-200/70 animate-pulse" />
            <div className="h-10 w-28 rounded-xl bg-slate-200 animate-pulse" />
          </div>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-200 animate-pulse" />
              <div className="h-4 w-20 rounded bg-slate-200 animate-pulse" />
            </div>
            <div className="h-9 w-16 rounded bg-slate-200 animate-pulse" />
            <div className="h-3 w-24 rounded bg-slate-100 animate-pulse" />
          </div>
        ))}
      </div>

      {/* Funnel + Indicators */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <div className="h-5 w-48 rounded bg-slate-200 animate-pulse" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-28 rounded-xl bg-slate-100 border border-slate-200 animate-pulse"
              />
            ))}
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <div className="h-5 w-40 rounded bg-slate-200 animate-pulse" />
          <div className="flex items-center justify-around gap-4">
            <div className="w-20 h-20 rounded-full bg-slate-100 animate-pulse" />
            <div className="w-20 h-20 rounded-full bg-slate-100 animate-pulse" />
          </div>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4"
          >
            <div className="h-5 w-48 rounded bg-slate-200 animate-pulse" />
            <div className="h-36 rounded bg-slate-100 animate-pulse" />
          </div>
        ))}
      </div>

      {/* Recent candidates */}
      <div className="bg-white rounded-2xl border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-100">
          <div className="h-5 w-40 rounded bg-slate-200 animate-pulse" />
        </div>
        <div className="p-6 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-200 animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-40 rounded bg-slate-200 animate-pulse" />
                <div className="h-2.5 w-56 rounded bg-slate-100 animate-pulse" />
              </div>
              <div className="h-6 w-20 rounded-full bg-slate-200 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
