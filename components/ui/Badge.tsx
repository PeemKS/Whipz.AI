import { cn } from "@/components/ui/cn";

const VARIANTS = {
  success: "bg-green-100 text-green-700",
  warning: "bg-amber-100 text-amber-700",
  info: "bg-violet-100 text-violet-700",
  neutral: "bg-zinc-100 text-zinc-500",
  destructive: "bg-red-100 text-red-700",
} as const;

const SIZES = {
  sm: "text-[10px] px-1.5 py-0.5",
  md: "text-xs px-2 py-0.5",
} as const;

export function Badge({
  variant = "neutral",
  size = "md",
  className,
  children,
}: {
  variant?: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
  className?: string;
  children: React.ReactNode;
}) {
  return <span className={cn("rounded-full inline-block", VARIANTS[variant], SIZES[size], className)}>{children}</span>;
}
