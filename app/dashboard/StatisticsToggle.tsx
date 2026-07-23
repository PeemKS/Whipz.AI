"use client";

import { useState } from "react";

interface Period {
  customers: number;
}

interface Labels {
  statistics: string;
  weekly: string;
  monthly: string;
  newCustomers: string;
}

export function StatisticsToggle({ weekly, monthly, t }: { weekly: Period; monthly: Period; t: Labels }) {
  const [range, setRange] = useState<"weekly" | "monthly">("weekly");
  const data = range === "weekly" ? weekly : monthly;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-medium text-sm text-zinc-500">{t.statistics}</h2>
        <div className="flex bg-zinc-100 rounded-full p-0.5 text-xs">
          {(["weekly", "monthly"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1 rounded-full capitalize transition-colors ${
                range === r ? "bg-white shadow-sm font-medium" : "text-zinc-500 hover:text-zinc-700"
              }`}
            >
              {r === "weekly" ? t.weekly : t.monthly}
            </button>
          ))}
        </div>
      </div>
      <div>
        <div className="text-3xl font-semibold">{data.customers}</div>
        <div className="text-sm text-zinc-500">{t.newCustomers}</div>
      </div>
    </div>
  );
}
