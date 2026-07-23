import Link from "next/link";
import { cn } from "@/components/ui/cn";

const VARIANTS = {
  primary: "bg-violet-600 text-white hover:bg-violet-700",
  secondary: "border border-zinc-200 text-zinc-700 bg-white hover:bg-zinc-50",
  destructive: "border border-red-200 text-red-600 hover:bg-red-50",
} as const;

const SIZES = {
  sm: "text-xs px-3 py-1.5",
  md: "text-sm px-5 py-2.5",
} as const;

const BASE = "rounded-full font-medium inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-50";

type Variant = keyof typeof VARIANTS;
type Size = keyof typeof SIZES;

type ButtonProps = {
  variant?: Variant;
  size?: Size;
  className?: string;
  href?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

export function Button({ variant = "primary", size = "md", className, href, children, ...rest }: ButtonProps) {
  const classes = cn(BASE, VARIANTS[variant], SIZES[size], className);

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button className={classes} {...rest}>
      {children}
    </button>
  );
}
