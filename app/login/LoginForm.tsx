"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { LogoMark } from "@/components/ui/LogoMark";

export function LoginForm({ t }: { t: Dictionary["auth"] }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabaseBrowser().auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="max-w-sm mx-auto mt-24">
      <LogoMark className="mb-6" />
      <Card padding="lg">
        <h1 className="text-xl font-semibold mb-6">{t.signIn}</h1>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input type="email" required placeholder={t.email} value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input
            type="password"
            required
            placeholder={t.password}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? t.signingIn : t.signIn}
          </Button>
        </form>
        <p className="text-sm text-zinc-500 mt-4">
          {t.noAccount}{" "}
          <Link href="/signup" className="text-violet-600 font-medium hover:underline">
            {t.signUp}
          </Link>
        </p>
      </Card>
    </div>
  );
}
