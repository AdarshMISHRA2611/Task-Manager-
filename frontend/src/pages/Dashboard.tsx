import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, CircleDashed, ListChecks } from "lucide-react";
import { api } from "@/services/api";
import { qk } from "@/services/queryClient";
import type { Dashboard } from "@/services/types";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";

function StatCard({
  label,
  value,
  icon: Icon,
  iconClass,
}: {
  label: string;
  value: number;
  icon: typeof ListChecks;
  iconClass: string;
}) {
  return (
    <Card className="relative overflow-hidden">
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-white">{value}</p>
        </div>
        <span
          className={`flex h-10 w-10 items-center justify-center rounded-xl ring-1 ring-inset ring-white/10 ${iconClass}`}
        >
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </Card>
  );
}

export default function DashboardPage() {
  const q = useQuery({
    queryKey: qk.dashboard,
    queryFn: () => api.get<Dashboard>("/api/dashboard").then((r) => r.data),
  });

  if (q.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      </div>
    );
  }

  if (q.isError) {
    return (
      <Card className="border-rose-500/30 bg-rose-950/20">
        <p className="flex items-center gap-2 text-sm text-rose-200">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Could not load overview. Refresh or sign in again.
        </p>
      </Card>
    );
  }

  const d = q.data!;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Overview</h1>
        <p className="mt-1 text-sm text-slate-400">
          Live metrics for work you can see — admins see every task; members see items assigned to them.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="All items" value={d.total_tasks} icon={ListChecks} iconClass="bg-brand-600/25 text-brand-300" />
        <StatCard label="Queued" value={d.queued_tasks} icon={CircleDashed} iconClass="bg-slate-600/25 text-slate-300" />
        <StatCard label="Active" value={d.active_tasks} icon={ListChecks} iconClass="bg-cyan-600/25 text-cyan-200" />
        <StatCard label="Done" value={d.done_tasks} icon={CheckCircle2} iconClass="bg-emerald-600/25 text-emerald-200" />
        <StatCard label="Overdue" value={d.overdue_tasks} icon={AlertTriangle} iconClass="bg-rose-600/25 text-rose-200" />
      </div>
    </div>
  );
}
