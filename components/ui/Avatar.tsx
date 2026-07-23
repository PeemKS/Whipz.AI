import { Bot, User } from "lucide-react";
import { cn } from "@/components/ui/cn";

export function Avatar({
  name,
  avatarUrl,
  size = 32,
  className,
}: {
  name?: string | null;
  avatarUrl?: string | null;
  size?: number;
  className?: string;
}) {
  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt={name ?? ""}
        className={cn("rounded-full object-cover border border-zinc-200 shrink-0", className)}
        style={{ width: size, height: size }}
      />
    );
  }
  const initial = name?.trim().charAt(0).toUpperCase();
  return (
    <div
      className={cn("rounded-full bg-zinc-900 text-white flex items-center justify-center font-medium shrink-0", className)}
      style={{ width: size, height: size, fontSize: size * 0.42 }}
    >
      {initial || <User size={size * 0.55} strokeWidth={2} />}
    </div>
  );
}

export function AgentAvatar({ human, size = 32, className }: { human?: boolean; size?: number; className?: string }) {
  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center text-white shrink-0",
        human ? "bg-emerald-600" : "bg-gradient-to-br from-violet-600 to-fuchsia-500",
        className
      )}
      style={{ width: size, height: size }}
    >
      {human ? <User size={size * 0.55} strokeWidth={2} /> : <Bot size={size * 0.55} strokeWidth={2} />}
    </div>
  );
}
