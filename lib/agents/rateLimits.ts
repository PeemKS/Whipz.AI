import type { SupabaseClient } from "@supabase/supabase-js";
import { sumTokensSince } from "@/lib/db/agentActions";

const SOFT_ALERT_RATIO = 0.8;

export interface TokenBudgetStatus {
  budget: number | null; // null = unlimited, no budget configured
  used: number;
  ratio: number; // 0 if unlimited
  softAlert: boolean; // >= 80% of budget
  overBudget: boolean; // >= 100% of budget
}

function startOfMonthIso(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
}

// No plan/billing system exists in this app (deferred, see the plan
// doc) — this is an opt-in per-tenant cap, not plan-tier gating. A
// tenant with no budget set (the default) always reports
// overBudget:false, so nothing changes for anyone who hasn't opted in.
export async function checkTokenBudget(db: SupabaseClient, tenant_id: string, monthlyTokenBudget: number | null): Promise<TokenBudgetStatus> {
  if (monthlyTokenBudget == null) {
    return { budget: null, used: 0, ratio: 0, softAlert: false, overBudget: false };
  }
  const used = await sumTokensSince(db, tenant_id, startOfMonthIso());
  const ratio = monthlyTokenBudget > 0 ? used / monthlyTokenBudget : 0;
  return {
    budget: monthlyTokenBudget,
    used,
    ratio,
    softAlert: ratio >= SOFT_ALERT_RATIO,
    overBudget: ratio >= 1,
  };
}
