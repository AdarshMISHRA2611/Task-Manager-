import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  ListChecks,
  ShieldCheck,
  Timer,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/services/authContext";
import { api } from "@/services/api";
import { qk } from "@/services/queryClient";
import type { Dashboard } from "@/services/types";
import { Skeleton } from "@/components/ui/Skeleton";

type StatTone = "brand" | "slate" | "warning" | "success" | "destructive";

interface ToneSpec {
  iconBg: string;
  iconRing: string;
  cardRing: string;
  glow: string;
  barFrom: string;
}

const TONE_CLASSES: Record<StatTone, ToneSpec> = {
  brand: {
    iconBg: "bg-brand-subtle text-brand-subtle-foreground",
    iconRing: "ring-brand-subtle-border",
    cardRing: "hover:ring-brand-subtle-border",
    glow: "group-hover:drop-shadow-[0_4px_12px_rgb(var(--brand)/0.35)]",
    barFrom: "bg-brand",
  },
  slate: {
    iconBg: "bg-surface-muted text-foreground",
    iconRing: "ring-border",
    cardRing: "hover:ring-border",
    glow: "group-hover:drop-shadow-[0_4px_12px_rgba(100,116,139,0.25)]",
    barFrom: "bg-muted-foreground",
  },
  warning: {
    iconBg: "bg-warning-subtle text-warning-subtle-foreground",
    iconRing: "ring-warning-subtle-border",
    cardRing: "hover:ring-warning-subtle-border",
    glow: "group-hover:drop-shadow-[0_4px_12px_rgba(245,158,11,0.30)]",
    barFrom: "bg-amber-500",
  },
  success: {
    iconBg: "bg-success-subtle text-success-subtle-foreground",
    iconRing: "ring-success-subtle-border",
    cardRing: "hover:ring-success-subtle-border",
    glow: "group-hover:drop-shadow-[0_4px_12px_rgba(16,185,129,0.30)]",
    barFrom: "bg-emerald-500",
  },
  destructive: {
    iconBg: "bg-destructive-subtle text-destructive-subtle-foreground",
    iconRing: "ring-destructive-subtle-border",
    cardRing: "hover:ring-destructive-subtle-border",
    glow: "group-hover:drop-shadow-[0_4px_12px_rgba(244,63,94,0.30)]",
    barFrom: "bg-rose-500",
  },
};

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function firstName(name: string | undefined): string {
  if (!name) return "there";
  const first = name.trim().split(/\s+/)[0];
  return first || "there";
}

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
  share,
  hero = false,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  tone: StatTone;
  share?: number;
  hero?: boolean;
}) {
  const t = TONE_CLASSES[tone];
  const pct = share === undefined ? null : Math.max(0, Math.min(100, share));

  return (
    <div
      className={`group relative rounded-2xl border border-border bg-surface p-5 shadow-sm ring-1 ring-transparent transition duration-200 hover:-translate-y-0.5 hover:shadow-md ${t.cardRing}`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <span
          className={`flex h-10 w-10 items-center justify-center rounded-xl ring-1 transition group-hover:scale-110 ${t.iconBg} ${t.iconRing} ${t.glow}`}
        >
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <p
        className={`mt-4 font-bold tracking-tight text-foreground ${
          hero ? "text-5xl sm:text-6xl" : "text-4xl"
        }`}
      >
        {value}
      </p>
      {pct !== null && (
        <div className="mt-4">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
            <div
              className={`h-full rounded-full transition-all duration-500 ${t.barFrom}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            {pct.toFixed(0)}% of total
          </p>
        </div>
      )}
    </div>
  );
}

function StatCardSkeleton({ hero = false }: { hero?: boolean }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-10 w-10 rounded-xl" />
      </div>
      <Skeleton className={`mt-4 ${hero ? "h-14 w-32" : "h-10 w-20"}`} />
      <Skeleton className="mt-4 h-1.5 w-full rounded-full" />
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: qk.dashboard,
    queryFn: async () => (await api.get<Dashboard>("/api/dashboard")).data,
  });

  const isAdmin = user?.role === "Admin";
  const total = data?.total_tasks ?? 0;
  const share = (v: number) => (total > 0 ? (v / total) * 100 : 0);

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {getGreeting()}
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {firstName(user?.name)},{" "}
            <span className="text-muted-foreground">welcome back</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isAdmin
              ? "An overview of every task across your team."
              : "An overview of tasks assigned to you."}
          </p>
        </div>
        {user && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-subtle px-3 py-1 text-xs font-bold uppercase tracking-wide text-brand-subtle-foreground ring-1 ring-brand-subtle-border">
            <ShieldCheck className="h-3.5 w-3.5" /> {user.role}
          </span>
        )}
      </div>

      {isLoading || !data ? (
        <div className="space-y-4">
          <StatCardSkeleton hero />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <StatCard
            label="Total Tasks"
            value={data.total_tasks}
            icon={ListChecks}
            tone="brand"
            hero
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <StatCard
              label="Todo"
              value={data.todo_tasks}
              icon={Circle}
              tone="slate"
              share={share(data.todo_tasks)}
            />
            <StatCard
              label="In Progress"
              value={data.in_progress_tasks}
              icon={Timer}
              tone="warning"
              share={share(data.in_progress_tasks)}
            />
            <StatCard
              label="Completed"
              value={data.completed_tasks}
              icon={CheckCircle2}
              tone="success"
              share={share(data.completed_tasks)}
            />
            <StatCard
              label="Overdue"
              value={data.overdue_tasks}
              icon={AlertTriangle}
              tone="destructive"
              share={share(data.overdue_tasks)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
