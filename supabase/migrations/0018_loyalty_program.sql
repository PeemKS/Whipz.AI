-- Applied directly via Supabase MCP `apply_migration`. Saved here for
-- repo history. Membership tiers (auto-assigned by lifetime spend),
-- an append-only loyalty points ledger, and a redeemable rewards
-- catalog. customers.loyalty_points/total_spent are cached running
-- totals kept in sync with the ledger by lib/loyalty/engine.ts, not
-- derived by summing on every read.

create table public.membership_tiers (
    id uuid primary key default gen_random_uuid(),
    tenant_id uuid not null references public.tenants(id) on delete cascade,
    name text not null,
    min_spend numeric not null default 0,
    point_multiplier numeric not null default 1,
    perks text,
    sort_order int not null default 0,
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now()
);

create index membership_tiers_tenant_id_idx on public.membership_tiers (tenant_id);
alter table public.membership_tiers enable row level security;
create policy membership_tiers_select on public.membership_tiers for select using (tenant_id in (select app_current_tenant_ids()));
create policy membership_tiers_insert on public.membership_tiers for insert with check (tenant_id in (select app_current_tenant_ids()));
create policy membership_tiers_update on public.membership_tiers for update using (tenant_id in (select app_current_tenant_ids())) with check (tenant_id in (select app_current_tenant_ids()));
create policy membership_tiers_delete on public.membership_tiers for delete using (tenant_id in (select app_current_tenant_ids()));

create table public.rewards (
    id uuid primary key default gen_random_uuid(),
    tenant_id uuid not null references public.tenants(id) on delete cascade,
    name text not null,
    description text,
    points_cost int not null,
    is_active boolean not null default true,
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now()
);

create index rewards_tenant_id_idx on public.rewards (tenant_id);
alter table public.rewards enable row level security;
create policy rewards_select on public.rewards for select using (tenant_id in (select app_current_tenant_ids()));
create policy rewards_insert on public.rewards for insert with check (tenant_id in (select app_current_tenant_ids()));
create policy rewards_update on public.rewards for update using (tenant_id in (select app_current_tenant_ids())) with check (tenant_id in (select app_current_tenant_ids()));
create policy rewards_delete on public.rewards for delete using (tenant_id in (select app_current_tenant_ids()));

create table public.loyalty_transactions (
    id uuid primary key default gen_random_uuid(),
    tenant_id uuid not null references public.tenants(id) on delete cascade,
    customer_id uuid not null references public.customers(id) on delete cascade,
    type text not null check (type in ('earn', 'redeem', 'adjust')),
    points int not null,
    reason text not null,
    order_id uuid references public.orders(id) on delete set null,
    reward_id uuid references public.rewards(id) on delete set null,
    created_at timestamp with time zone not null default now()
);

create index loyalty_transactions_customer_id_idx on public.loyalty_transactions (customer_id, created_at);
alter table public.loyalty_transactions enable row level security;
create policy loyalty_transactions_select on public.loyalty_transactions for select using (tenant_id in (select app_current_tenant_ids()));
create policy loyalty_transactions_insert on public.loyalty_transactions for insert with check (tenant_id in (select app_current_tenant_ids()));

alter table public.customers
    add column if not exists membership_tier_id uuid references public.membership_tiers(id) on delete set null,
    add column if not exists loyalty_points int not null default 0,
    add column if not exists total_spent numeric not null default 0;
