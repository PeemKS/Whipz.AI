"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { connectManualChannelAction, disconnectChannelAction } from "@/app/dashboard/settings/channels/actions";

interface ManualField {
  name: string;
  label: string;
  type?: "password" | "text";
}

export function ChannelCard({
  displayName,
  connected,
  connectedLabel,
  notConnectedLabel,
  externalPageId,
  connectionId,
  connectHref,
  manualFields,
  tenantId,
  channel,
  connectLabel,
  disconnectLabel,
  cancelLabel,
}: {
  displayName: string;
  connected: boolean;
  connectedLabel: string;
  notConnectedLabel: string;
  externalPageId?: string;
  connectionId?: string;
  connectHref?: string;
  manualFields?: ManualField[];
  tenantId: string;
  channel: string;
  connectLabel: string;
  disconnectLabel: string;
  cancelLabel: string;
}) {
  const [open, setOpen] = useState(false);

  function close() {
    setOpen(false);
  }

  return (
    <Card padding="sm">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-medium">{displayName}</h2>
          {connected ? (
            <p className="text-xs text-zinc-500 mt-1">
              {connectedLabel} <span className="font-mono">{externalPageId}</span>
            </p>
          ) : (
            <p className="text-xs text-zinc-500 mt-1">{notConnectedLabel}</p>
          )}
        </div>

        {connected ? (
          <form action={disconnectChannelAction}>
            <input type="hidden" name="id" value={connectionId} />
            <Button type="submit" variant="destructive" size="sm">
              {disconnectLabel}
            </Button>
          </form>
        ) : connectHref ? (
          <Button href={connectHref} variant="secondary" size="sm">
            {connectLabel}
          </Button>
        ) : manualFields ? (
          <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(true)}>
            {connectLabel}
          </Button>
        ) : null}
      </div>

      {!connected && manualFields && (
        <Modal open={open} onClose={close}>
          <div className="p-6">
            <h2 className="font-medium mb-5">
              {connectLabel} {displayName}
            </h2>

            <form
              action={async (formData) => {
                await connectManualChannelAction(formData);
                close();
              }}
              className="space-y-3"
            >
              <input type="hidden" name="tenant_id" value={tenantId} />
              <input type="hidden" name="channel" value={channel} />
              {manualFields.map((field, i) => (
                <div key={field.name}>
                  <label className="text-xs text-zinc-500">{field.label}</label>
                  <Input name={field.name} type={field.type ?? "text"} required autoFocus={i === 0} />
                </div>
              ))}

              <div className="flex items-center justify-between pt-2">
                <button type="button" onClick={close} className="text-sm text-zinc-500 hover:text-zinc-700 px-3 py-2">
                  {cancelLabel}
                </button>
                <Button type="submit">{connectLabel}</Button>
              </div>
            </form>
          </div>
        </Modal>
      )}
    </Card>
  );
}
