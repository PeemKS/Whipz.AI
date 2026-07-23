-- Applied directly via Supabase MCP `apply_migration`. Saved here for
-- repo history. A public bucket for product photos — public so the
-- resulting URLs can be shown directly in chat/dashboard without
-- signed-URL plumbing; writes are still RLS-scoped per tenant.

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

-- Object path convention: {tenant_id}/{product_id}/{filename} — the
-- first path segment encodes tenant_id, matching the tenant-scoped
-- RLS pattern used on every other table via app_current_tenant_ids().

create policy "product_images_select" on storage.objects
    for select to authenticated
    using (
        bucket_id = 'product-images'
        and (storage.foldername(name))[1]::uuid in (select app_current_tenant_ids())
    );

create policy "product_images_insert" on storage.objects
    for insert to authenticated
    with check (
        bucket_id = 'product-images'
        and (storage.foldername(name))[1]::uuid in (select app_current_tenant_ids())
    );

create policy "product_images_update" on storage.objects
    for update to authenticated
    using (
        bucket_id = 'product-images'
        and (storage.foldername(name))[1]::uuid in (select app_current_tenant_ids())
    )
    with check (
        bucket_id = 'product-images'
        and (storage.foldername(name))[1]::uuid in (select app_current_tenant_ids())
    );

create policy "product_images_delete" on storage.objects
    for delete to authenticated
    using (
        bucket_id = 'product-images'
        and (storage.foldername(name))[1]::uuid in (select app_current_tenant_ids())
    );
