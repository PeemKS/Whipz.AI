"use client";

import { useState, type ReactNode } from "react";
import { Badge } from "@/components/ui/Badge";
import { format } from "@/lib/i18n/format";

interface Labels {
  funnelTitle: string;
  funnelSubtitle: string;
  lifecycleTitle: string;
  lifecycleSubtitle: string;
  lifecycleAtRiskCallout: string;
}

// Funnel (cumulative conversion, all-time) and Lifecycle (current-state
// distribution, including decay) answer different questions but read as
// duplicates side by side, especially with little order history. A toggle
// keeps both without the visual overlap.
//
// Views are pre-rendered by the caller (a Server Component) and passed in
// as elements, not raw data — the underlying segments carry Lucide icon
// component references, which can't cross the server/client prop boundary
// once this component is a Client Component.
export function FunnelLifecycleToggle({
  funnelView,
  lifecycleView,
  atRiskCount,
  t,
}: {
  funnelView: ReactNode;
  lifecycleView: ReactNode;
  atRiskCount: number;
  t: Labels;
}) {
  const [view, setView] = useState<"funnel" | "lifecycle">("funnel");

  return (
    <div>
      <div className="flex items-center justify-between mb-1 gap-2">
        <div className="flex bg-zinc-100 rounded-full p-0.5 text-xs shrink-0">
          {(["funnel", "lifecycle"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={`px-3 py-1 rounded-full transition-colors ${
                view === v ? "bg-white shadow-sm font-medium text-zinc-900" : "text-zinc-500 hover:text-zinc-700"
              }`}
            >
              {v === "funnel" ? t.funnelTitle : t.lifecycleTitle}
            </button>
          ))}
        </div>
        {view === "lifecycle" && atRiskCount > 0 && (
          <Badge variant="warning">{format(t.lifecycleAtRiskCallout, { count: atRiskCount })}</Badge>
        )}
      </div>
      <p className="text-xs text-zinc-500 mb-4">{view === "funnel" ? t.funnelSubtitle : t.lifecycleSubtitle}</p>
      {view === "funnel" ? funnelView : lifecycleView}
    </div>
  );
}
