import { NextRequest, NextResponse } from "next/server";
import { getChannelAdapter } from "@/lib/channels/registry";
import { verifyState } from "@/lib/channels/state";
import { supabaseServerAuth } from "@/lib/supabase/serverAuth";
import { upsertChannelConnection } from "@/lib/db/channelConnections";
import { encryptSecret } from "@/lib/crypto/tenantKey";
import { encodePendingPick, PENDING_PICK_COOKIE, PENDING_PICK_MAX_AGE_SECONDS } from "@/lib/channels/pendingPick";
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
    const db = await supabaseServerAuth();

    // Multi-target channels (Meta: an account can manage several Pages)
    // — list what's available instead of guessing which one was wanted.
    if (adapter.listPickableTargets && adapter.finalizeTarget) {
      const targets = await adapter.listPickableTargets(code, redirectUri);
      if (targets.length === 0) {
        throw new Error(`No ${adapter.displayName} Page found for this account.`);
      }

      // Exactly one target — nothing to actually choose, skip the picker.
      if (targets.length === 1) {
        const { external_page_id, access_token, webhook_secret } = await adapter.finalizeTarget(targets[0]);
        await upsertChannelConnection(db, {
          tenant_id,
          channel: channel as Channel,
          external_page_id,
          access_token_enc: encryptSecret(access_token),
          webhook_secret_enc: webhook_secret ? encryptSecret(webhook_secret) : null,
        });
        return NextResponse.redirect(new URL("/dashboard/settings/channels?connected=" + channel, req.url));
      }

      const response = NextResponse.redirect(new URL("/dashboard/settings/channels/pick", req.url));
      response.cookies.set(
        PENDING_PICK_COOKIE,
        encodePendingPick({ tenant_id, channel: channel as Channel, targets }),
        { httpOnly: true, secure: true, sameSite: "lax", maxAge: PENDING_PICK_MAX_AGE_SECONDS, path: "/" }
      );
      return response;
    }

    if (!adapter.exchangeCode) {
      throw new Error(`Channel "${channel}" has no OAuth exchange configured.`);
    }
    const { external_page_id, access_token, webhook_secret } = await adapter.exchangeCode(code, redirectUri);
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
