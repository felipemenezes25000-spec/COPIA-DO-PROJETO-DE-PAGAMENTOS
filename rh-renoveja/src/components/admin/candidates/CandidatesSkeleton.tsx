/**
 * Row-shaped skeleton that mirrors the real candidates table layout
 * (avatar block, name + email stack, category, specialty, score pill,
 * status badge, date, action link). Matches the column visibility
 * breakpoints of the real table so the loading state doesn't jump.
 */
export default function CandidatesSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div
      className="divide-y divide-slate-50"
      role="status"
      aria-live="polite"
      aria-label="Carregando candidatos"
    >
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 px-6 py-3.5 animate-pulse"
        >
          {/* Candidato — avatar + nome/email */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-9 h-9 rounded-full bg-slate-200 shrink-0" />
            <div className="flex-1 min-w-0 space-y-1.5">
              <div className="h-3 w-40 max-w-full bg-slate-200 rounded" />
              <div className="h-2.5 w-56 max-w-full bg-slate-100 rounded" />
            </div>
          </div>

          {/* Categoria */}
          <div className="hidden md:block w-24 h-3 bg-slate-100 rounded" />

          {/* Especialidade */}
          <div className="hidden lg:block w-32 h-3 bg-slate-100 rounded" />

          {/* Local */}
          <div className="hidden xl:block w-20 h-3 bg-slate-100 rounded" />

          {/* Score IA — mimic the score pill */}
          <div className="hidden md:flex items-center gap-2.5 w-28">
            <div className="w-10 h-10 rounded-lg bg-slate-200" />
            <div className="flex flex-col gap-1 flex-1 min-w-0">
              <div className="h-2.5 w-16 bg-slate-200 rounded" />
              <div className="h-1 w-16 bg-slate-100 rounded-full" />
            </div>
          </div>

          {/* Status badge */}
          <div className="h-6 w-20 rounded-full bg-slate-200" />

          {/* Date */}
          <div className="hidden sm:block w-16 h-3 bg-slate-100 rounded" />

          {/* Action link */}
          <div className="w-14 h-3 bg-slate-200 rounded" />
        </div>
      ))}
      <span className="sr-only">Carregando lista de candidatos...</span>
    </div>
  );
}
