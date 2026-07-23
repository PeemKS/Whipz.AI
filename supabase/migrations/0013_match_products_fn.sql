-- Applied directly via Supabase MCP `apply_migration`. Saved here for
-- repo history. RAG retrieval: top-k products for a tenant by cosine
-- similarity against products.embedding (vector(1536)).

create or replace function public.match_products(
    p_tenant_id uuid,
    p_query_embedding vector(1536),
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
