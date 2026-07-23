-- Profile picture URL, populated from the channel's user-profile API
-- (e.g. Meta Graph API's profile_pic) the first time a customer is seen
-- on that channel. Applied manually via the Supabase SQL editor — see
-- lib/db/customers.ts / lib/channels/meta.ts for where it's set.

alter table public.customers
    add column if not exists avatar_url text;
