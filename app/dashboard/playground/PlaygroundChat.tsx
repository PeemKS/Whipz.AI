"use client";

import { useEffect, useRef, useState } from "react";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  images?: string[];
}

function getOrCreatePlaygroundUid(tenantId: string): string {
  const key = `playground_uid_${tenantId}`;
  let uid = window.localStorage.getItem(key);
  if (!uid) {
    uid = crypto.randomUUID();
    window.localStorage.setItem(key, uid);
  }
  return uid;
}

export function PlaygroundChat({
  tenantId,
  t,
  modelLabel,
  model,
  providerName,
}: {
  tenantId: string;
  t: Dictionary["playground"];
  modelLabel: string;
  model: string;
  providerName: string;
}) {
  const [uid, setUid] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastToolCalls, setLastToolCalls] = useState<unknown[] | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // localStorage isn't available during SSR, so the uid can only be
    // resolved client-side after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUid(getOrCreatePlaygroundUid(tenantId));
  }, [tenantId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    if (!input.trim() || !uid) return;
    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant_id: tenantId,
          channel: "playground",
          external_user_id: uid,
          display_name: "Playground Tester",
          message: userMessage,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        return;
      }
      if (data.human_takeover) {
        setMessages((prev) => [...prev, { role: "system", content: t.humanTakeoverNotice }]);
      } else {
        setMessages((prev) => [...prev, { role: "assistant", content: data.reply, images: data.images }]);
      }
      setLastToolCalls(data.tool_calls);
    } catch {
      setError("Request failed");
    } finally {
      setLoading(false);
    }
  }

  function resetConversation() {
    if (!window.confirm(t.resetConfirm)) return;
    const newUid = crypto.randomUUID();
    window.localStorage.setItem(`playground_uid_${tenantId}`, newUid);
    setUid(newUid);
    setMessages([]);
    setLastToolCalls(null);
  }

  return (
    <div className="grid grid-cols-3 gap-6">
      <Card padding="none" className="col-span-2 flex flex-col min-h-[200px] max-h-[60vh]">
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && <p className="text-sm text-zinc-500">{t.intro}</p>}
          {messages.map((message, i) => (
            <div
              key={i}
              className={`text-sm rounded-2xl px-3.5 py-2 max-w-md ${
                message.role === "user"
                  ? "bg-zinc-100 ml-auto text-right"
                  : message.role === "system"
                    ? "bg-amber-50 text-amber-700 mx-auto text-center"
                    : "bg-violet-50"
              }`}
            >
              {message.content}
              {message.images && message.images.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {message.images.map((url) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={url} src={url} alt="" className="w-20 h-20 rounded-xl object-cover border border-zinc-200" />
                  ))}
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="bg-violet-50 rounded-2xl px-4 py-3 w-fit flex items-center gap-1.5" role="status" aria-label={t.thinking}>
              <span className="w-2 h-2 rounded-full bg-violet-400 animate-bounce [animation-delay:-0.3s]" />
              <span className="w-2 h-2 rounded-full bg-violet-400 animate-bounce [animation-delay:-0.15s]" />
              <span className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" />
            </div>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div ref={bottomRef} />
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="border-t border-zinc-100 p-3 flex gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t.inputPlaceholder}
            className="flex-1 border border-zinc-200 bg-white rounded-full px-4 py-2 text-sm"
          />
          <Button type="submit" disabled={loading}>
            {t.send}
          </Button>
        </form>
      </Card>

      <div className="col-span-1 space-y-4">
        <Card padding="sm">
          <h2 className="font-medium mb-2 text-sm">{modelLabel}</h2>
          <p className="text-sm">{providerName}</p>
          <p className="text-xs text-zinc-500 font-mono">{model}</p>
        </Card>

        <Card padding="sm">
          <h2 className="font-medium mb-2 text-sm">{t.session}</h2>
          <p className="text-xs text-zinc-500 break-all">uid: {uid}</p>
          <Button onClick={resetConversation} variant="secondary" size="sm" className="mt-2">
            {t.newCustomer}
          </Button>
        </Card>

        {lastToolCalls && (
          <Card padding="sm" className="text-xs space-y-2">
            <h2 className="font-medium text-sm mb-1">{t.lastTurn}</h2>
            {lastToolCalls.length > 0 ? (
              <pre className="whitespace-pre-wrap bg-zinc-50 rounded-xl p-2 overflow-x-auto">
                {JSON.stringify(lastToolCalls, null, 2)}
              </pre>
            ) : (
              <p className="text-zinc-500">{t.noToolCalls}</p>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
