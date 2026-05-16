import type { ButtonHTMLAttributes } from "react";
import clsx from "clsx";

const variants = {
  primary:
    "bg-brand text-brand-foreground shadow-sm hover:bg-brand-hover active:bg-brand-active disabled:opacity-50",
  secondary:
    "bg-surface text-foreground border border-border-strong hover:bg-surface-muted hover:border-border-strong disabled:opacity-50",
  ghost:
    "text-muted-foreground hover:text-foreground hover:bg-surface-muted disabled:opacity-50",
  danger:
    "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive-hover active:bg-destructive-hover disabled:opacity-50",
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
    <button
      type={type}
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition focus-ring disabled:cursor-not-allowed",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
