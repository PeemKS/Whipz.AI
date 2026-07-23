-- Funnel-aware agent, Phase 2: lead scoring + a cached last-order
-- timestamp customers.total_spent/loyalty_points already exists as a
-- cached-field-plus-ledger pair (0018); lead_score follows the same
-- shape. last_order_at backs the lifecycle-stage/repurchase-cycle math
-- in lib/lifecycle/ — cached here rather than re-querying orders on
-- every read, same rationale as the loyalty totals.

alter table public.customers
    add column if not exists lead_score smallint not null default 0,
    add column if not exists last_order_at timestamp with time zone;

create table public.lead_score_events (
    id uuid primary key default gen_random_uuid(),
    tenant_id uuid not null references public.tenants(id) on delete cascade,
    customer_id uuid not null references public.customers(id) on delete cascade,
    conversation_id uuid references public.conversations(id) on delete set null,
    delta smallint not null,
    reason text not null,
    created_at timestamp with time zone not null default now()
);

create index lead_score_events_customer_id_idx on public.lead_score_events (customer_id, created_at);

alter table public.lead_score_events enable row level security;
create policy lead_score_events_select on public.lead_score_events for select using (tenant_id in (select app_current_tenant_ids()));
create policy lead_score_events_insert on public.lead_score_events for insert with check (tenant_id in (select app_current_tenant_ids()));
