import { NextRequest, NextResponse } from "next/server";
import { getChannelAdapter } from "@/lib/channels/registry";
import { verifyState } from "@/lib/channels/state";
import { supabaseServerAuth } from "@/lib/supabase/serverAuth";
import { upsertChannelConnection } from "@/lib/db/channelConnections";
import { encryptSecret } from "@/lib/crypto/tenantKey";
import type { Channel } from "@/lib/supabase/types";

export async function GET(req: NextRequest, { params }: { params: Promise<{ channel: string }> }) {
  const { channel } = await params;
  const adapter = getChannelAdapter(channel as Channel);
  if (!adapter || adapter.connectionMethod !== "oauth") {
    return NextResponse.json({ error: `"${channel}" isn't an OAuth-connectable channel` }, { status: 400 });
  }

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const providerError = req.nextUrl.searchParams.get("error");
  if (providerError) {
    return NextResponse.redirect(
      new URL(`/dashboard/settings/channels?error=${encodeURIComponent(providerError)}`, req.url)
    );
  }
  if (!code || !state) {
    return NextResponse.json({ error: "Missing code or state" }, { status: 400 });
  }

  const tenant_id = verifyState(state);
  if (!tenant_id) {
    return NextResponse.json({ error: "Invalid or expired state" }, { status: 400 });
  }

  const baseUrl = process.env.APP_BASE_URL;
  if (!baseUrl) {
    return NextResponse.json({ error: "Missing APP_BASE_URL env var" }, { status: 500 });
  }
  const redirectUri = `${baseUrl}/api/oauth/${channel}/callback`;

  try {
    const { external_page_id, access_token, webhook_secret } = await adapter.exchangeCode(code, redirectUri);

    const db = await supabaseServerAuth();
    await upsertChannelConnection(db, {
      tenant_id,
      channel: channel as Channel,
      external_page_id,
      access_token_enc: encryptSecret(access_token),
      webhook_secret_enc: webhook_secret ? encryptSecret(webhook_secret) : null,
    });

    return NextResponse.redirect(new URL("/dashboard/settings/channels?connected=" + channel, req.url));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.redirect(new URL(`/dashboard/settings/channels?error=${encodeURIComponent(message)}`, req.url));
  }
}
