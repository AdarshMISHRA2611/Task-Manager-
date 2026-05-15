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
        "rounded-2xl border border-slate-800/80 bg-slate-900/50 shadow-panel backdrop-blur-sm",
        padding && "p-5 sm:p-6",
        className
      )}
    >
      {children}
    </div>
  );
}
