import type { SupabaseClient } from "@supabase/supabase-js";
import type OpenAI from "openai";
import type { ChatCompletionTool } from "@/lib/llm/client";
import type { Agent } from "@/lib/supabase/types";
import { matchAgents } from "@/lib/db/agents";

// Picks the best-matching specialized agent for an incoming message,
// or null to fall back to the tenant's default agent. Routing is
// purely AI-judged against each agent's free-text `specialization` —
// no rigid product-id/customer-tag scoping — so a tenant can target an
// agent at "sneakers and footwear" or "VIP repeat customers" just by
// describing it, and the retrieved product context + customer profile
// passed in here give the router enough signal to judge fit.
export async function pickAgent(
  client: OpenAI,
  model: string,
  agents: Agent[],
  context: { userMessage: string; productSummary: string; customerSummary: string }
): Promise<Agent | null> {
  if (agents.length === 0) return null;

  const pickTool: ChatCompletionTool = {
    type: "function",
    function: {
      name: "pick_agent",
      description: "Choose which specialized agent should handle this message, or 'default' if none clearly fit.",
      parameters: {
        type: "object",
        properties: {
          agent_id: { type: "string", enum: [...agents.map((a) => a.id), "default"] },
        },
        required: ["agent_id"],
      },
    },
  };

  const agentList = agents.map((a) => `- id=${a.id} "${a.name}": ${a.specialization}`).join("\n");
  const systemPrompt = [
    "You route incoming customer messages to the best-matching specialized agent for this business.",
    "Available agents:",
    agentList,
    "Pick 'default' if the message doesn't clearly match any agent's specialization.",
  ].join("\n");

  const userContent = [
    `Customer message: ${context.userMessage}`,
    context.productSummary ? `Relevant products: ${context.productSummary}` : "",
    context.customerSummary ? `Customer profile: ${context.customerSummary}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const completion = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ],
    tools: [pickTool],
    tool_choice: { type: "function", function: { name: "pick_agent" } },
  });

  const call = completion.choices[0]?.message?.tool_calls?.[0];
  if (call?.type !== "function") return null;

  try {
    const { agent_id } = JSON.parse(call.function.arguments) as { agent_id?: string };
    return agents.find((a) => a.id === agent_id) ?? null;
  } catch {
    return null;
  }
}

// Tuned heuristically — not derived from a labeled dataset. Revisit if
// routing starts feeling wrong in practice: raise CONFIDENT_SIMILARITY
// if unrelated agents get picked, raise CONFIDENT_MARGIN if the router
// flip-flops between two close specializations.
const CONFIDENT_SIMILARITY = 0.55;
const CONFIDENT_MARGIN = 0.05;

export interface RouteAgentResult {
  agent: Agent | null;
  // Whether the embedding-similarity fast path resolved this cleanly —
  // false means it fell back to the LLM tool-call router (or there was
  // nothing to be confident about). Consumed by lib/agents/escalation.ts
  // as a "this situation isn't routine" signal — but only meaningful
  // when there were 2+ agents to actually choose between, so 0/1-agent
  // tenants report confident:true (nothing was ambiguous).
  confident: boolean;
}

// Per-turn routing entry point. Tries a free embedding-similarity match
// first — reusing the message embedding already computed for product RAG
// search each turn, so the common case costs zero extra LLM calls — and
// only falls back to the LLM tool-call router (pickAgent) when the
// embedding match is missing or ambiguous (ties, nothing embedded yet
// because the tenant added an agent before setting an LLM key, or the
// tenant's vendor has no embeddings API at all — queryEmbedding is null).
export async function routeAgent(
  db: SupabaseClient,
  client: OpenAI,
  model: string,
  tenant_id: string,
  agents: Agent[],
  queryEmbedding: number[] | null,
  context: { userMessage: string; productSummary: string; customerSummary: string }
): Promise<RouteAgentResult> {
  if (agents.length === 0) return { agent: null, confident: true };
  if (agents.length === 1) return { agent: agents[0], confident: true };

  const candidates = queryEmbedding ? await matchAgents(db, tenant_id, queryEmbedding, agents.length) : [];
  const [top, runnerUp] = candidates;
  const confident = Boolean(top) && top.similarity >= CONFIDENT_SIMILARITY && top.similarity - (runnerUp?.similarity ?? 0) >= CONFIDENT_MARGIN;

  if (confident) {
    return { agent: agents.find((a) => a.id === top.id) ?? null, confident: true };
  }

  return { agent: await pickAgent(client, model, agents, context), confident: false };
}
