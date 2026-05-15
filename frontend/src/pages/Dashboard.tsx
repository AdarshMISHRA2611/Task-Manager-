import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Circle, ListChecks, Timer } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAuth } from "@/services/authContext";
import { api } from "@/services/api";
import { qk } from "@/services/queryClient";
import type { Dashboard } from "@/services/types";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";

type StatTone = "brand" | "slate" | "amber" | "emerald" | "rose";

const TONE_CLASSES: Record<StatTone, { icon: string; ring: string; glow: string }> = {
  brand: {
    icon: "bg-brand-50 text-brand-700",
    ring: "hover:ring-brand-200",
    glow: "group-hover:drop-shadow-[0_4px_12px_rgba(16,185,129,0.35)]",
  },
  slate: {
    icon: "bg-slate-100 text-slate-700",
    ring: "hover:ring-slate-200",
    glow: "group-hover:drop-shadow-[0_4px_12px_rgba(100,116,139,0.30)]",
  },
  amber: {
    icon: "bg-amber-50 text-amber-700",
    ring: "hover:ring-amber-200",
    glow: "group-hover:drop-shadow-[0_4px_12px_rgba(245,158,11,0.35)]",
  },
  emerald: {
    icon: "bg-emerald-50 text-emerald-700",
    ring: "hover:ring-emerald-200",
    glow: "group-hover:drop-shadow-[0_4px_12px_rgba(16,185,129,0.35)]",
  },
  rose: {
    icon: "bg-rose-50 text-rose-700",
    ring: "hover:ring-rose-200",
    glow: "group-hover:drop-shadow-[0_4px_12px_rgba(244,63,94,0.35)]",
  },
};

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  tone: StatTone;
}) {
  const t = TONE_CLASSES[tone];
  return (
    <div
      className={`group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ring-1 ring-transparent transition duration-200 hover:-translate-y-0.5 hover:shadow-md ${t.ring}`}
    >
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-xl ring-1 ring-slate-100 transition group-hover:scale-110 ${t.icon} ${t.glow}`}
        >
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-4 text-3xl font-bold tracking-tight text-slate-900">{value}</p>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: qk.dashboard,
    queryFn: async () => (await api.get<Dashboard>("/api/dashboard")).data,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-600">
          {user?.role === "Admin"
            ? "An overview of every task across your team."
            : "An overview of tasks assigned to you."}
        </p>
      </div>

      {isLoading || !data ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <Skeleton className="h-3 w-24" />
              <Skeleton className="mt-6 h-8 w-16" />
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard label="Total Tasks" value={data.total_tasks} icon={ListChecks} tone="brand" />
          <StatCard label="Todo" value={data.todo_tasks} icon={Circle} tone="slate" />
          <StatCard label="In Progress" value={data.in_progress_tasks} icon={Timer} tone="amber" />
          <StatCard label="Completed" value={data.completed_tasks} icon={CheckCircle2} tone="emerald" />
          <StatCard label="Overdue" value={data.overdue_tasks} icon={AlertTriangle} tone="rose" />
        </div>
      )}
    </div>
  );
}
