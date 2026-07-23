-- Applied directly via Supabase MCP `apply_migration`. Saved here for
-- repo history. Additional customer profile fields for the loyalty
-- program: birthday (birthday-month perks), marketing consent, and
-- shipping address (for physical reward fulfillment). Collected either
-- conversationally by the agent (see update_customer_profile tool in
-- lib/agents/tools.ts) or manually via the dashboard.

alter table public.customers
    add column if not exists birth_date date,
    add column if not exists marketing_consent boolean not null default false,
    add column if not exists shipping_address text;
