"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/client";
import { format } from "@/lib/i18n/format";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { LogoMark } from "@/components/ui/LogoMark";

export function SignupForm({ t }: { t: Dictionary["auth"] }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmSent, setConfirmSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { data, error } = await supabaseBrowser().auth.signUp({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    if (!data.session) {
      // Email confirmation is required before a session exists.
      setConfirmSent(true);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  if (confirmSent) {
    return (
      <Card padding="lg" className="max-w-sm mx-auto mt-24 text-sm text-zinc-600">
        {format(t.checkEmail, { email })}
      </Card>
    );
  }

  return (
    <div className="max-w-sm mx-auto mt-24">
      <LogoMark className="mb-6" />
      <Card padding="lg">
        <h1 className="text-xl font-semibold mb-6">{t.createAccount}</h1>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input type="email" required placeholder={t.email} value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input
            type="password"
            required
            minLength={6}
            placeholder={t.password}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? t.creatingAccount : t.signUp}
          </Button>
        </form>
        <p className="text-sm text-zinc-500 mt-4">
          {t.haveAccount}{" "}
          <Link href="/login" className="text-violet-600 font-medium hover:underline">
            {t.signIn}
          </Link>
        </p>
      </Card>
    </div>
  );
}
