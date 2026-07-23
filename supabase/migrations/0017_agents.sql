-- Applied directly via Supabase MCP `apply_migration`. Saved here for
-- repo history. Tenant-configurable specialized agents, layered on
-- top of the existing single-agent-per-tenant default (tenants.llm_model
-- + the hardcoded systemPromptFor prompt in runConversationTurn.ts).
-- A tenant with zero active agents sees no behavior change at all —
-- specialized agents are opt-in. `specialization` is a natural-language
-- description used by an AI routing step (see lib/agents/pickAgent.ts)
-- to decide which agent best fits an incoming message, rather than
-- rigid product/customer-tag scoping rules.

create table public.agents (
    id uuid primary key default gen_random_uuid(),
    tenant_id uuid not null references public.tenants(id) on delete cascade,
    name text not null,
    specialization text not null,
    system_prompt text not null,
    is_active boolean not null default true,
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now()
);

create index agents_tenant_id_idx on public.agents (tenant_id);

alter table public.agents enable row level security;

create policy agents_select on public.agents
    for select using (tenant_id in (select app_current_tenant_ids()));

create policy agents_insert on public.agents
    for insert with check (tenant_id in (select app_current_tenant_ids()));

create policy agents_update on public.agents
    for update using (tenant_id in (select app_current_tenant_ids()))
    with check (tenant_id in (select app_current_tenant_ids()));

create policy agents_delete on public.agents
    for delete using (tenant_id in (select app_current_tenant_ids()));

-- agent_id: which specialized agent (if any) is handling this
-- conversation. agent_locked: whether the routing decision has already
-- been made (so we don't re-run the AI router on every single turn —
-- null agent_id + agent_locked=true means "explicitly routed to the
-- tenant's default agent", distinct from "not yet routed").
alter table public.conversations
    add column if not exists agent_id uuid references public.agents(id) on delete set null,
    add column if not exists agent_locked boolean not null default false;
