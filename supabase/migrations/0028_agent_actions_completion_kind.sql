-- Closes a real gap in Phase 0's audit log: tokens/latency were only
-- ever recorded on 'tool_call' rows, so a turn that replied with plain
-- text (no tool call — the common case) never got its usage logged at
-- all, undercounting "cost per conversation". Adds 'completion' as a
-- new kind logged once per LLM round regardless of whether it made a
-- tool call; tool_call rows go back to being purely about the
-- function-execution (no more "only the first tool call in a round
-- carries the tokens" attribution hack from Phase 0).
--
-- Finds and drops the existing kind check constraint by introspection
-- rather than a hardcoded name, since Postgres's auto-generated name
-- for an inline column check isn't guaranteed across environments.
do $$
declare
  existing_conname text;
begin
  select con.conname into existing_conname
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  where rel.relname = 'agent_actions' and con.contype = 'c' and pg_get_constraintdef(con.oid) like '%kind%';
  if existing_conname is not null then
    execute format('alter table public.agent_actions drop constraint %I', existing_conname);
  end if;
end $$;

alter table public.agent_actions
    add constraint agent_actions_kind_check check (kind in ('tool_call', 'routing_decision', 'l1_cache_hit', 'escalation', 'crm_event', 'completion'));
