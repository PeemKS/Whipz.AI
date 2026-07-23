import type { SupabaseClient } from "@supabase/supabase-js";
import {
  llmClientFor,
  vendorForModel,
  defaultModelFor,
  vendorSupportsEmbeddings,
  type ChatCompletionMessageParam,
} from "@/lib/llm/client";
import { embedText } from "@/lib/llm/embeddings";
import { searchProducts } from "@/lib/db/products";
import { listMessages, createMessage } from "@/lib/db/messages";
import { getTenant } from "@/lib/db/tenants";
import { getCustomer } from "@/lib/db/customers";
import { getConversation, setConversationAgent, setHumanTakeover } from "@/lib/db/conversations";
import { listActiveAgents } from "@/lib/db/agents";
import { listActivePromotions } from "@/lib/db/promotions";
import { listOrdersForCustomer } from "@/lib/db/orders";
import { getMembershipTier, listMembershipTiers } from "@/lib/db/membershipTiers";
import { routeAgent } from "@/lib/agents/pickAgent";
import { runTool, agentTools, imageTools } from "@/lib/agents/tools";
import { shouldEscalateToL3 } from "@/lib/agents/escalation";
import { checkHumanHandoffTriggers } from "@/lib/agents/humanHandoff";
import { checkTokenBudget } from "@/lib/agents/rateLimits";
import { funnelStageForLifecycle, stageGoalBlock, escalationInstructionBlock } from "@/lib/agents/stagePrompts";
import { computeLifecycleStage } from "@/lib/lifecycle/stage";
import { decryptSecret } from "@/lib/crypto/tenantKey";
import { logAgentAction } from "@/lib/db/agentActions";
import { incrementToolCallCount } from "@/lib/db/conversations";
import { matchFaqCache, incrementFaqHitCount } from "@/lib/db/faqCache";
import type { Agent, Tenant } from "@/lib/supabase/types";
import { WEEK_DAYS } from "@/lib/supabase/types";

const MAX_TOOL_ROUNDS = 4;

// Safety-checklist caps (funnel-aware-agent blueprint §9): a ceiling
// enforced in code, never left to the prompt. Per-turn resets every
// call; per-session is a running total on the conversation row so it
// holds across the customer's whole thread, not just this message.
const MAX_TOOL_CALLS_PER_TURN = 5;
const MAX_TOOL_CALLS_PER_SESSION = 30;
const TOOL_LIMIT_REPLY = "I've hit my limit of actions for this conversation — a team member will follow up shortly.";
const HUMAN_HANDOFF_REPLY = "I'm connecting you with a team member who can help with this — they'll be with you shortly.";
const BUDGET_EXCEEDED_REPLY = "I'm temporarily unavailable — please contact the business directly, or try again soon.";

// L1 substitute for the blueprint's "near-zero-cost" layer — no channel
// here supports interactive buttons/menus, so this embedding-similarity
// FAQ cache is what actually carries that traffic. The blueprint's
// suggested 0.92 turned out too strict in practice — two real Thai
// phrasings of "is shipping free?" measured 0.84 cosine similarity, well
// below it. Lowered to 0.85: still a "near-duplicate" band (not a topic
// match), but tolerant of the paraphrase gap real customers actually
// produce. Add distinct phrasings as separate entries rather than
// lowering this further — that's a safer way to widen coverage than
// loosening the bar (a lower threshold risks confidently serving a
// cached answer to a genuinely different question).
const FAQ_CACHE_SIMILARITY_THRESHOLD = 0.85;

export interface RunTurnResult {
  reply: string;
  toolCalls: { name: string; args: Record<string, unknown>; result: Record<string, unknown> }[];
  images: string[];
}

// Kept short — this goes into every turn's system prompt for every
// matched product, so the full (up to 20k-char) document isn't dumped
// in wholesale.
const DOCUMENT_PROMPT_EXCERPT = 1500;

function openingHoursLine(tenant: Tenant): string | null {
  const lines = WEEK_DAYS.map((day) => {
    const hours = tenant.opening_hours[day];
    if (!hours) return null;
    return `${day}: ${hours.closed ? "closed" : `${hours.open}-${hours.close}`}`;
  }).filter((line): line is string => line !== null);
  return lines.length > 0 ? lines.join(", ") : null;
}

function systemPromptFor(businessName: string): string {
  return [
    `You are the AI shopping assistant for "${businessName}".`,
    "Help customers find products, check stock and pricing, and place orders.",
    "Use the provided product context when relevant. Only call create_order after the customer has explicitly confirmed the exact items and quantities they want to buy.",
    "Be concise and friendly.",
  ].join(" ");
}

// Included for every agent (default or specialist) since address/hours/
// contact info are relevant regardless of which specialist is handling
// the conversation.
function businessInfoBlock(tenant: Tenant): string {
  const hours = openingHoursLine(tenant);
  const lines = [
    tenant.category ? `Category: ${tenant.category}.` : null,
    tenant.description ? `About: ${tenant.description}` : null,
    tenant.address ? `Address: ${tenant.address}.` : null,
    tenant.phone ? `Phone: ${tenant.phone}.` : null,
    tenant.website ? `Website: ${tenant.website}.` : null,
    hours ? `Opening hours: ${hours}.` : null,
  ].filter((line): line is string => line !== null);
  return lines.length > 0 ? `\nBusiness info:\n${lines.join(" ")}` : "";
}

export async function runConversationTurn(
  db: SupabaseClient,
  tenant_id: string,
  conversation_id: string,
  customer_id: string,
  userMessage: string
): Promise<RunTurnResult> {
  const tenant = await getTenant(db, tenant_id);
  if (!tenant) throw new Error(`Tenant ${tenant_id} not found`);
  if (!tenant.llm_api_key_enc) {
    throw new Error(`Tenant "${tenant.business_name}" has no LLM API key configured — set one in Settings.`);
  }

  const vendor = vendorForModel(tenant.llm_model);
  const model = tenant.llm_model ?? defaultModelFor(vendor);
  const apiKey = decryptSecret(tenant.llm_api_key_enc);
  const client = llmClientFor(vendor, apiKey);

  await createMessage(db, { tenant_id, conversation_id, sender: "customer", content: userMessage });

  // Checked before any paid work (embeddings, completions) — a tenant
  // with no budget set (the default) always passes through unaffected.
  const budget = await checkTokenBudget(db, tenant_id, tenant.monthly_token_budget);
  if (budget.overBudget) {
    await logAgentAction(db, {
      tenant_id,
      conversation_id,
      customer_id,
      kind: "crm_event",
      result: { type: "token_budget_exceeded", used: budget.used, budget: budget.budget },
    });
    await createMessage(db, { tenant_id, conversation_id, sender: "bot", content: BUDGET_EXCEEDED_REPLY });
    return { reply: BUDGET_EXCEEDED_REPLY, toolCalls: [], images: [] };
  }

  // Not every vendor has an embeddings API (Kimi/Moonshot doesn't), and
  // even a vendor that does may reject the call for account-specific
  // reasons (key restrictions, unactivated embedding model, etc.). Either
  // way this must degrade to "skip RAG for this turn" rather than crash
  // the whole reply — a broken embeddings call shouldn't block chat.
  let queryEmbedding: number[] | null = null;
  if (vendorSupportsEmbeddings(vendor)) {
    try {
      queryEmbedding = await embedText(userMessage, apiKey);
    } catch (err) {
      console.error(`embedText failed for tenant ${tenant_id}, continuing without RAG context:`, err);
    }
  }
  // L1: an FAQ cache hit skips RAG, agent routing, and the completion
  // call entirely — the whole point of this layer being "near-zero cost".
  if (queryEmbedding) {
    const cacheMatch = await matchFaqCache(db, tenant_id, queryEmbedding);
    if (cacheMatch && cacheMatch.similarity >= FAQ_CACHE_SIMILARITY_THRESHOLD) {
      await incrementFaqHitCount(db, cacheMatch.id);
      await logAgentAction(db, {
        tenant_id,
        conversation_id,
        customer_id,
        kind: "l1_cache_hit",
        layer: "l1",
        result: { faq_id: cacheMatch.id, question: cacheMatch.question, similarity: cacheMatch.similarity },
      });
      await createMessage(db, { tenant_id, conversation_id, sender: "bot", content: cacheMatch.answer });
      return { reply: cacheMatch.answer, toolCalls: [], images: [] };
    }
  }

  // Independent lookups, parallelized (Phase 6) — none of these four
  // depend on each other's result.
  const [products, promotions, conversation, customer] = await Promise.all([
    queryEmbedding ? searchProducts(db, tenant_id, queryEmbedding, 4) : Promise.resolve([]),
    listActivePromotions(db, tenant_id),
    getConversation(db, conversation_id),
    getCustomer(db, customer_id),
  ]);
  if (!conversation) throw new Error(`Conversation ${conversation_id} not found`);

  const productBlock = products
    .map((p) => {
      const base = `- ${p.name} (SKU ${p.sku}): ${p.price}, ${p.stock} in stock${p.description ? ` — ${p.description}` : ""}`;
      const doc = p.document_text ? `\n  Reference doc excerpt: ${p.document_text.slice(0, DOCUMENT_PROMPT_EXCERPT)}` : "";
      return base + doc;
    })
    .join("\n");

  const promotionBlock = promotions
    .map((p) => `- ${p.type} (${p.product_name ?? "all products"}), ends ${p.end_at}${p.stackable ? ", stackable" : ""}`)
    .join("\n");

  // Re-routed every turn (not just once) so a conversation can hand off
  // between specialists as the topic shifts. The common case is cheap:
  // routeAgent tries an embedding-similarity match first, reusing
  // queryEmbedding above, and only calls the LLM router when that's
  // ambiguous — see lib/agents/pickAgent.ts.
  const activeAgents = await listActiveAgents(db, tenant_id);
  let agent: Agent | null = null;
  let routingWasConfident = true;
  if (activeAgents.length > 0) {
    const routed = await routeAgent(db, client, model, tenant_id, activeAgents, queryEmbedding, {
      userMessage,
      productSummary: productBlock,
      customerSummary: customer?.notes ?? "",
    });
    agent = routed.agent;
    routingWasConfident = routed.confident;
  }
  if (agent?.id !== conversation.agent_id) {
    await setConversationAgent(db, conversation_id, agent?.id ?? null);
  }
  await logAgentAction(db, {
    tenant_id,
    conversation_id,
    customer_id,
    kind: "routing_decision",
    layer: "l2",
    model,
    result: { agent_id: agent?.id ?? null, agent_name: agent?.name ?? "default" },
  });

  // Funnel-stage-aware prompting + L3 escalation (see lib/agents/
  // stagePrompts.ts and lib/agents/escalation.ts for the reasoning
  // behind every judgment call here — the blueprint's stages/triggers
  // needed real interpretation to map onto data this app actually has).
  const [customerOrders, tenantTiers] = await Promise.all([
    listOrdersForCustomer(db, customer_id),
    listMembershipTiers(db, tenant_id),
  ]);
  const lifecycleStage = computeLifecycleStage(customerOrders);
  const customerTier = customer?.membership_tier_id ? await getMembershipTier(db, customer.membership_tier_id) : null;
  const tenantTiersBySpendDesc = [...tenantTiers].sort((a, b) => Number(b.min_spend) - Number(a.min_spend));
  const pendingOrders = customerOrders.filter((o) => o.status === "pending");

  const escalation = customer
    ? shouldEscalateToL3({
        userMessage,
        customer,
        customerTier,
        tenantTiersBySpendDesc,
        pendingOrders,
        lifecycleStage,
        routingWasConfident,
        v3ThresholdAmount: Number(tenant.v3_threshold_amount),
      })
    : { escalate: false, reasons: [] };
  const layer: "l2" | "l3" = escalation.escalate ? "l3" : "l2";
  if (escalation.escalate) {
    await logAgentAction(db, {
      tenant_id,
      conversation_id,
      customer_id,
      kind: "escalation",
      layer: "l3",
      model,
      result: { reasons: escalation.reasons },
    });
  }

  // Human handoff — checked before any LLM call, since an explicit
  // request/legal-safety/refund-dispute situation shouldn't wait on a
  // reply first. setHumanTakeover(true) is the same primitive the Inbox
  // UI's manual takeover uses (lib/db/conversations.ts) — the entry
  // points (chat/webhook routes) already gate on this flag for the
  // *next* incoming message, so nothing else needs to change to honor it.
  const mostRecentOrderAmount = customerOrders.length > 0 ? Number(customerOrders[0].total_amount) : 0;
  const handoff = checkHumanHandoffTriggers({
    userMessage,
    consecutiveToolFailures: 0,
    mostRecentOrderAmount,
    v3ThresholdAmount: Number(tenant.v3_threshold_amount),
  });
  if (handoff.handoff) {
    await setHumanTakeover(db, conversation_id, true, handoff.reasons.join(","));
    await logAgentAction(db, {
      tenant_id,
      conversation_id,
      customer_id,
      kind: "escalation",
      layer: "l3",
      model,
      result: { type: "human_handoff", reasons: handoff.reasons },
    });
    await createMessage(db, { tenant_id, conversation_id, sender: "bot", content: HUMAN_HANDOFF_REPLY });
    return { reply: HUMAN_HANDOFF_REPLY, toolCalls: [], images: [] };
  }

  // Escalated turns get a longer history window — more context to work
  // with for a situation that needs extra care, same model either way
  // (see lib/llm/client.ts — no separate small/large tier exists).
  const history = await listMessages(db, conversation_id, escalation.escalate ? 40 : 20);
  const historyMessages: ChatCompletionMessageParam[] = history.map((m) => ({
    role: m.sender === "customer" ? "user" : "assistant",
    content: m.content,
  }));
  const isFirstMessageEver = history.length <= 1;
  const funnelStage = funnelStageForLifecycle(lifecycleStage, isFirstMessageEver);

  const systemPrompt = [
    agent ? agent.system_prompt : systemPromptFor(tenant.business_name),
    businessInfoBlock(tenant),
    `\n${stageGoalBlock(funnelStage)}`,
    escalation.escalate ? `\n${escalationInstructionBlock(escalation.reasons)}` : "",
    productBlock ? `\nRelevant products:\n${productBlock}` : "",
    promotionBlock ? `\nActive promotions:\n${promotionBlock}` : "",
  ].join("\n");

  const messages: ChatCompletionMessageParam[] = [{ role: "system", content: systemPrompt }, ...historyMessages];

  // Sending real image attachments requires per-channel Send API work
  // (Facebook/Instagram/LINE/TikTok) that hasn't been built yet — only
  // the Playground can actually render images inline today, so that's
  // the only channel offered the tool.
  const tools = conversation.channel === "playground" ? [...agentTools, ...imageTools] : agentTools;

  const toolCalls: RunTurnResult["toolCalls"] = [];
  const images: string[] = [];
  let toolCallsThisTurn = 0;
  let sessionToolCallCount = conversation.tool_call_count;
  let consecutiveToolFailures = 0;

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const roundStart = Date.now();
    const completion = await client.chat.completions.create({
      model,
      messages,
      tools,
    });
    const latencyMs = Date.now() - roundStart;
    const tokensUsed = completion.usage?.total_tokens ?? null;

    // One row per LLM round, whatever it produced — this is what makes
    // "cost per conversation" (Phase 6) accurate. Previously only rounds
    // that made a tool call got logged, silently undercounting every
    // plain-text reply.
    await logAgentAction(db, {
      tenant_id,
      conversation_id,
      customer_id,
      kind: "completion",
      layer,
      model,
      tokens_used: tokensUsed,
      latency_ms: latencyMs,
    });

    const choice = completion.choices[0];
    const msg = choice.message;

    if (!msg.tool_calls || msg.tool_calls.length === 0) {
      const reply = msg.content ?? "";
      await createMessage(db, { tenant_id, conversation_id, sender: "bot", content: reply });
      return { reply, toolCalls, images };
    }

    const requestedCalls = msg.tool_calls.filter((call) => call.type === "function");

    // Hard caps enforced here, not in the prompt — a compromised or
    // simply overeager model can't argue its way past this. Abort the
    // turn outright rather than letting the model retry with fewer
    // calls; a human should look at a conversation that's hit this.
    if (
      toolCallsThisTurn + requestedCalls.length > MAX_TOOL_CALLS_PER_TURN ||
      sessionToolCallCount + requestedCalls.length > MAX_TOOL_CALLS_PER_SESSION
    ) {
      await logAgentAction(db, {
        tenant_id,
        conversation_id,
        customer_id,
        kind: "escalation",
        layer: "l2",
        model,
        result: { reason: "tool_call_limit_reached", toolCallsThisTurn, sessionToolCallCount, requested: requestedCalls.length },
      });
      await createMessage(db, { tenant_id, conversation_id, sender: "bot", content: TOOL_LIMIT_REPLY });
      return { reply: TOOL_LIMIT_REPLY, toolCalls, images };
    }

    messages.push({ role: "assistant", content: msg.content, tool_calls: msg.tool_calls });

    for (const call of msg.tool_calls) {
      if (call.type !== "function") continue;
      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(call.function.arguments || "{}");
      } catch {
        // leave args empty on parse failure
      }
      const result = await runTool(db, tenant_id, customer_id, call.function.name, args);
      toolCalls.push({ name: call.function.name, args, result });
      if (call.function.name === "send_product_photos" && Array.isArray(result.images)) {
        images.push(...(result.images as string[]));
      }
      consecutiveToolFailures = "error" in result ? consecutiveToolFailures + 1 : 0;

      // Tokens/latency for this round are already captured on the
      // 'completion' row above — this row is purely the function call's
      // own inputs/outputs, so summing tokens_used per conversation
      // never double-counts across multiple tool calls in one round.
      await logAgentAction(db, {
        tenant_id,
        conversation_id,
        customer_id,
        kind: "tool_call",
        tool_name: call.function.name,
        args,
        result,
        layer,
        model,
      });

      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify(result),
      });

      // Two failed tool calls in a row — the model is stuck (bad SKU,
      // insufficient stock loop, etc.) and probably about to hallucinate
      // its way through rather than admit it. Hand off rather than let
      // it keep guessing (blueprint §3's "two consecutive failed tool
      // calls" trigger).
      if (consecutiveToolFailures >= 2) {
        await setHumanTakeover(db, conversation_id, true, "repeated_tool_failures");
        await logAgentAction(db, {
          tenant_id,
          conversation_id,
          customer_id,
          kind: "escalation",
          layer: "l3",
          model,
          result: { type: "human_handoff", reasons: ["repeated_tool_failures"] },
        });
        await createMessage(db, { tenant_id, conversation_id, sender: "bot", content: HUMAN_HANDOFF_REPLY });
        return { reply: HUMAN_HANDOFF_REPLY, toolCalls, images };
      }
    }

    toolCallsThisTurn += requestedCalls.length;
    sessionToolCallCount = await incrementToolCallCount(db, conversation_id, requestedCalls.length);
  }

  const fallback = "I'm having trouble completing that right now — could you rephrase or try again?";
  await createMessage(db, { tenant_id, conversation_id, sender: "bot", content: fallback });
  return { reply: fallback, toolCalls, images };
}
