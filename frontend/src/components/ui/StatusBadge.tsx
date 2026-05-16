import clsx from "clsx";
import type { TaskStatus } from "@/services/types";

const STATUS_STYLES: Record<TaskStatus, string> = {
  Todo: "bg-surface-muted text-foreground ring-border",
  "In Progress": "bg-warning-subtle text-warning-subtle-foreground ring-warning-subtle-border",
  Completed: "bg-success-subtle text-success-subtle-foreground ring-success-subtle-border",
};

export function StatusBadge({ status }: { status: TaskStatus }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ring-1 ring-inset",
        STATUS_STYLES[status]
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}
