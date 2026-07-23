import { getCurrentTenant } from "@/lib/dashboard/currentTenant";
import { supabaseServerAuth } from "@/lib/supabase/serverAuth";
import { getChannelConnection } from "@/lib/db/channelConnections";
import { CONNECTABLE_CHANNELS } from "@/lib/channels/registry";
import { getChannelAdapter } from "@/lib/channels/registry";
import { getT } from "@/lib/i18n/getT";
import { format } from "@/lib/i18n/format";
import { ChannelCard } from "@/app/dashboard/settings/channels/ChannelCard";

export default async function ChannelsSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>;
}) {
  const { tenant } = await getCurrentTenant();
  if (!tenant) return null;
  const { connected, error } = await searchParams;
  const db = await supabaseServerAuth();
  const t = await getT();
  const ch = t.channels;

  const rows = await Promise.all(
    CONNECTABLE_CHANNELS.map(async (channel) => {
      const adapter = getChannelAdapter(channel)!;
      const connection = await getChannelConnection(db, tenant.id, channel);
      return { channel, adapter, connection };
    })
  );

  return (
    <div className="space-y-4 max-w-2xl">
      {connected && (
        <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-sm">
          {format(ch.connectedSuccess, { channel: connected })}
        </div>
      )}
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm">{format(ch.connectionFailed, { error })}</div>
      )}

      {rows.map(({ channel, adapter, connection }) => (
        <ChannelCard
          key={channel}
          displayName={adapter.displayName}
          connected={!!connection}
          connectedLabel={ch.connected}
          notConnectedLabel={ch.notConnected}
          externalPageId={connection?.external_page_id}
          connectionId={connection?.id}
          connectHref={adapter.connectionMethod === "oauth" ? `/api/oauth/${channel}/start` : undefined}
          manualFields={adapter.connectionMethod === "manual" ? adapter.manualFields : undefined}
          tenantId={tenant.id}
          channel={channel}
          connectLabel={t.common.connect}
          disconnectLabel={t.common.disconnect}
          cancelLabel={t.common.cancel}
        />
      ))}
    </div>
  );
}
