import type { ButtonHTMLAttributes } from "react";
import clsx from "clsx";

const variants = {
  primary:
    "bg-brand-600 text-white shadow-glow hover:bg-brand-500 ring-1 ring-white/10 disabled:opacity-50",
  secondary:
    "bg-slate-800 text-slate-100 ring-1 ring-slate-700 hover:bg-slate-700 hover:ring-slate-600 disabled:opacity-50",
  ghost: "text-slate-300 hover:bg-slate-800/80 ring-1 ring-transparent hover:ring-slate-700",
  danger:
    "bg-rose-500/10 text-rose-200 ring-1 ring-rose-500/30 hover:bg-rose-500/20 disabled:opacity-50",
} as const;

export function Button({
  children,
  className,
  variant = "primary",
  size = "md",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants;
  size?: "sm" | "md" | "lg";
}) {
  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-5 py-2.5 text-sm",
  };
  return (
    <button type={type} className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition focus-ring disabled:cursor-not-allowed",
        variants[variant],
        sizes[size],
        className
      )} {...props}>
      {children}
    </button>
  );
}
