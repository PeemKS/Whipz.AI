-- Funnel-aware agent, Phase 3: the actual discount allowlist. Today's
-- `promotions` table (0007-era) is informational only — status/date
-- driven, nothing computes a discounted price. promo_terms is what the
-- apply_promo tool validates against and create_order applies — the
-- model can only pick a row that exists here, never invent a discount.
--
-- promo_redemptions is an append-only usage ledger (mirrors
-- loyalty_transactions' shape) so max_uses_per_customer is enforceable
-- — a per-customer counter, not just a global flag.
--
-- orders gets the columns needed to record what was actually applied,
-- for order history/refund/audit purposes.

create table public.promo_terms (
    id uuid primary key default gen_random_uuid(),
    tenant_id uuid not null references public.tenants(id) on delete cascade,
    promotion_id uuid references public.promotions(id) on delete set null,
    code text not null,
    discount_type text not null check (discount_type in ('percent', 'fixed')),
    discount_value numeric not null check (discount_value > 0),
    max_uses_per_customer int,
    min_order_amount numeric,
    active boolean not null default true,
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now()
);

create unique index promo_terms_tenant_code_idx on public.promo_terms (tenant_id, lower(code));

alter table public.promo_terms enable row level security;
create policy promo_terms_select on public.promo_terms for select using (tenant_id in (select app_current_tenant_ids()));
create policy promo_terms_insert on public.promo_terms for insert with check (tenant_id in (select app_current_tenant_ids()));
create policy promo_terms_update on public.promo_terms for update using (tenant_id in (select app_current_tenant_ids())) with check (tenant_id in (select app_current_tenant_ids()));
create policy promo_terms_delete on public.promo_terms for delete using (tenant_id in (select app_current_tenant_ids()));

create table public.promo_redemptions (
    id uuid primary key default gen_random_uuid(),
    tenant_id uuid not null references public.tenants(id) on delete cascade,
    promo_term_id uuid not null references public.promo_terms(id) on delete cascade,
    customer_id uuid not null references public.customers(id) on delete cascade,
    order_id uuid references public.orders(id) on delete set null,
    discount_amount numeric not null,
    created_at timestamp with time zone not null default now()
);

create index promo_redemptions_customer_idx on public.promo_redemptions (promo_term_id, customer_id);

alter table public.promo_redemptions enable row level security;
create policy promo_redemptions_select on public.promo_redemptions for select using (tenant_id in (select app_current_tenant_ids()));
create policy promo_redemptions_insert on public.promo_redemptions for insert with check (tenant_id in (select app_current_tenant_ids()));

alter table public.orders
    add column if not exists promo_term_id uuid references public.promo_terms(id) on delete set null,
    add column if not exists discount_amount numeric not null default 0,
    add column if not exists points_redeemed int not null default 0;
