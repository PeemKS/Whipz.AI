import type { SupabaseClient } from "@supabase/supabase-js";
import type { Customer, Channel } from "@/lib/supabase/types";

export async function listCustomers(db: SupabaseClient, tenant_id: string): Promise<Customer[]> {
  const { data, error } = await db
    .from("customers")
    .select("*")
    .eq("tenant_id", tenant_id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as Customer[];
}

export async function listCustomerChannels(
  db: SupabaseClient,
  tenant_id: string
): Promise<{ customer_id: string; channel: Channel }[]> {
  const { data, error } = await db
    .from("customer_channel_identities")
    .select("customer_id, channel")
    .eq("tenant_id", tenant_id);
  if (error) throw error;
  return data;
}

export async function getCustomer(db: SupabaseClient, id: string): Promise<Customer | null> {
  const { data, error } = await db.from("customers").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as Customer | null;
}

// Resolves a customer's external_user_id on a given channel — needed to
// deliver an outbound message (e.g. a human reply from the Inbox) back
// through that channel's adapter.
export async function getCustomerChannelIdentity(
  db: SupabaseClient,
  tenant_id: string,
  customer_id: string,
  channel: Channel
): Promise<{ external_user_id: string } | null> {
  const { data, error } = await db
    .from("customer_channel_identities")
    .select("external_user_id")
    .eq("tenant_id", tenant_id)
    .eq("customer_id", customer_id)
    .eq("channel", channel)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// Resolves a customer by channel identity, creating both the customer
// and the channel identity if this is the first time we've seen them.
// `fetchProfile` (e.g. a Meta Graph API call) only runs when actually
// creating a new customer — never on every incoming message.
export async function getOrCreateCustomerByChannel(
  db: SupabaseClient,
  tenant_id: string,
  channel: Channel,
  external_user_id: string,
  display_name?: string,
  fetchProfile?: () => Promise<{ name: string | null; avatar_url: string | null } | null>
): Promise<Customer> {
  const existing = await db
    .from("customer_channel_identities")
    .select("customer_id")
    .eq("tenant_id", tenant_id)
    .eq("channel", channel)
    .eq("external_user_id", external_user_id)
    .maybeSingle();
  if (existing.error) throw existing.error;

  if (existing.data) {
    const customer = await getCustomer(db, existing.data.customer_id);
    if (customer) {
      // Backfill a profile that was created before we could fetch names/
      // photos (or before this customer's first message ever resolved
      // one) — but never clobber a name someone's since edited by hand.
      if (!customer.display_name && fetchProfile) {
        const profile = await fetchProfile();
        if (profile?.name || profile?.avatar_url) {
          return await updateCustomer(db, customer.id, {
            display_name: profile.name ?? undefined,
            avatar_url: profile.avatar_url ?? undefined,
          });
        }
      }
      return customer;
    }
  }

  const profile = fetchProfile ? await fetchProfile() : null;

  const { data: customer, error: customerError } = await db
    .from("customers")
    .insert({ tenant_id, display_name: profile?.name ?? display_name, avatar_url: profile?.avatar_url ?? null })
    .select("*")
    .single();
  if (customerError) throw customerError;

  const { error: identityError } = await db
    .from("customer_channel_identities")
    .insert({ tenant_id, customer_id: customer.id, channel, external_user_id });
  if (identityError) throw identityError;

  return customer as Customer;
}

export async function updateCustomerLoyalty(
  db: SupabaseClient,
  id: string,
  input: { loyalty_points: number; total_spent: number; membership_tier_id: string | null }
): Promise<Customer> {
  const { data, error } = await db
    .from("customers")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as Customer;
}

// Clamped to [0, 100] — the ±20-per-conversation guard on individual
// deltas lives in the update_lead_score tool (lib/agents/tools.ts); this
// bounds the running total itself so it can't drift unbounded either way.
const LEAD_SCORE_MIN = 0;
const LEAD_SCORE_MAX = 100;

export async function updateCustomerLeadScore(db: SupabaseClient, id: string, newTotal: number): Promise<Customer> {
  const clamped = Math.max(LEAD_SCORE_MIN, Math.min(LEAD_SCORE_MAX, Math.round(newTotal)));
  const { data, error } = await db
    .from("customers")
    .update({ lead_score: clamped, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as Customer;
}

// Called from the paid-order transition (app/dashboard/orders/actions.ts)
// — feeds lib/lifecycle/'s repurchase-cycle and stage math, which reads
// this cached value instead of re-querying/re-sorting every order.
export async function updateCustomerLastOrderAt(db: SupabaseClient, id: string, orderDate: string): Promise<void> {
  const { error } = await db
    .from("customers")
    .update({ last_order_at: orderDate, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

// Backs the enroll_member tool — distinct from membership TIER
// assignment (automatic, spend-based) — this is explicit opt-in
// consent. No-ops (returns the customer unchanged) if already enrolled,
// so the tool is safe to call more than once.
export async function enrollCustomerInLoyaltyProgram(db: SupabaseClient, id: string): Promise<Customer> {
  const { data, error } = await db
    .from("customers")
    .update({ loyalty_opt_in: true, loyalty_opt_in_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as Customer;
}

export async function updateCustomer(
  db: SupabaseClient,
  id: string,
  input: Partial<
    Pick<
      Customer,
      | "display_name"
      | "avatar_url"
      | "email"
      | "phone"
      | "notes"
      | "metadata"
      | "birth_date"
      | "marketing_consent"
      | "shipping_address"
    >
  >
): Promise<Customer> {
  const { data, error } = await db
    .from("customers")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as Customer;
}
