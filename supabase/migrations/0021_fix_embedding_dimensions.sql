-- Fixes a dimension mismatch: 0013/0020 assumed DashScope's
-- text-embedding-v3 supports 1536-dim output (an OpenAI-style default),
-- but this account's API rejects it — only 512, 768, or 1024 are valid.
-- No real embeddings exist yet on either column (confirmed via direct
-- query before writing this), so this is a safe drop-and-recreate rather
-- than a data-preserving cast. lib/llm/embeddings.ts now requests 1024.

alter table public.products drop column embedding;
alter table public.products add column embedding vector(1024);

alter table public.agents drop column specialization_embedding;
alter table public.agents add column specialization_embedding vector(1024);

drop function if exists public.match_products(uuid, vector(1536), int);
drop function if exists public.match_agents(uuid, vector(1536), int);

create or replace function public.match_products(
    p_tenant_id uuid,
    p_query_embedding vector(1024),
    p_match_count int default 4
)
returns table (
    id uuid,
    sku text,
    name text,
    price numeric,
    stock int,
    description text,
    similarity float
)
language sql stable
set search_path to 'public'
as $$
    select
        products.id,
        products.sku,
        products.name,
        products.price,
        products.stock,
        products.description,
        1 - (products.embedding <=> p_query_embedding) as similarity
    from public.products
    where products.tenant_id = p_tenant_id
      and products.embedding is not null
    order by products.embedding <=> p_query_embedding
    limit p_match_count;
$$;

create or replace function public.match_agents(
    p_tenant_id uuid,
    p_query_embedding vector(1024),
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
