-- Funnel-aware agent, Phase 5: distinguishes an AI-triggered handoff
-- (explicit request, legal/safety, refund-above-threshold, repeated
-- tool failures) from a merchant manually taking over in the Inbox —
-- both set human_takeover=true, but only the automatic ones should
-- surface as a "needs attention" badge (a merchant who just took over
-- themselves obviously already knows).

alter table public.conversations
    add column if not exists handoff_reason text;
