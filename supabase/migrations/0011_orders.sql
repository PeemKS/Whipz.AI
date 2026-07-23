-- Applied directly to the Whipz.AI Supabase project via the Supabase
-- MCP `apply_migration` tool. Saved here for repo history.
--
-- The existing schema had no order/transaction table at all, but the
-- commerce agent's create_order tool needs one to record purchases.

create type order_status as enum ('pending', 'paid', 'cancelled');

create table public.orders (
    id uuid primary key default gen_random_uuid(),
    tenant_id uuid not null references public.tenants(id) on delete cascade,
    customer_id uuid not null references public.customers(id) on delete cascade,
    items jsonb not null,
    total_amount numeric not null,
    status order_status not null default 'pending',
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now()
);

create index orders_tenant_id_idx on public.orders (tenant_id);
create index orders_customer_id_idx on public.orders (customer_id);

alter table public.orders enable row level security;

create policy orders_select on public.orders
    for select using (tenant_id in (select app_current_tenant_ids()));

create policy orders_insert on public.orders
    for insert with check (tenant_id in (select app_current_tenant_ids()));

create policy orders_update on public.orders
    for update using (tenant_id in (select app_current_tenant_ids()))
    with check (tenant_id in (select app_current_tenant_ids()));

create policy orders_delete on public.orders
    for delete using (tenant_id in (select app_current_tenant_ids()));
