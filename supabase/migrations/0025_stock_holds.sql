-- Funnel-aware agent, Phase 1 (part 1/2): stock holds. Schema only in
-- this phase — the reserve_stock tool that actually creates holds ships
-- in a later phase; this just lays the table down so nothing has to be
-- retrofitted later. A separate table rather than a `reserved` column on
-- products (per the plan) — avoids rewriting the existing optimistic-
-- concurrency stock CAS in lib/db/products.ts's decrementStock, and each
-- hold naturally expires/releases as its own row instead of needing to
-- be un-done from a running total.
--
-- Correctness comes from computed-at-read filtering (sum only
-- status='active' AND expires_at > now() holds, subtracted from
-- products.stock wherever "available stock" is shown or checked) — no
-- cron/background job required. An optional cleanup sweep (flipping
-- expired 'active' rows to 'released') can be added later purely for
-- reporting tidiness.

create table public.stock_holds (
    id uuid primary key default gen_random_uuid(),
    tenant_id uuid not null references public.tenants(id) on delete cascade,
    product_id uuid not null references public.products(id) on delete cascade,
    qty int not null check (qty > 0),
    customer_id uuid references public.customers(id) on delete set null,
    conversation_id uuid references public.conversations(id) on delete set null,
    status text not null default 'active' check (status in ('active', 'released', 'consumed')),
    created_at timestamp with time zone not null default now(),
    expires_at timestamp with time zone not null
);

create index stock_holds_product_active_idx on public.stock_holds (product_id) where status = 'active';
create index stock_holds_tenant_id_idx on public.stock_holds (tenant_id);

alter table public.stock_holds enable row level security;
create policy stock_holds_select on public.stock_holds for select using (tenant_id in (select app_current_tenant_ids()));
create policy stock_holds_insert on public.stock_holds for insert with check (tenant_id in (select app_current_tenant_ids()));
create policy stock_holds_update on public.stock_holds for update using (tenant_id in (select app_current_tenant_ids())) with check (tenant_id in (select app_current_tenant_ids()));
