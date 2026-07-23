import type { SupabaseClient } from "@supabase/supabase-js";
import type { ChatCompletionTool } from "@/lib/llm/client";
import { getProductBySku, decrementStock } from "@/lib/db/products";
import { createOrder, listOrdersForCustomer } from "@/lib/db/orders";
import { getCustomer, updateCustomer, enrollCustomerInLoyaltyProgram } from "@/lib/db/customers";
import { getMembershipTier, listMembershipTiers } from "@/lib/db/membershipTiers";
import { listActiveRewards } from "@/lib/db/rewards";
import { redeemReward as redeemRewardEngine, redeemPointsForOrderDiscount } from "@/lib/loyalty/engine";
import { createLeadScoreEvent } from "@/lib/db/leadScoreEvents";
import { updateCustomerLeadScore } from "@/lib/db/customers";
import { createStockHold, availableStock, consumeActiveHoldsForCustomerProduct } from "@/lib/db/stockHolds";
import { validatePromoCode, createPromoRedemption } from "@/lib/db/promoTerms";
import type { OrderItem } from "@/lib/supabase/types";

// Hard ceiling on a single call's delta — enforced here, never trusted
// to the prompt (funnel-aware-agent blueprint §9). The running total
// itself is separately clamped to [0, 100] in updateCustomerLeadScore.
const MAX_LEAD_SCORE_DELTA = 20;

// reserve_stock hard limits, straight from the blueprint's v2 tool
// table — enforced here, not in the prompt.
const RESERVE_STOCK_MAX_QTY = 3;
const RESERVE_STOCK_HOLD_MINUTES = 30;

// Only offered on channels that can actually render images inline (the
// Playground today) — see runConversationTurn.ts, which decides whether
// to append this to agentTools based on the conversation's channel.
export const imageTools: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "send_product_photos",
      description: "Send this product's photos to the customer — use when they ask to see it or want a visual reference.",
      parameters: {
        type: "object",
        properties: {
          sku: { type: "string", description: "The product SKU whose photos to send." },
        },
        required: ["sku"],
      },
    },
  },
];

export const agentTools: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "check_stock",
      description: "Look up current stock quantity and price for a product by SKU.",
      parameters: {
        type: "object",
        properties: {
          sku: { type: "string", description: "The product SKU to look up." },
        },
        required: ["sku"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_order",
      description:
        "Create an order for the current customer with the given line items. Only call this after the customer has explicitly confirmed they want to buy.",
      parameters: {
        type: "object",
        properties: {
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                sku: { type: "string" },
                qty: { type: "integer", minimum: 1 },
              },
              required: ["sku", "qty"],
            },
          },
          promo_code: {
            type: "string",
            description: "Optional — a promo code the customer wants applied, previously confirmed valid via apply_promo.",
          },
        },
        required: ["items"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_order_history",
      description: "Get the current customer's past orders.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "check_loyalty_status",
      description: "Look up the current customer's membership tier, loyalty points balance, and progress to the next tier.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "update_customer_profile",
      description:
        "Save or update the current customer's contact/profile details when they share them in conversation — e.g. email, phone, birthday, shipping address, or marketing consent. Only call this with fields the customer actually just provided; never invent values, and never ask for information not relevant to the current conversation.",
      parameters: {
        type: "object",
        properties: {
          email: { type: "string" },
          phone: { type: "string" },
          birth_date: { type: "string", description: "ISO date, YYYY-MM-DD" },
          shipping_address: { type: "string" },
          marketing_consent: {
            type: "boolean",
            description: "true only if the customer explicitly agreed to receive marketing messages",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "redeem_reward",
      description:
        "Redeem one of the shop's rewards for the current customer using their loyalty points. Only call this after the customer has explicitly asked to redeem a specific reward.",
      parameters: {
        type: "object",
        properties: {
          reward_name: { type: "string", description: "The name of the reward to redeem (as shown in the rewards catalog)." },
        },
        required: ["reward_name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_lead_score",
      description:
        "Adjust the current customer's lead score to reflect buying-intent signals in this conversation (e.g. asked about pricing, compared products, said they'll buy soon: positive; said they're just browsing or not interested: negative). Small nudges, not a final verdict — call at most once per conversation with your best-judgment delta.",
      parameters: {
        type: "object",
        properties: {
          delta: {
            type: "integer",
            description: "Change to apply, from -20 to +20. Positive for stronger buying intent, negative for weaker.",
          },
          reason: { type: "string", description: "Brief reason for this adjustment, e.g. \"asked about bulk pricing\"." },
        },
        required: ["delta", "reason"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "reserve_stock",
      description:
        "Briefly hold a quantity of a product for the current customer while they decide (e.g. \"I can hold 2 for you for 30 minutes\"). Does not create an order. Max 3 units, expires automatically after 30 minutes.",
      parameters: {
        type: "object",
        properties: {
          sku: { type: "string", description: "The product SKU to hold." },
          qty: { type: "integer", minimum: 1, maximum: RESERVE_STOCK_MAX_QTY },
        },
        required: ["sku", "qty"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "apply_promo",
      description:
        "Check whether a promo code the customer mentioned is valid, and get its discount terms. Does not charge or modify anything — call create_order with the same promo_code afterward to actually apply it.",
      parameters: {
        type: "object",
        properties: {
          code: { type: "string", description: "The promo code to validate, exactly as the customer typed it." },
        },
        required: ["code"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "redeem_points",
      description:
        "Apply the customer's loyalty points as a discount to an order that already exists (checkout-time only — the order must already be created via create_order first). Only call after the customer explicitly asks to use their points on this order.",
      parameters: {
        type: "object",
        properties: {
          order_id: { type: "string", description: "The order to discount — from a prior create_order call." },
          points: { type: "integer", minimum: 1, description: "How many points to redeem." },
        },
        required: ["order_id", "points"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "enroll_member",
      description:
        "Opt the current customer into the loyalty program. Only call after they've completed a purchase or explicitly agreed to join — never silently.",
      parameters: { type: "object", properties: {} },
    },
  },
];

export async function runTool(
  db: SupabaseClient,
  tenant_id: string,
  customer_id: string,
  name: string,
  args: Record<string, unknown>
): Promise<Record<string, unknown>> {
  switch (name) {
    case "check_stock": {
      const sku = String(args.sku ?? "");
      const product = await getProductBySku(db, tenant_id, sku);
      if (!product) return { error: `No product found with SKU ${sku}` };
      // Available, not raw — excludes what's currently held for other
      // customers via reserve_stock, so the model doesn't oversell.
      const available = await availableStock(db, product.id, product.stock);
      return { sku: product.sku, name: product.name, stock: available, price: product.price };
    }
    case "send_product_photos": {
      const sku = String(args.sku ?? "");
      const product = await getProductBySku(db, tenant_id, sku);
      if (!product) return { error: `No product found with SKU ${sku}` };
      const images = (product.images ?? []) as string[];
      if (images.length === 0) return { error: `Product ${sku} has no photos uploaded` };
      return { sku: product.sku, images };
    }
    case "create_order": {
      const rawItems = Array.isArray(args.items) ? (args.items as { sku: string; qty: number }[]) : [];
      const resolved: OrderItem[] = [];
      const productIds: string[] = [];
      for (const item of rawItems) {
        const product = await getProductBySku(db, tenant_id, item.sku);
        if (!product) return { error: `No product found with SKU ${item.sku}` };
        const available = await availableStock(db, product.id, product.stock);
        if (available < item.qty) {
          return { error: `Insufficient stock for ${item.sku}: only ${available} available` };
        }
        resolved.push({ sku: product.sku, qty: item.qty, price: product.price });
        productIds.push(product.id);
      }
      for (const item of resolved) {
        const updated = await decrementStock(db, tenant_id, item.sku, item.qty);
        if (!updated) return { error: `Stock changed concurrently for ${item.sku}, please retry` };
      }
      // Fulfilled — any hold this customer had on these SKUs is now
      // real inventory movement, not a pending reservation. Without
      // this, availableStock would subtract the hold a second time on
      // top of the real decrement just above.
      for (const product_id of productIds) {
        await consumeActiveHoldsForCustomerProduct(db, product_id, customer_id);
      }

      const rawTotal = resolved.reduce((sum, item) => sum + item.price * item.qty, 0);
      let discount: { promo_term_id: string; discount_amount: number } | undefined;
      const promoCode = typeof args.promo_code === "string" ? args.promo_code.trim() : "";
      if (promoCode) {
        const validation = await validatePromoCode(db, tenant_id, customer_id, promoCode, rawTotal);
        if (!validation.ok || !validation.promoTerm) return { error: validation.reason ?? "Invalid promo code" };
        discount = { promo_term_id: validation.promoTerm.id, discount_amount: validation.discountAmount ?? 0 };
      }

      const order = await createOrder(db, tenant_id, customer_id, resolved, discount);
      if (discount) {
        await createPromoRedemption(db, {
          tenant_id,
          promo_term_id: discount.promo_term_id,
          customer_id,
          order_id: order.id,
          discount_amount: discount.discount_amount,
        });
      }
      return { order_id: order.id, total_amount: order.total_amount, discount_amount: order.discount_amount, status: order.status };
    }
    case "get_order_history": {
      const orders = await listOrdersForCustomer(db, customer_id);
      return { orders: orders.map((o) => ({ id: o.id, items: o.items, total_amount: o.total_amount, status: o.status, created_at: o.created_at })) };
    }
    case "check_loyalty_status": {
      const customer = await getCustomer(db, customer_id);
      if (!customer) return { error: "Customer not found" };

      const currentTier = customer.membership_tier_id ? await getMembershipTier(db, customer.membership_tier_id) : null;
      const tiers = await listMembershipTiers(db, tenant_id);
      const nextTier = tiers
        .filter((t) => Number(t.min_spend) > Number(customer.total_spent))
        .sort((a, b) => Number(a.min_spend) - Number(b.min_spend))[0];

      return {
        tier_name: currentTier?.name ?? "No tier yet",
        loyalty_points: customer.loyalty_points,
        total_spent: customer.total_spent,
        next_tier: nextTier
          ? { name: nextTier.name, spend_needed: Number(nextTier.min_spend) - Number(customer.total_spent) }
          : "Already at the top tier",
      };
    }
    case "update_customer_profile": {
      const updates: Parameters<typeof updateCustomer>[2] = {};
      if (typeof args.email === "string" && args.email.trim()) updates.email = args.email.trim();
      if (typeof args.phone === "string" && args.phone.trim()) updates.phone = args.phone.trim();
      if (typeof args.birth_date === "string" && args.birth_date.trim()) updates.birth_date = args.birth_date.trim();
      if (typeof args.shipping_address === "string" && args.shipping_address.trim())
        updates.shipping_address = args.shipping_address.trim();
      if (typeof args.marketing_consent === "boolean") updates.marketing_consent = args.marketing_consent;

      if (Object.keys(updates).length === 0) return { error: "No profile fields provided" };

      await updateCustomer(db, customer_id, updates);
      return { saved: Object.keys(updates) };
    }
    case "redeem_reward": {
      const rewardName = String(args.reward_name ?? "").trim().toLowerCase();
      const rewards = await listActiveRewards(db, tenant_id);
      const reward = rewards.find((r) => r.name.toLowerCase() === rewardName || r.name.toLowerCase().includes(rewardName));
      if (!reward) return { error: `No active reward found matching "${args.reward_name}"` };

      const result = await redeemRewardEngine(db, tenant_id, customer_id, reward);
      if (!result.ok) return { error: result.reason };
      return { redeemed: reward.name, remaining_points: result.remainingPoints };
    }
    case "update_lead_score": {
      const rawDelta = Number(args.delta ?? 0);
      const reason = String(args.reason ?? "").trim();
      if (!Number.isFinite(rawDelta) || !reason) return { error: "delta and reason are required" };
      const delta = Math.max(-MAX_LEAD_SCORE_DELTA, Math.min(MAX_LEAD_SCORE_DELTA, Math.round(rawDelta)));

      const customer = await getCustomer(db, customer_id);
      if (!customer) return { error: "Customer not found" };

      await createLeadScoreEvent(db, { tenant_id, customer_id, delta, reason });
      const updated = await updateCustomerLeadScore(db, customer_id, customer.lead_score + delta);
      return { lead_score: updated.lead_score, applied_delta: delta };
    }
    case "reserve_stock": {
      const sku = String(args.sku ?? "");
      const rawQty = Number(args.qty ?? 0);
      if (!Number.isFinite(rawQty) || rawQty < 1) return { error: "qty must be a positive number" };
      if (rawQty > RESERVE_STOCK_MAX_QTY) return { error: `Can only hold up to ${RESERVE_STOCK_MAX_QTY} units at a time` };

      const product = await getProductBySku(db, tenant_id, sku);
      if (!product) return { error: `No product found with SKU ${sku}` };
      const available = await availableStock(db, product.id, product.stock);
      if (available < rawQty) return { error: `Only ${available} of ${sku} available to hold` };

      const hold = await createStockHold(db, {
        tenant_id,
        product_id: product.id,
        qty: rawQty,
        customer_id,
        holdMinutes: RESERVE_STOCK_HOLD_MINUTES,
      });
      return { held_qty: rawQty, sku, expires_at: hold.expires_at, hold_minutes: RESERVE_STOCK_HOLD_MINUTES };
    }
    case "apply_promo": {
      const code = String(args.code ?? "").trim();
      if (!code) return { error: "code is required" };
      const customer = await getCustomer(db, customer_id);
      if (!customer) return { error: "Customer not found" };
      // No order exists yet at this point — validated against a
      // hypothetical zero order total, so min_order_amount is re-checked
      // for real by create_order once the actual items are known.
      const validation = await validatePromoCode(db, tenant_id, customer_id, code, 0);
      if (!validation.ok || !validation.promoTerm) return { error: validation.reason ?? "Invalid promo code" };
      return {
        code,
        discount_type: validation.promoTerm.discount_type,
        discount_value: validation.promoTerm.discount_value,
        min_order_amount: validation.promoTerm.min_order_amount,
      };
    }
    case "redeem_points": {
      const order_id = String(args.order_id ?? "");
      const points = Number(args.points ?? 0);
      if (!order_id || !Number.isFinite(points) || points < 1) return { error: "order_id and a positive points amount are required" };

      const result = await redeemPointsForOrderDiscount(db, tenant_id, customer_id, order_id, Math.round(points));
      if (!result.ok) return { error: result.reason };
      return {
        order_id: result.order.id,
        points_redeemed: points,
        discount_amount: result.discountAmount,
        new_total: result.order.total_amount,
        remaining_points: result.remainingPoints,
      };
    }
    case "enroll_member": {
      const updated = await enrollCustomerInLoyaltyProgram(db, customer_id);
      return { enrolled: true, loyalty_opt_in_at: updated.loyalty_opt_in_at };
    }
    default:
      return { error: `Unknown tool ${name}` };
  }
}
