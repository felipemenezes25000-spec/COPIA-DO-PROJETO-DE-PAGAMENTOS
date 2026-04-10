# ⚠️ DEPRECATED — Supabase Fallback Migrations

**Status:** DEPRECATED / OBSOLETE — DO NOT RUN AGAINST PRODUCTION RDS.

This directory contains the original Supabase-era SQL migration fallbacks. They are kept only as a historical reference and must **not** be executed against the current PostgreSQL (RDS) production database managed by the `.NET` backend.

## Why deprecated

The canonical, production schema is now:

- **`infra/schema.sql`** — the single source of truth for the RDS PostgreSQL schema.
- **`infra/migrations/*.sql`** — timestamped, additive migrations applied on top of `infra/schema.sql`.

The files in this folder predate that split and target Supabase-specific assumptions that no longer hold.

## Known drifts vs the canonical schema

These drifts would **break production** if the files here were re-run:

| File | Drift | Correct location |
|---|---|---|
| `audit_logs.sql`, `run_all_migrations_complete.sql` | References `auth.users(id)` (Supabase schema `auth.users`, doesn't exist on RDS) | `infra/schema.sql` uses `public.users(id)` |
| `audit_logs.sql` | Column named `timestamp` | `infra/schema.sql` uses `event_timestamp` |
| `add_missing_tables.sql`, `run_all_migrations_complete.sql` | `product_prices` column is `description` | `infra/schema.sql` uses `name` |

## What to do instead

- **New schema changes:** add a new file under `infra/migrations/` with a timestamp prefix (e.g. `20260410_xxx.sql`) and run it via `infra/scripts/apply-schema.ps1` or the CI deploy pipeline.
- **Schema reference:** read `infra/schema.sql`.
- **Reading this folder:** only for historical context. Do not copy SQL from here into production migrations without cross-checking against `infra/schema.sql`.

## Can these files be deleted?

Yes — once no developer references them and the git history is sufficient as the historical record, the entire `backend-dotnet/docs/migrations/` folder can be removed. Until then, this README marks them as deprecated to prevent accidental execution.
