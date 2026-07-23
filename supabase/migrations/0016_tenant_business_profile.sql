-- Applied directly via Supabase MCP `apply_migration`. Saved here for
-- repo history. Basic business profile fields (Google-Maps-listing
-- style: category, address, phone, website, hours, logo) plus a
-- public logo storage bucket, RLS-scoped by tenant like product-images.

alter table public.tenants
    add column if not exists category text,
    add column if not exists address text,
    add column if not exists phone text,
    add column if not exists website text,
    add column if not exists description text,
    add column if not exists logo_url text,
    add column if not exists opening_hours jsonb not null default '{}'::jsonb;

insert into storage.buckets (id, name, public)
values ('business-logos', 'business-logos', true)
on conflict (id) do nothing;

-- Object path convention: {tenant_id}/logo.{ext}

create policy "business_logos_select" on storage.objects
    for select to authenticated
    using (
        bucket_id = 'business-logos'
        and (storage.foldername(name))[1]::uuid in (select app_current_tenant_ids())
    );

create policy "business_logos_insert" on storage.objects
    for insert to authenticated
    with check (
        bucket_id = 'business-logos'
        and (storage.foldername(name))[1]::uuid in (select app_current_tenant_ids())
    );

create policy "business_logos_update" on storage.objects
    for update to authenticated
    using (
        bucket_id = 'business-logos'
        and (storage.foldername(name))[1]::uuid in (select app_current_tenant_ids())
    )
    with check (
        bucket_id = 'business-logos'
        and (storage.foldername(name))[1]::uuid in (select app_current_tenant_ids())
    );

create policy "business_logos_delete" on storage.objects
    for delete to authenticated
    using (
        bucket_id = 'business-logos'
        and (storage.foldername(name))[1]::uuid in (select app_current_tenant_ids())
    );
