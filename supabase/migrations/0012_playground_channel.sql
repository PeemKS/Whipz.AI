-- Applied directly via Supabase MCP `apply_migration`. Saved here for
-- repo history. Must remain its own migration — ALTER TYPE ... ADD
-- VALUE cannot run in the same transaction as later use of the value.

alter type channel add value if not exists 'playground';
