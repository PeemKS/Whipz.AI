-- Funnel-aware agent, Phase 0: a generic append-only audit log for
-- everything the AI agent does (tool calls, routing decisions, cache
-- hits, escalations) — mirrors the loyalty_transactions ledger pattern
-- (0018) rather than inventing a new shape. This backs both the safety
-- checklist's "all v2/v3 actions logged with full audit trail" and the
-- future bot-performance dashboard (cost/conversation, latency, %
-- handled per layer).
--
-- Also adds a per-session tool-call counter on conversations, enforced
-- in lib/agents/runConversationTurn.ts against a hard cap (30) — the
-- session half of the safety checklist's "max tool calls per turn (5)
-- and per session (30)"; the per-turn half is enforced in application
-- code against this same column read at the start of a turn, no schema
-- needed for that part.

create table public.agent_actions (
    id uuid primary key default gen_random_uuid(),
    tenant_id uuid not null references public.tenants(id) on delete cascade,
    conversation_id uuid references public.conversations(id) on delete cascade,
    customer_id uuid references public.customers(id) on delete set null,
    kind text not null check (kind in ('tool_call', 'routing_decision', 'l1_cache_hit', 'escalation', 'crm_event')),
    tool_name text,
    args jsonb,
    result jsonb,
    layer text check (layer in ('l1', 'l2', 'l3')),
    model text,
    tokens_used int,
    latency_ms int,
    created_at timestamp with time zone not null default now()
);

create index agent_actions_conversation_id_idx on public.agent_actions (conversation_id, created_at);
create index agent_actions_tenant_id_idx on public.agent_actions (tenant_id, created_at);

alter table public.agent_actions enable row level security;
create policy agent_actions_select on public.agent_actions for select using (tenant_id in (select app_current_tenant_ids()));
create policy agent_actions_insert on public.agent_actions for insert with check (tenant_id in (select app_current_tenant_ids()));

alter table public.conversations
    add column if not exists tool_call_count int not null default 0;

-- Atomic increment (avoids a read-then-write race if a conversation is
-- somehow processed concurrently) — returns the new total so the caller
-- can compare it against the hard cap without a second round-trip.
create or replace function public.increment_conversation_tool_call_count(p_conversation_id uuid, p_by int)
returns int
language sql
set search_path to 'public'
as $$
    update public.conversations
    set tool_call_count = tool_call_count + p_by
    where id = p_conversation_id
    returning tool_call_count;
$$;
