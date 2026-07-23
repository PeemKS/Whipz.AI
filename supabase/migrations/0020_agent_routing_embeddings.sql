-- Applied directly via Supabase MCP `apply_migration`. Saved here for
-- repo history. Lets per-turn agent routing try a cheap embedding-similarity
-- match first (reusing the message embedding already computed for product
-- RAG search each turn) before falling back to the LLM tool-call router in
-- lib/agents/pickAgent.ts. Mirrors products.embedding + match_products.

alter table public.agents
    add column if not exists specialization_embedding vector(1536);

create or replace function public.match_agents(
    p_tenant_id uuid,
    p_query_embedding vector(1536),
    p_match_count int default 5
)
returns table (
    id uuid,
    name text,
    specialization text,
    similarity float
)
language sql stable
set search_path to 'public'
as $$
    select
        agents.id,
        agents.name,
        agents.specialization,
        1 - (agents.specialization_embedding <=> p_query_embedding) as similarity
    from public.agents
    where agents.tenant_id = p_tenant_id
      and agents.is_active = true
      and agents.specialization_embedding is not null
    order by agents.specialization_embedding <=> p_query_embedding
    limit p_match_count;
$$;
