-- Lets merchants attach a reference document (PDF/text/markdown) to a
-- product for richer RAG context, and exposes that content through
-- match_products so runConversationTurn can surface it in the system
-- prompt. Private bucket (unlike product-images) — the raw file is only
-- ever read server-side to extract text, never linked to directly.

insert into storage.buckets (id, name, public)
values ('product-documents', 'product-documents', false)
on conflict (id) do nothing;

-- Object path convention: {tenant_id}/{product_id}/{filename}, same as product-images.

create policy "product_documents_select" on storage.objects
    for select to authenticated
    using (
        bucket_id = 'product-documents'
        and (storage.foldername(name))[1]::uuid in (select app_current_tenant_ids())
    );

create policy "product_documents_insert" on storage.objects
    for insert to authenticated
    with check (
        bucket_id = 'product-documents'
        and (storage.foldername(name))[1]::uuid in (select app_current_tenant_ids())
    );

create policy "product_documents_update" on storage.objects
    for update to authenticated
    using (
        bucket_id = 'product-documents'
        and (storage.foldername(name))[1]::uuid in (select app_current_tenant_ids())
    )
    with check (
        bucket_id = 'product-documents'
        and (storage.foldername(name))[1]::uuid in (select app_current_tenant_ids())
    );

create policy "product_documents_delete" on storage.objects
    for delete to authenticated
    using (
        bucket_id = 'product-documents'
        and (storage.foldername(name))[1]::uuid in (select app_current_tenant_ids())
    );

alter table public.products
    add column if not exists document_name text,
    add column if not exists document_path text,
    add column if not exists document_text text;

-- match_products now also returns document_text so the AI can quote
-- from an attached spec sheet/manual, not just name+description.
drop function if exists public.match_products(uuid, vector(1024), int);

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
    document_text text,
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
        products.document_text,
        1 - (products.embedding <=> p_query_embedding) as similarity
    from public.products
    where products.tenant_id = p_tenant_id
      and products.embedding is not null
    order by products.embedding <=> p_query_embedding
    limit p_match_count;
$$;
