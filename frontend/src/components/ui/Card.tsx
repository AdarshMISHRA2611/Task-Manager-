import type { ReactNode } from "react";
import clsx from "clsx";

export function Card({
  children,
  className,
  padding = true,
}: {
  children: ReactNode;
  className?: string;
  padding?: boolean;
}) {
  return (
    <div
      className={clsx(
        "rounded-2xl border border-border bg-surface shadow-sm",
        padding && "p-5 sm:p-6",
        className
      )}
    >
      {children}
    </div>
  );
}
