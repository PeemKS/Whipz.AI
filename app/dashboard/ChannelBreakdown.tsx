import type { LucideIcon } from "lucide-react";

export interface ChannelSegment {
  key: string;
  label: string;
  count: number;
  barClass: string;
  chipClass: string;
  icon: LucideIcon;
}

export function ChannelBreakdown({ segments }: { segments: ChannelSegment[] }) {
  const total = segments.reduce((sum, s) => sum + s.count, 0);

  return (
    <div>
      <div className="flex h-2 rounded-full overflow-hidden bg-zinc-100">
        {segments
          .filter((s) => s.count > 0)
          .map((s) => (
            <div key={s.key} className={s.barClass} style={{ width: `${total > 0 ? (s.count / total) * 100 : 0}%` }} />
          ))}
      </div>
      <ul className="mt-4 space-y-2.5">
        {segments.map((s) => {
          const Icon = s.icon;
          return (
            <li key={s.key} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 min-w-0">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${s.chipClass}`}>
                  <Icon size={12} strokeWidth={2.5} />
                </span>
                <span className="text-zinc-600 truncate">{s.label}</span>
              </span>
              <span className="font-medium text-zinc-900 shrink-0">{s.count}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
