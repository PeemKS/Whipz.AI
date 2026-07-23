"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { changePasswordAction } from "@/app/dashboard/settings/account/actions";

interface Labels {
  newPassword: string;
  confirmPassword: string;
  passwordMismatch: string;
  passwordTooShort: string;
  updatePassword: string;
}

export function ChangePasswordForm({ t }: { t: Labels }) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    setError(null);
    if (newPassword.length < 6) {
      e.preventDefault();
      setError(t.passwordTooShort);
      return;
    }
    if (newPassword !== confirmPassword) {
      e.preventDefault();
      setError(t.passwordMismatch);
    }
  }

  return (
    <form action={changePasswordAction} onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="text-xs text-zinc-500">{t.newPassword}</label>
        <Input
          name="new_password"
          type="password"
          required
          minLength={6}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
      </div>
      <div>
        <label className="text-xs text-zinc-500">{t.confirmPassword}</label>
        <Input
          name="confirm_password"
          type="password"
          required
          minLength={6}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit">{t.updatePassword}</Button>
    </form>
  );
}
