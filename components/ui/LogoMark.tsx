import { cn } from "@/components/ui/cn";

export function LogoMark({ size = "md", className }: { size?: "sm" | "md"; className?: string }) {
  const dimensions = size === "sm" ? "w-10 h-10 text-sm" : "w-11 h-11 text-sm";
  return (
    <div
      className={cn(
        "rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-500 flex items-center justify-center text-white font-semibold shrink-0",
        dimensions,
        className
      )}
    >
      W
    </div>
  );
}
