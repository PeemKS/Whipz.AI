"use client";

import { useState } from "react";

export interface FunnelStage {
  key: string;
  label: string;
  count: number;
}

// Ordinal ramp (funnel position, not identity) — one hue, monotone
// lightness light→dark. Validated: node scripts/validate_palette.js
// "#a78bfa,#8b5cf6,#7c3aed,#5b21b6" --mode light --ordinal --surface "#ffffff"
const RAMP = ["#a78bfa", "#8b5cf6", "#7c3aed", "#5b21b6"];

export function MarketingFunnel({
  stages,
  ofTotalLabel,
  ofPreviousLabel,
}: {
  stages: FunnelStage[];
  ofTotalLabel: string;
  ofPreviousLabel: string;
}) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(...stages.map((s) => s.count), 1);
  const total = stages[0]?.count ?? 0;

  return (
    <div className="space-y-3">
      {stages.map((stage, i) => {
        const widthPct = Math.max(2, (stage.count / max) * 100);
        const pctOfTotal = total > 0 ? Math.round((stage.count / total) * 100) : 0;
        const prevCount = i > 0 ? stages[i - 1].count : null;
        const pctOfPrevious = prevCount && prevCount > 0 ? Math.round((stage.count / prevCount) * 100) : null;
        const isActive = active === i;

        return (
          <div key={stage.key} className="relative flex items-center gap-3">
            <div className="w-28 sm:w-36 text-xs text-zinc-600 shrink-0 truncate">{stage.label}</div>
            <div className="flex-1 h-5 bg-zinc-100 rounded-sm overflow-hidden">
              <button
                type="button"
                className="h-full rounded-r-[4px] outline-none transition-[filter] focus-visible:ring-2 focus-visible:ring-violet-300"
                style={{ width: `${widthPct}%`, backgroundColor: RAMP[i % RAMP.length], filter: isActive ? "brightness(1.12)" : undefined }}
                onMouseEnter={() => setActive(i)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
                aria-label={`${stage.label}: ${stage.count}`}
              />
            </div>
            <div className="w-14 text-xs font-medium text-zinc-900 text-right shrink-0 tabular-nums">{stage.count}</div>

            {isActive && (
              <div className="absolute left-28 sm:left-36 -top-8 z-10 rounded-md bg-zinc-900 text-white text-[11px] px-2.5 py-1.5 whitespace-nowrap shadow-lg pointer-events-none">
                {pctOfTotal}% {ofTotalLabel}
                {pctOfPrevious !== null && ` · ${pctOfPrevious}% ${ofPreviousLabel}`}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
