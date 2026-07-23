-- Funnel-aware agent, Phase 6: an optional monthly token budget per
-- tenant. No billing/plan system exists in this app (deferred per
-- earlier decision) — this is a simple opt-in cap, not tied to a plan
-- tier. Null means unlimited (the default — existing tenants shouldn't
-- suddenly stop working).

alter table public.tenants
    add column if not exists monthly_token_budget bigint;
