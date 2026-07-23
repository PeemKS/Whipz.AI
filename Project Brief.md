# Project Specification: Omnichannel AI Agent & CRM Commerce Platform

This document serves as the master technical specification and implementation prompt for building the **Omnichannel AI Agent & CRM Commerce Platform** using **Next.js (Vercel), Supabase (PostgreSQL), and Qwen 3.7 Plus (via Fireworks/Alibaba Cloud/OpenRouter)**.

---

## 🏗️ 1. Technical Architecture Overview

The system is a multi-agent, serverless conversational commerce platform that connects to Facebook, Instagram, LINE, and TikTok Shop.

*   **Frontend & API Gateway:** Next.js (Vercel Serverless)
*   **Database & Vector Storage:** Supabase (PostgreSQL with `pgvector` enabled for RAG)
*   **Core LLM Engine:** Qwen 3.7 Plus (Supports Deep Reasoning, Multimodal Slip Verification, and Function Calling)
*   **Multi-Agent Orchestration:** Stateful Router-Worker flow (using LangGraph-like state or database-driven routing)

---

## 🗄️ 2. Database Schema (Supabase PostgreSQL)

Apply the following SQL schema to set up the relational database for shops, customers, agents, products, and orders.

```sql
-- Enable Vector Extension for RAG
create extension if dnd_exists vector;

-- 1. Shops / Tenants
create table public.shops (
    id uuid default gen_random_uuid() primary key,
    shop_name text not null,
    api_key_settings jsonb default '{}'::jsonb, -- Store customer's own LLM API Keys (BYOK)
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Agents Configuration
create table public.agents (
    id uuid default gen_random_uuid() primary key,
    shop_id uuid not null references public.shops(id) on delete cascade,
    agent_name text not null,
    role_type text not null,        -- 'router', 'sales', 'support', 'tracking', 'retention'
    system_prompt text not null,    -- Personality & constraints instructions
    is_active boolean default true,
    model_name text default 'qwen3.7-plus',
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Agent Knowledge Base (for RAG)
create table public.agent_knowledge (
    id uuid default gen_random_uuid() primary key,
    agent_id uuid not null references public.agents(id) on delete cascade,
    file_path text,                 -- URL to file in Supabase Storage
    plain_text_faq text,            -- FAQ Q&A content typed by admin
    embedding vector(1536),         -- Vector representation for semantic search
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. CRM & Customer Profiles
create table public.customers (
    id uuid default gen_random_uuid() primary key,
    shop_id uuid not null references public.shops(id) on delete cascade,
    platform_uid text not null,     -- User ID from Facebook/LINE/IG
    platform_source text not null,  -- 'facebook', 'instagram', 'line', 'tiktok'
    display_name text,
    phone text,
    shipping_address text,
    customer_tags text[] default '{}'::text[], -- e.g., ['VIP', 'ชอบสีพาสเทล']
    is_member boolean default false,
    member_points int default 0,
    birth_date date,
    member_tier text default 'Silver',
    total_spent numeric default 0.00,
    total_orders int default 0,
    ai_summary text,                -- Automated summary updated by Qwen 3.7 Plus
    current_agent_assigned uuid references public.agents(id),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(shop_id, platform_source, platform_uid)
);

-- 5. Inventory & Products
create table public.products (
    id uuid default gen_random_uuid() primary key,
    shop_id uuid not null references public.shops(id) on delete cascade,
    sku text not null,
    product_name text not null,
    stock_qty int not null default 0,
    price numeric not null,
    unique(shop_id, sku)
);

-- 6. Orders & Transactions
create table public.orders (
    id uuid default gen_random_uuid() primary key,
    customer_id uuid not null references public.customers(id) on delete cascade,
    items jsonb not null,            -- [ { "sku": "TSHIRT-RED-L", "qty": 1, "price": 390 } ]
    total_amount numeric not null,
    payment_status text default 'pending'::text, -- 'pending', 'paid', 'cancelled'
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);