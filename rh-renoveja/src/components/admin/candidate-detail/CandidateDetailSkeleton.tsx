/**
 * Skeleton that mirrors the new 2-column candidate detail layout:
 *   - sticky header (breadcrumb, name + identity line, status pills)
 *   - left sidebar (identity card, contact, AI summary, decision panel, timeline)
 *   - right content (tabs + tab content)
 *
 * Below the `lg:` breakpoint, both columns collapse to a single stack,
 * matching the real layout so the skeleton doesn't shift on hydration.
 */
export default function CandidateDetailSkeleton() {
  return (
    <div className="animate-pulse" aria-busy="true" aria-live="polite">
      {/* Sticky header skeleton */}
      <div className="sticky top-0 z-10 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 bg-white/85 backdrop-blur border-b border-slate-200">
        <div className="max-w-[1440px] mx-auto py-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="h-3 w-24 bg-slate-200 rounded" />
            <div className="h-8 w-24 bg-slate-200 rounded-xl" />
          </div>
          <div className="flex items-start gap-3">
            <div className="flex-1 space-y-2">
              <div className="h-6 w-64 bg-slate-200 rounded" />
              <div className="h-3 w-80 bg-slate-100 rounded" />
            </div>
            <div className="h-5 w-20 bg-slate-200 rounded-full" />
          </div>
          <div className="flex gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-7 w-24 bg-slate-200 rounded-lg" />
            ))}
          </div>
        </div>
      </div>

      {/* Content grid skeleton */}
      <div className="max-w-[1440px] mx-auto pt-6 grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
        {/* Left sidebar */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
            <div className="flex flex-col items-center gap-2">
              <div className="w-[88px] h-[88px] rounded-full bg-slate-200" />
              <div className="h-5 w-40 bg-slate-200 rounded" />
              <div className="h-3 w-32 bg-slate-100 rounded" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-12 bg-slate-100 rounded-lg" />
              ))}
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
            <div className="h-3 w-32 bg-slate-200 rounded" />
            <div className="space-y-2">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="h-12 bg-slate-100 rounded-xl" />
              ))}
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
            <div className="h-3 w-28 bg-slate-200 rounded" />
            <div className="grid grid-cols-2 gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-9 bg-slate-100 rounded-xl" />
              ))}
            </div>
          </div>
        </div>

        {/* Right content */}
        <div className="space-y-5">
          <div className="flex gap-2 border-b border-slate-200">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="h-10 w-28 bg-slate-200 rounded-t" />
            ))}
          </div>
          <div className="h-40 bg-slate-100 border border-slate-200 rounded-2xl" />
          <div className="h-48 bg-slate-100 border border-slate-200 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
