-- Backs the enroll_member tool. Membership TIERS are already fully
-- automatic by spend (membership_tier_id, via getTierForSpend) — that's
-- a different question from whether a customer has actually opted in
-- to the loyalty program (consent to be tracked/contacted about it),
-- which is what "enrolling" means here. Mirrors marketing_consent's
-- shape (0019) — a boolean flag plus the timestamp it flipped.

alter table public.customers
    add column if not exists loyalty_opt_in boolean not null default false,
    add column if not exists loyalty_opt_in_at timestamp with time zone;
