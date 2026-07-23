-- Adds human takeover: a merchant can reply to a customer directly from
-- the Inbox, which pauses the AI on that conversation until they hand
-- it back. Requires a new message_sender value ('human') and a flag on
-- conversations (lib/agents/runConversationTurn.ts's callers — the
-- chat/webhook routes — check this before generating an AI reply).
--
-- ALTER TYPE ... ADD VALUE must run on its own, outside any transaction
-- that also references the new value — run this statement by itself
-- first if your SQL editor errors on it.
alter type message_sender add value if not exists 'human';

alter table public.conversations
    add column if not exists human_takeover boolean not null default false;
