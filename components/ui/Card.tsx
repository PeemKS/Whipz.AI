import { cn } from "@/components/ui/cn";

const PADDING = {
  none: "",
  sm: "p-4",
  md: "p-5",
  lg: "p-6",
} as const;

export function Card({
  padding = "md",
  className,
  children,
  ...rest
}: {
  padding?: keyof typeof PADDING;
  className?: string;
  children: React.ReactNode;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-zinc-200 bg-white",
        PADDING[padding],
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
