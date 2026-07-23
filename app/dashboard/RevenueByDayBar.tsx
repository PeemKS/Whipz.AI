"use client";

import { useState } from "react";

interface DayAmount {
  label: string;
  fullLabel: string;
  amount: number;
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n);
}

export function RevenueByDayBar({ data }: { data: DayAmount[] }) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const max = Math.max(...data.map((d) => d.amount), 1);
  const lastIndex = data.length - 1;
  const activeIndex = hoverIndex ?? lastIndex;
  const active = data[activeIndex];

  return (
    <div>
      <div className="flex items-end gap-2 h-28">
        {data.map((d, i) => {
          const heightPct = Math.max(4, (d.amount / max) * 100);
          const isActive = i === activeIndex;
          return (
            <div
              key={d.label}
              className="flex-1 flex flex-col items-center justify-end h-full cursor-default"
              onMouseEnter={() => setHoverIndex(i)}
              onMouseLeave={() => setHoverIndex(null)}
            >
              <div
                className={`w-full rounded-t-md transition-colors ${isActive ? "bg-violet-600" : "bg-violet-100"}`}
                style={{ height: `${heightPct}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex gap-2 mt-2">
        {data.map((d) => (
          <div key={d.label} className="flex-1 text-center text-[10px] text-zinc-400">
            {d.label}
          </div>
        ))}
      </div>
      <div className="mt-2 text-sm">
        <span className="font-semibold text-zinc-900">${formatCurrency(active.amount)}</span>
        <span className="text-zinc-500 ml-1.5">{active.fullLabel}</span>
      </div>
    </div>
  );
}
