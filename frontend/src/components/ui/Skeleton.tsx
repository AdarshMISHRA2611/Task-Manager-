import clsx from "clsx";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={clsx(
        "animate-pulse rounded-md bg-gradient-to-r from-border via-surface-muted to-border bg-[length:200%_100%]",
        className
      )}
    />
  );
}
