-- Applied directly via Supabase MCP `apply_migration`. Saved here for
-- repo history. A public bucket for user profile photos, keyed by
-- auth.uid() (not tenant_id) since avatars belong to the person, not
-- any one business.

insert into storage.buckets (id, name, public)
values ('user-avatars', 'user-avatars', true)
on conflict (id) do nothing;

-- Object path convention: {user_id}/avatar.{ext}

create policy "user_avatars_select" on storage.objects
    for select to authenticated
    using (bucket_id = 'user-avatars');

create policy "user_avatars_insert" on storage.objects
    for insert to authenticated
    with check (
        bucket_id = 'user-avatars'
        and (storage.foldername(name))[1]::uuid = app_auth_uid()
    );

create policy "user_avatars_update" on storage.objects
    for update to authenticated
    using (
        bucket_id = 'user-avatars'
        and (storage.foldername(name))[1]::uuid = app_auth_uid()
    )
    with check (
        bucket_id = 'user-avatars'
        and (storage.foldername(name))[1]::uuid = app_auth_uid()
    );

create policy "user_avatars_delete" on storage.objects
    for delete to authenticated
    using (
        bucket_id = 'user-avatars'
        and (storage.foldername(name))[1]::uuid = app_auth_uid()
    );
