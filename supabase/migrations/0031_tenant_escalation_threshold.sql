-- Funnel-aware agent, Phase 4: per-tenant V3_THRESHOLD (the blueprint's
-- own example used ฿5,000 as a bare constant — made tenant-configurable
-- here since business size/currency varies too much for one hardcoded
-- number across a multi-tenant app). Used by lib/agents/escalation.ts's
-- "high-value cart" check.

alter table public.tenants
    add column if not exists v3_threshold_amount numeric not null default 5000;
