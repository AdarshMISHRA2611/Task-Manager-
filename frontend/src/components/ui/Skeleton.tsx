import clsx from "clsx";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={clsx(
        "animate-pulse rounded-md bg-gradient-to-r from-slate-800 via-slate-700/80 to-slate-800 bg-[length:200%_100%]",
        className
      )}
    />
  );
}
