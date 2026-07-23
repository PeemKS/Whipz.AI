import { NextRequest, NextResponse } from "next/server";
import { getChannelAdapter } from "@/lib/channels/registry";
import { signState } from "@/lib/channels/state";
import { getCurrentTenant } from "@/lib/dashboard/currentTenant";
import type { Channel } from "@/lib/supabase/types";

export async function GET(req: NextRequest, { params }: { params: Promise<{ channel: string }> }) {
  const { channel } = await params;
  const adapter = getChannelAdapter(channel as Channel);
  if (!adapter || adapter.connectionMethod !== "oauth") {
    return NextResponse.json({ error: `"${channel}" isn't an OAuth-connectable channel` }, { status: 400 });
  }

  const { tenant } = await getCurrentTenant();
  if (!tenant) {
    return NextResponse.json({ error: "No current tenant — sign in first" }, { status: 401 });
  }

  const baseUrl = process.env.APP_BASE_URL;
  if (!baseUrl) {
    return NextResponse.json({ error: "Missing APP_BASE_URL env var" }, { status: 500 });
  }

  const redirectUri = `${baseUrl}/api/oauth/${channel}/callback`;
  const state = signState(tenant.id);
  return NextResponse.redirect(adapter.getAuthorizeUrl(state, redirectUri));
}
