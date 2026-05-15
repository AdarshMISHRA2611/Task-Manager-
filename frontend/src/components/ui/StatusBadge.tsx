import clsx from "clsx";
import type { TaskStatus } from "@/services/types";

const styles: Record<TaskStatus, string> = {
  Queued: "bg-slate-500/15 text-slate-300 ring-slate-500/25",
  Active: "bg-cyan-500/15 text-cyan-200 ring-cyan-500/25",
  Done: "bg-emerald-500/15 text-emerald-200 ring-emerald-500/25",
};

export function StatusBadge({ status }: { status: TaskStatus }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset",
        styles[status]
      )}
    >
      {status}
    </span>
  );
}
