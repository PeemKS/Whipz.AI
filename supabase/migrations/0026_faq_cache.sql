-- Funnel-aware agent, Phase 1 (part 2/2): the FAQ embedding-cache that
-- stands in for the blueprint's L1 "near-zero-cost" layer (interactive
-- buttons/menus aren't buildable — no channel here supports them; this
-- cache is what actually carries L1 traffic). Mirrors match_products
-- (0013/0021) and match_agents (0020/0021) exactly: same vector(1024)
-- dimension, same RPC shape, same tenant-scoped cosine-similarity query.

create table public.faq_cache (
    id uuid primary key default gen_random_uuid(),
    tenant_id uuid not null references public.tenants(id) on delete cascade,
    question text not null,
    question_embedding vector(1024),
    answer text not null,
    hit_count int not null default 0,
    active boolean not null default true,
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now()
);

create index faq_cache_tenant_id_idx on public.faq_cache (tenant_id);

alter table public.faq_cache enable row level security;
create policy faq_cache_select on public.faq_cache for select using (tenant_id in (select app_current_tenant_ids()));
create policy faq_cache_insert on public.faq_cache for insert with check (tenant_id in (select app_current_tenant_ids()));
create policy faq_cache_update on public.faq_cache for update using (tenant_id in (select app_current_tenant_ids())) with check (tenant_id in (select app_current_tenant_ids()));
create policy faq_cache_delete on public.faq_cache for delete using (tenant_id in (select app_current_tenant_ids()));

create or replace function public.match_faq_cache(
    p_tenant_id uuid,
    p_query_embedding vector(1024),
    p_match_count int default 1
)
returns table (
    id uuid,
    question text,
    answer text,
    similarity float
)
language sql stable
set search_path to 'public'
as $$
    select
        faq_cache.id,
        faq_cache.question,
        faq_cache.answer,
        1 - (faq_cache.question_embedding <=> p_query_embedding) as similarity
    from public.faq_cache
    where faq_cache.tenant_id = p_tenant_id
      and faq_cache.active = true
      and faq_cache.question_embedding is not null
    order by faq_cache.question_embedding <=> p_query_embedding
    limit p_match_count;
$$;

create or replace function public.increment_faq_hit_count(p_id uuid)
returns void
language sql
set search_path to 'public'
as $$
    update public.faq_cache set hit_count = hit_count + 1 where id = p_id;
$$;
