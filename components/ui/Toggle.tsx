"use client";

import { cn } from "@/components/ui/cn";

export function Toggle({
  name = "active",
  defaultChecked,
  checked,
  onChange,
  autoSubmit = true,
  className,
  ...rest
}: {
  name?: string;
  defaultChecked?: boolean;
  checked?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  autoSubmit?: boolean;
  className?: string;
} & Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type" | "name" | "defaultChecked" | "checked" | "onChange" | "className"
>) {
  return (
    <label className={cn("relative inline-flex items-center shrink-0 cursor-pointer", className)}>
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        checked={checked}
        onChange={(e) => {
          onChange?.(e);
          if (autoSubmit) e.currentTarget.form?.requestSubmit();
        }}
        className="peer sr-only"
        {...rest}
      />
      <span className="w-10 h-6 rounded-full bg-zinc-200 peer-checked:bg-violet-600 transition-colors" />
      <span className="pointer-events-none absolute left-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-4" />
    </label>
  );
}
