"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { deleteAccountAction } from "@/app/dashboard/settings/account/actions";

export function DeleteAccountForm({
  email,
  confirmLabel,
  buttonLabel,
}: {
  email: string;
  confirmLabel: string;
  buttonLabel: string;
}) {
  const [value, setValue] = useState("");
  const matches = value.trim().toLowerCase() === email.toLowerCase();

  return (
    <form action={deleteAccountAction} className="space-y-3">
      <div>
        <label className="text-xs text-zinc-500">{confirmLabel}</label>
        <Input name="confirm_email" value={value} onChange={(e) => setValue(e.target.value)} placeholder={email} />
      </div>
      <Button type="submit" variant="destructive" disabled={!matches}>
        {buttonLabel}
      </Button>
    </form>
  );
}
