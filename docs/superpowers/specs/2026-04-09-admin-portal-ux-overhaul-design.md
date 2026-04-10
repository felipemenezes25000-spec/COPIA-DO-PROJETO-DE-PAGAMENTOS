# Admin Portal UX Overhaul — Design Spec

**Date:** 2026-04-09
**Project:** `rh-renoveja` (Vite + React 18 + Tailwind + Framer Motion)
**Scope:** `/admin` (Dashboard), `/admin/candidatos` (List), `/admin/candidatos/:id` (Detail)
**Mode:** Autonomous (user explicitly authorized: "vá trabalhando enquanto isso ao final ... commit e push")

## Goal

Elevate the three admin pages of the candidate portal to a "fodástico" level:
more beautiful, organized, with clearer and more complete information, fully
aligned with the existing design system tokens (sky/teal/slate, Poppins/Inter,
`card`/`btn-primary`/`input-field` classes, Framer Motion animations).

## Non-Goals

- Touching any other page (public marketing, cadastro, login, productivity,
  pricing, reports, live queue).
- Backend changes (no new API endpoints — work within `lib/admin-api.ts`).
- Adding new dependencies. The existing stack is enough.
- Breaking accessibility (preserve every `aria-*`, `role`, keyboard nav).

## Diagnostic of the Current State

### `/admin` — Dashboard

The current page is functional but lacks:
- An "attention router" highlighting candidates that require action now.
- Trend context on KPIs (no delta vs previous week, no sparklines).
- A recruitment funnel visualization of the candidate pipeline.
- A richer header (no date range, no quick actions).

### `/admin/candidatos` — List

- Table is flat: no avatars, no aging indicators, no priority signals.
- No quick-filter chips for common workflows (stuck candidates, high scores).
- No bulk actions beyond the AI batch panel.
- Underused header — no breadcrumb, no at-a-glance funnel.

### `/admin/candidatos/:id` — Detail

- `max-w-5xl` wastes half the viewport on desktops ≥1280 px.
- Header is flat: no big avatar, no identity summary at a glance.
- 7 horizontal tabs on top of a narrow content column feels cramped.
- `TabVisaoGeral` repeats info that should live in the header.
- No "decision helper", no prev/next navigation, no activity timeline.

## Design Direction

- **Keep every existing design token** (sky-500 primary, teal secondary,
  slate neutrals, Poppins/Inter). The goal is to *use them more confidently*
  — stronger gradients, bigger numbers, more whitespace hierarchy — not to
  reinvent the palette.
- **Respect established components** (`StatusBadge`, `AIScoreCell`, `DonutChart`,
  `BarChart`, `HorizontalBar`, `ProgressRing`, the `card`/`btn-primary` CSS
  classes). New components compose these rather than replacing them.
- **Prefer enrichment over replacement.** Existing wiring (data fetching,
  filters, batch AI, status updates, notes, documents) stays intact. The
  overhaul is in *presentation and layout*.
- **Information density with clarity**: add sparklines, aging dots, funnel
  bars, trend deltas — without turning the UI into a dashboard wall of noise.

## Architecture Overview

### New shared primitives (`src/components/admin/shared/`)

1. **`Avatar.tsx`** — Round avatar rendered from initials. Deterministic color
   from a hash of the name so the same person always gets the same hue.
2. **`Sparkline.tsx`** — Tiny SVG trendline used inside KPIs. Accepts
   `number[]` + color, renders a smooth polyline + gradient fill.
3. **`Delta.tsx`** — Small up/down arrow + percent used on KPI cards when
   a previous-period value exists.

### Dashboard (`src/pages/admin/AdminDashboardPage.tsx`)

**New layout order:**
1. **`DashboardHeader`** — welcome line, date range pill, refresh button.
2. **`AttentionStrip`** — 1-2 contextual cards ("N candidatos aguardando
   triagem há mais de 3 dias" with jump CTA; "N candidatos com score IA ≥ 80
   aguardando decisão"). Only renders cards that are non-zero.
3. **KPI row** — enhanced `KPICard` with sparkline + delta vs prior week.
4. **`FunnelChart`** (new) — horizontal funnel of Pendente → Em análise →
   Entrevista → Aprovado, each segment proportional to the count and
   clickable, deep-linking to `/admin/candidatos?status=...`.
5. **Key indicators** — taxaAprovação/Rejeição rings (unchanged layout, but
   moved to be next to the funnel so ratios and absolute numbers sit together).
6. **Charts row** — Cadastros por semana + Top estados + Top especialidades
   (unchanged, but uses the new card surface for consistency).
7. **AI insights** — unchanged (`AIInsightsSection` already works well).
8. **`RecentCandidatesTable`** — reskinned to use avatars + aging.

**New files:**
- `components/admin/dashboard/DashboardHeader.tsx`
- `components/admin/dashboard/AttentionStrip.tsx`
- `components/admin/dashboard/FunnelChart.tsx`

**Modified files:**
- `pages/admin/AdminDashboardPage.tsx`
- `components/admin/dashboard/KPICard.tsx` (sparkline + delta support)
- `components/admin/dashboard/RecentCandidatesTable.tsx` (avatars + aging)
- `components/admin/dashboard/DashboardSkeleton.tsx` (matches new layout)

### Candidates List (`src/pages/admin/AdminCandidatesPage.tsx`)

**New layout order:**
1. **Header** with breadcrumb → "Candidatos" + count + batch AI panel.
2. **`CandidatePipelineBar`** — compact funnel strip showing each status with
   count + % of total, clickable to filter the list.
3. **`QuickFilterChips`** — 3-4 common presets: "Pendentes há +3 dias",
   "Score IA ≥ 80", "Sem análise", "Recentes (7d)".
4. **Filter bar** — unchanged (search + advanced filter panel).
5. **`BulkActionsBar`** — slides in when ≥1 candidate is selected; supports
   "Mover para Em análise", "Mover para Entrevista", "Rejeitar".
6. **Enhanced table** — adds:
   - Checkbox column for selection.
   - Avatar inline with the name.
   - Aging dot (red if pendente > 3 days, amber if > 1 day).
   - Status as a left-border color accent instead of just a pill.

**New files:**
- `components/admin/candidates/CandidatePipelineBar.tsx`
- `components/admin/candidates/QuickFilterChips.tsx`
- `components/admin/candidates/BulkActionsBar.tsx`

**Modified files:**
- `pages/admin/AdminCandidatesPage.tsx` (bulk selection state, quick filters)
- `components/admin/candidates/CandidatesTable.tsx` (avatar + aging + selection)
- `lib/admin-api.ts` — add `bulkUpdateCandidateStatus(ids, status, token)`
  helper that loops `updateCandidateStatus` (no new endpoint, just a convenience
  wrapper exposing progress).

### Candidate Detail (`src/pages/admin/AdminCandidateDetailPage.tsx`)

**New layout — 2-column on `lg:` and up:**

```
┌──────────────────────────────────────────────────────────────┐
│  CandidateHeader (sticky, breadcrumb + prev/next + status)  │
├─────────────────────────┬────────────────────────────────────┤
│                         │                                    │
│  CandidateIdentity      │  CandidateTabs                     │
│  Sidebar (left, 320px)  │  (full width of right col)         │
│                         │                                    │
│  - Big avatar           │  TabVisaoGeral / Pessoal /         │
│  - Nome + categoria     │  Profissional / Acadêmico / IA /   │
│  - Identity chips       │  Notas / Documentos                │
│  - Quick actions        │                                    │
│  - Score IA summary     │                                    │
│  - DecisionPanel        │                                    │
│  - Activity timeline    │                                    │
│                         │                                    │
└─────────────────────────┴────────────────────────────────────┘
```

On `md:` and below, it collapses to single-column: sidebar first, then tabs.

**New files:**
- `components/admin/candidate-detail/CandidateIdentitySidebar.tsx`
- `components/admin/candidate-detail/DecisionPanel.tsx`
- `components/admin/candidate-detail/CandidateNavigation.tsx`
- `components/admin/candidate-detail/ActivityTimeline.tsx`

**Modified files:**
- `pages/admin/AdminCandidateDetailPage.tsx` (2-col layout + prev/next state)
- `components/admin/candidate-detail/CandidateHeader.tsx` (richer sticky header)
- `components/admin/candidate-detail/CandidateTabs.tsx` (notes badge)
- `components/admin/candidate-detail/TabVisaoGeral.tsx` (remove KPI duplication)
- `components/admin/candidate-detail/CandidateDetailSkeleton.tsx` (2-col skeleton)

**Prev/next logic:** when the user comes from the list, we pass the visible
order via a small in-memory cache in `lib/admin-api.ts` (`setCandidateOrder`
/ `getCandidateNeighbors(id)`). On the detail page we look it up; if empty
(deep link), we hide the prev/next arrows. Zero backend changes.

## Data & State

- **No new endpoints.** All enrichments come from existing `AdminCandidate`
  fields (`createdAt`, `updatedAt`, `aiAnalysis`, `notas`, `status`).
- **Aging calculation** — derived client-side from `createdAt` vs `Date.now()`.
- **KPI trends** — derived client-side by bucketing `candidates` into "this
  week" and "last week" and computing the delta. The existing dashboard
  already fetches the full list once, so no extra network calls.
- **Activity timeline** — built from `createdAt`, `updatedAt`, `notas` and
  `aiAnalysis.analyzedAt`. Everything is already in the payload.

## Accessibility

- All existing `role`, `aria-*`, `aria-live` attributes are preserved.
- New components follow the same patterns: buttons have labels, regions
  have names, status changes announce via live regions.
- Keyboard navigation on the new Prev/Next buttons uses ArrowLeft/ArrowRight.
- Color contrast: the funnel colors reuse existing semantic tokens
  (amber/sky/purple/emerald/red) so contrast stays ≥4.5:1.

## Risks & Mitigations

- **Layout width shift** on detail page — mitigate by keeping the single-col
  fallback identical on `md:` and below.
- **Prev/next stale cache** — if the user filters the list after navigating,
  the cache still points to the prior set. Acceptable: the cache lives in
  memory for the current tab and is reset by any filter change in the list
  page (we write to the cache in `useEffect` on `visible`).
- **Bulk status updates failing mid-batch** — use the same progress pattern
  as `BatchAIPanel` (success/fail counts, toast at end, no silent errors).

## Out of Scope (explicitly)

- Dark mode.
- i18n (all strings stay in pt-BR, same as the rest of the portal).
- Server-side pagination (current PAGE_SIZE=10 client-side is kept).
- Replacing charts with a library like Recharts/Visx.

## Success Criteria

1. `tsc -b && vite build` passes clean.
2. `eslint src/` passes clean.
3. Visual density and hierarchy improved on all three pages (qualitative).
4. All existing interactions still work (status updates, filters, batch AI,
   notes, documents, pagination, tab navigation).
5. No regression on `aria-*` attributes or keyboard navigation.
