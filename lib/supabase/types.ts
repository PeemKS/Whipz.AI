export type LlmProvider = "platform" | "byok";
export type TenantRole = "owner" | "admin" | "member";
export type Channel = "facebook" | "instagram" | "tiktok" | "line" | "playground";
export type PromotionStatus = "draft" | "scheduled" | "active" | "expired" | "paused";
export type ConversationStatus = "open" | "closed";
export type MessageSender = "customer" | "bot" | "human";
export type OrderStatus = "pending" | "paid" | "cancelled";

export const WEEK_DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export type WeekDay = (typeof WEEK_DAYS)[number];

export interface DayHours {
  open: string;
  close: string;
  closed: boolean;
}

export type OpeningHours = Partial<Record<WeekDay, DayHours>>;

export interface Tenant {
  id: string;
  business_name: string;
  verified_at: string | null;
  llm_provider: LlmProvider;
  llm_api_key_enc: string | null;
  llm_model: string | null;
  category: string | null;
  address: string | null;
  phone: string | null;
  website: string | null;
  description: string | null;
  logo_url: string | null;
  opening_hours: OpeningHours;
  v3_threshold_amount: number;
  monthly_token_budget: number | null;
  created_at: string;
  updated_at: string;
}

export interface TenantMember {
  id: string;
  tenant_id: string;
  user_id: string;
  role: TenantRole;
  created_at: string;
}

export interface Product {
  id: string;
  tenant_id: string;
  sku: string;
  name: string;
  price: number;
  variants: unknown[];
  stock: number;
  images: unknown[];
  category: string | null;
  description: string | null;
  embedding: number[] | null;
  document_name: string | null;
  document_path: string | null;
  document_text: string | null;
  created_at: string;
  updated_at: string;
}

export interface Promotion {
  id: string;
  tenant_id: string;
  product_id: string | null;
  type: string;
  start_at: string;
  end_at: string;
  status: PromotionStatus;
  manual_override: PromotionStatus | null;
  priority: number;
  stackable: boolean;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  tenant_id: string;
  display_name: string | null;
  avatar_url: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  membership_tier_id: string | null;
  loyalty_points: number;
  total_spent: number;
  birth_date: string | null;
  marketing_consent: boolean;
  shipping_address: string | null;
  lead_score: number;
  last_order_at: string | null;
  loyalty_opt_in: boolean;
  loyalty_opt_in_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MembershipTier {
  id: string;
  tenant_id: string;
  name: string;
  min_spend: number;
  point_multiplier: number;
  perks: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Reward {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  points_cost: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type LoyaltyTransactionType = "earn" | "redeem" | "adjust";

export interface LoyaltyTransaction {
  id: string;
  tenant_id: string;
  customer_id: string;
  type: LoyaltyTransactionType;
  points: number;
  reason: string;
  order_id: string | null;
  reward_id: string | null;
  created_at: string;
}

export interface CustomerChannelIdentity {
  id: string;
  tenant_id: string;
  customer_id: string;
  channel: Channel;
  external_user_id: string;
  raw_profile: Record<string, unknown>;
  created_at: string;
}

export interface Conversation {
  id: string;
  tenant_id: string;
  customer_id: string;
  channel: Channel;
  status: ConversationStatus;
  agent_id: string | null;
  agent_locked: boolean;
  human_takeover: boolean;
  handoff_reason: string | null;
  tool_call_count: number;
  created_at: string;
  updated_at: string;
}

export interface Agent {
  id: string;
  tenant_id: string;
  name: string;
  specialization: string;
  system_prompt: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  tenant_id: string;
  conversation_id: string;
  sender: MessageSender;
  content: string;
  external_message_id: string | null;
  created_at: string;
}

export type AgentActionKind = "tool_call" | "routing_decision" | "l1_cache_hit" | "escalation" | "crm_event" | "completion";
export type AgentActionLayer = "l1" | "l2" | "l3";

export interface AgentAction {
  id: string;
  tenant_id: string;
  conversation_id: string | null;
  customer_id: string | null;
  kind: AgentActionKind;
  tool_name: string | null;
  args: Record<string, unknown> | null;
  result: Record<string, unknown> | null;
  layer: AgentActionLayer | null;
  model: string | null;
  tokens_used: number | null;
  latency_ms: number | null;
  created_at: string;
}

export interface LeadScoreEvent {
  id: string;
  tenant_id: string;
  customer_id: string;
  conversation_id: string | null;
  delta: number;
  reason: string;
  created_at: string;
}

export type LifecycleStage = "lead" | "new" | "active" | "at_risk" | "churned" | "won_back";

export type RfmSegment = "champions" | "loyal" | "promising" | "at_risk_big_spenders" | "hibernating" | "other";

export type StockHoldStatus = "active" | "released" | "consumed";

export interface StockHold {
  id: string;
  tenant_id: string;
  product_id: string;
  qty: number;
  customer_id: string | null;
  conversation_id: string | null;
  status: StockHoldStatus;
  created_at: string;
  expires_at: string;
}

export interface FaqCacheEntry {
  id: string;
  tenant_id: string;
  question: string;
  question_embedding: number[] | null;
  answer: string;
  hit_count: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChannelConnection {
  id: string;
  tenant_id: string;
  channel: Channel;
  external_page_id: string;
  access_token_enc: string;
  webhook_secret_enc: string | null;
  created_at: string;
}

export interface OrderItem {
  sku: string;
  qty: number;
  price: number;
}

export interface Order {
  id: string;
  tenant_id: string;
  customer_id: string;
  items: OrderItem[];
  total_amount: number;
  status: OrderStatus;
  promo_term_id: string | null;
  discount_amount: number;
  points_redeemed: number;
  created_at: string;
  updated_at: string;
}

export type PromoDiscountType = "percent" | "fixed";

export interface PromoTerm {
  id: string;
  tenant_id: string;
  promotion_id: string | null;
  code: string;
  discount_type: PromoDiscountType;
  discount_value: number;
  max_uses_per_customer: number | null;
  min_order_amount: number | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PromoRedemption {
  id: string;
  tenant_id: string;
  promo_term_id: string;
  customer_id: string;
  order_id: string | null;
  discount_amount: number;
  created_at: string;
}
