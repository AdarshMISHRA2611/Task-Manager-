import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  AlertTriangle,
  Calendar,
  LayoutGrid,
  ListChecks,
  Loader2,
  Pencil,
  Plus,
  Search,
  Table2,
  Trash2,
  UserCircle2,
  X,
} from "lucide-react";
import { api, getErrorMessage } from "@/services/api";
import { qk } from "@/services/queryClient";
import TaskComments from "@/components/TaskComments";
import type {
  Project,
  ProjectMemberDetail,
  Task,
  TaskStatus,
} from "@/services/types";
import { TASK_STATUS_OPTIONS } from "@/services/types";
import { useAuth } from "@/services/authContext";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Select } from "@/components/ui/Select";
import { DateTimePicker } from "@/components/ui/DateTimePicker";
import { Modal } from "@/components/ui/Modal";
import { useConfirm } from "@/components/ui/ConfirmDialog";

type TaskErrors = { title?: string; project_id?: string };
type ViewMode = "list" | "board";

const BOARD_COLUMNS: { status: TaskStatus; dotClass: string }[] = [
  { status: "Todo", dotClass: "bg-slate-400" },
  { status: "In Progress", dotClass: "bg-amber-500" },
  { status: "Completed", dotClass: "bg-emerald-500" },
];

function formatDue(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(local: string): string | null {
  if (!local) return null;
  const d = new Date(local);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export default function TasksPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "Admin";
  const confirm = useConfirm();
  const queryClient = useQueryClient();

  const tasksQuery = useQuery({
    queryKey: qk.tasks,
    queryFn: async () => (await api.get<Task[]>("/api/tasks")).data,
  });

  const projectsQuery = useQuery({
    queryKey: qk.projects,
    queryFn: async () => (await api.get<Project[]>("/api/projects")).data,
  });

  const projects = projectsQuery.data ?? [];
  const tasks = tasksQuery.data ?? [];

  // View + filters
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");

  // Drag-and-drop
  const [draggingTaskId, setDraggingTaskId] = useState<number | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null);

  // Create task form (admin only)
  const [newProjectId, setNewProjectId] = useState<number | "">("");
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newAssignee, setNewAssignee] = useState<number | "">("");
  const [newStatus, setNewStatus] = useState<TaskStatus>("Todo");
  const [newDue, setNewDue] = useState("");
  const [newErrors, setNewErrors] = useState<TaskErrors>({});

  const newProjectMembersQuery = useQuery({
    queryKey: qk.projectMembers(newProjectId === "" ? -1 : Number(newProjectId)),
    queryFn: async () =>
      (await api.get<ProjectMemberDetail[]>(`/api/projects/${newProjectId}/members`)).data,
    enabled: isAdmin && newProjectId !== "",
  });

  const createMutation = useMutation({
    mutationFn: async (payload: {
      title: string;
      description?: string;
      assigned_to?: number | null;
      project_id: number;
      due_date?: string | null;
      status: TaskStatus;
    }) => (await api.post<Task>("/api/tasks", payload)).data,
    onSuccess: () => {
      toast.success("Task created");
      setNewTitle("");
      setNewDescription("");
      setNewAssignee("");
      setNewStatus("Todo");
      setNewDue("");
      setNewErrors({});
      queryClient.invalidateQueries({ queryKey: qk.tasks });
      queryClient.invalidateQueries({ queryKey: qk.dashboard });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const onCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const next: TaskErrors = {};
    if (newProjectId === "") next.project_id = "Project is required";
    if (!newTitle.trim()) next.title = "Title is required";
    setNewErrors(next);
    if (Object.keys(next).length > 0) return;
    createMutation.mutate({
      title: newTitle.trim(),
      description: newDescription.trim() || undefined,
      assigned_to: newAssignee === "" ? null : Number(newAssignee),
      project_id: Number(newProjectId),
      due_date: fromLocalInput(newDue),
      status: newStatus,
    });
  };

  const updateStatusMutation = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: number; status: TaskStatus }) =>
      (await api.put<Task>(`/api/tasks/${taskId}`, { status })).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.tasks });
      queryClient.invalidateQueries({ queryKey: qk.dashboard });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: async (taskId: number) => api.delete(`/api/tasks/${taskId}`),
    onSuccess: () => {
      toast.success("Task deleted");
      queryClient.invalidateQueries({ queryKey: qk.tasks });
      queryClient.invalidateQueries({ queryKey: qk.dashboard });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const onDelete = async (t: Task) => {
    const ok = await confirm({
      title: `Delete "${t.title}"?`,
      description: "This task will be permanently removed.",
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (!ok) return;
    deleteMutation.mutate(t.id);
  };

  // Edit modal (admin only)
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [etTitle, setEtTitle] = useState("");
  const [etDescription, setEtDescription] = useState("");
  const [etAssignee, setEtAssignee] = useState<number | "">("");
  const [etStatus, setEtStatus] = useState<TaskStatus>("Todo");
  const [etDue, setEtDue] = useState("");
  const [etErrors, setEtErrors] = useState<TaskErrors>({});

  const editMembersQuery = useQuery({
    queryKey: qk.projectMembers(editingTask?.project_id ?? -1),
    queryFn: async () =>
      (
        await api.get<ProjectMemberDetail[]>(
          `/api/projects/${editingTask!.project_id}/members`,
        )
      ).data,
    enabled: !!editingTask,
  });

  const openEdit = (t: Task) => {
    setEditingTask(t);
    setEtTitle(t.title);
    setEtDescription(t.description ?? "");
    setEtAssignee(t.assigned_to ?? "");
    setEtStatus(t.status);
    setEtDue(toLocalInput(t.due_date));
    setEtErrors({});
  };

  const editMutation = useMutation({
    mutationFn: async (payload: {
      taskId: number;
      title: string;
      description: string | null;
      assigned_to: number | null;
      status: TaskStatus;
      due_date: string | null;
    }) =>
      (await api.put<Task>(`/api/tasks/${payload.taskId}`, {
        title: payload.title,
        description: payload.description,
        assigned_to: payload.assigned_to,
        status: payload.status,
        due_date: payload.due_date,
      })).data,
    onSuccess: () => {
      toast.success("Task updated");
      setEditingTask(null);
      queryClient.invalidateQueries({ queryKey: qk.tasks });
      queryClient.invalidateQueries({ queryKey: qk.dashboard });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const onSaveEdit = () => {
    if (!editingTask) return;
    const next: TaskErrors = {};
    if (!etTitle.trim()) next.title = "Title is required";
    setEtErrors(next);
    if (Object.keys(next).length > 0) return;
    editMutation.mutate({
      taskId: editingTask.id,
      title: etTitle.trim(),
      description: etDescription.trim() || null,
      assigned_to: etAssignee === "" ? null : Number(etAssignee),
      status: etStatus,
      due_date: fromLocalInput(etDue),
    });
  };

  const projectsById = useMemo(() => {
    const m = new Map<number, Project>();
    for (const p of projects) m.set(p.id, p);
    return m;
  }, [projects]);

  const newMemberOptions = (newProjectMembersQuery.data ?? []).map((m) => ({
    value: m.user_id,
    label: m.name,
    description: m.email,
  }));

  const editMemberOptions = (editMembersQuery.data ?? []).map((m) => ({
    value: m.user_id,
    label: m.name,
    description: m.email,
  }));

  // Filter options derived from current data
  const statusFilterOptions = useMemo(
    () => [
      { value: "all", label: "All statuses" },
      ...TASK_STATUS_OPTIONS.map((s) => ({ value: s, label: s })),
    ],
    [],
  );

  const projectFilterOptions = useMemo(
    () => [
      { value: "all", label: "All projects" },
      ...projects.map((p) => ({ value: String(p.id), label: p.name })),
    ],
    [projects],
  );

  const assigneeFilterOptions = useMemo(() => {
    const ids = new Set<number>();
    for (const t of tasks) if (t.assigned_to != null) ids.add(t.assigned_to);
    return [
      { value: "all", label: "All assignees" },
      { value: "unassigned", label: "Unassigned" },
      ...Array.from(ids)
        .sort((a, b) => a - b)
        .map((id) => ({
          value: String(id),
          label: id === user?.id ? "You" : `User #${id}`,
        })),
    ];
  }, [tasks, user?.id]);

  const hasActiveFilters =
    !!searchQuery.trim() ||
    statusFilter !== "all" ||
    projectFilter !== "all" ||
    assigneeFilter !== "all";

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setProjectFilter("all");
    setAssigneeFilter("all");
  };

  const filteredTasks = useMemo(() => {
    let result = tasks;
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.description ?? "").toLowerCase().includes(q),
      );
    }
    if (statusFilter !== "all") {
      result = result.filter((t) => t.status === statusFilter);
    }
    if (projectFilter !== "all") {
      result = result.filter((t) => String(t.project_id) === projectFilter);
    }
    if (assigneeFilter !== "all") {
      if (assigneeFilter === "unassigned") {
        result = result.filter((t) => t.assigned_to == null);
      } else {
        result = result.filter((t) => String(t.assigned_to ?? "") === assigneeFilter);
      }
    }
    return result;
  }, [tasks, searchQuery, statusFilter, projectFilter, assigneeFilter]);

  // Drag-and-drop handlers
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, taskId: number) => {
    setDraggingTaskId(taskId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(taskId));
  };

  const handleDragEnd = () => {
    setDraggingTaskId(null);
    setDragOverColumn(null);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, status: TaskStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverColumn !== status) setDragOverColumn(status);
  };

  const handleDragLeave = (status: TaskStatus) => {
    if (dragOverColumn === status) setDragOverColumn(null);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, status: TaskStatus) => {
    e.preventDefault();
    setDragOverColumn(null);
    const idStr = e.dataTransfer.getData("text/plain");
    const id = Number(idStr);
    if (!id) return;
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    if (task.status === status) return;
    const canChange = isAdmin || task.assigned_to === user?.id;
    if (!canChange) {
      toast.error("You can only change status on tasks assigned to you.");
      return;
    }
    updateStatusMutation.mutate({ taskId: id, status });
  };

  const renderTaskCard = (t: Task, i: number) => {
    const project = projectsById.get(t.project_id);
    const canChange = isAdmin || t.assigned_to === user?.id;
    const isDragging = draggingTaskId === t.id;
    return (
      <div
        key={t.id}
        draggable={canChange}
        onDragStart={(e) => canChange && handleDragStart(e, t.id)}
        onDragEnd={handleDragEnd}
        style={{ animationDelay: `${i * 30}ms` }}
        className={`group animate-fade-in rounded-xl border border-border bg-surface p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
          canChange ? "cursor-grab active:cursor-grabbing" : "cursor-default"
        } ${isDragging ? "opacity-50" : ""}`}
      >
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium text-foreground">{t.title}</p>
          {isAdmin && (
            <div className="flex shrink-0 gap-0.5 opacity-0 transition group-hover:opacity-100">
              <button
                type="button"
                onClick={() => openEdit(t)}
                className="rounded-md p-1 text-muted-foreground hover:bg-surface-muted hover:text-foreground focus-ring"
                aria-label="Edit task"
              >
                <Pencil className="h-3.5 w-3.5" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => onDelete(t)}
                className="rounded-md p-1 text-muted-foreground hover:bg-destructive-subtle hover:text-destructive focus-ring"
                aria-label="Delete task"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
              </button>
            </div>
          )}
        </div>
        {t.description && (
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{t.description}</p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          {project && (
            <Link
              to={`/projects/${project.id}`}
              className="rounded-md bg-surface-muted px-2 py-0.5 text-foreground hover:bg-border"
            >
              {project.name}
            </Link>
          )}
          {t.due_date && (
            <span className="inline-flex items-center gap-1 rounded-md bg-surface-muted px-2 py-0.5 ring-1 ring-border">
              <Calendar className="h-3 w-3" aria-hidden />
              {formatDue(t.due_date)}
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <UserCircle2 className="h-3 w-3 text-subtle" aria-hidden />
            {t.assigned_to == null
              ? "Unassigned"
              : t.assigned_to === user?.id
                ? "You"
                : `User #${t.assigned_to}`}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={ListChecks}
        title="Tasks"
        description={isAdmin ? "Every task across the workspace." : "Tasks assigned to you."}
      />

      {isAdmin && (
        <Card>
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-subtle text-brand ring-1 ring-brand-subtle-border">
              <Plus className="h-4 w-4" aria-hidden />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">New task</h2>
              <p className="text-xs text-muted-foreground">Pick a project and assign a member.</p>
            </div>
          </div>
          <form noValidate onSubmit={onCreate} className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Project
              </label>
              <Select<number>
                value={newProjectId}
                onChange={(v) => {
                  setNewProjectId(v);
                  setNewAssignee("");
                  if (newErrors.project_id)
                    setNewErrors((p) => ({ ...p, project_id: undefined }));
                }}
                options={projects.map((p) => ({ value: p.id, label: p.name }))}
                placeholder="Select a project"
                searchable
                emptyText="No projects yet"
              />
              {newErrors.project_id && (
                <p className="mt-1 text-xs text-destructive">! {newErrors.project_id}</p>
              )}
            </div>
            <div>
              <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Assignee
              </label>
              <Select<number>
                value={newAssignee}
                onChange={(v) => setNewAssignee(v)}
                options={newMemberOptions}
                placeholder={
                  newProjectId === ""
                    ? "Choose a project first"
                    : newMemberOptions.length === 0
                      ? "No members on this project"
                      : "Unassigned"
                }
                searchable
                disabled={newProjectId === "" || newMemberOptions.length === 0}
                emptyText="No members yet"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Title
              </label>
              <input
                value={newTitle}
                onChange={(e) => {
                  setNewTitle(e.target.value);
                  if (newErrors.title) setNewErrors((p) => ({ ...p, title: undefined }));
                }}
                placeholder="Ship onboarding flow"
                className={`mt-1 w-full rounded-lg border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-subtle hover:border-border-strong focus-ring ${
                  newErrors.title ? "border-destructive" : "border-border-strong"
                }`}
              />
              {newErrors.title && (
                <p className="mt-1 text-xs text-destructive">! {newErrors.title}</p>
              )}
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Description
              </label>
              <textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Short brief (optional)"
                rows={3}
                className="mt-1 w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-foreground placeholder:text-subtle hover:border-border-strong focus-ring"
              />
            </div>
            <div>
              <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Status
              </label>
              <Select<TaskStatus>
                value={newStatus}
                onChange={(v) => setNewStatus(v)}
                options={TASK_STATUS_OPTIONS.map((s) => ({ value: s, label: s }))}
              />
            </div>
            <div>
              <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Due date
              </label>
              <DateTimePicker value={newDue} onChange={setNewDue} placeholder="Pick a due date" />
            </div>
            <div className="sm:col-span-2 flex justify-end">
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Creating...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" aria-hidden /> Create task
                  </>
                )}
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Search
            </label>
            <div className="relative mt-1">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle"
                aria-hidden
              />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Title or description"
                className="w-full rounded-lg border border-border-strong bg-surface pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-subtle hover:border-border-strong focus-ring"
              />
            </div>
          </div>
          <div className="w-full sm:w-40">
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Status
            </label>
            <Select<string>
              value={statusFilter}
              onChange={(v) => setStatusFilter(v)}
              options={statusFilterOptions}
            />
          </div>
          <div className="w-full sm:w-48">
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Project
            </label>
            <Select<string>
              value={projectFilter}
              onChange={(v) => setProjectFilter(v)}
              options={projectFilterOptions}
              searchable
            />
          </div>
          {isAdmin && (
            <div className="w-full sm:w-44">
              <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Assignee
              </label>
              <Select<string>
                value={assigneeFilter}
                onChange={(v) => setAssigneeFilter(v)}
                options={assigneeFilterOptions}
              />
            </div>
          )}
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-3.5 w-3.5" aria-hidden /> Clear
              </Button>
            )}
            <div className="inline-flex rounded-lg border border-border-strong bg-surface p-0.5">
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition focus-ring ${
                  viewMode === "list"
                    ? "bg-brand text-brand-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-surface-muted"
                }`}
                aria-pressed={viewMode === "list"}
              >
                <Table2 className="h-3.5 w-3.5" aria-hidden /> List
              </button>
              <button
                type="button"
                onClick={() => setViewMode("board")}
                className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition focus-ring ${
                  viewMode === "board"
                    ? "bg-brand text-brand-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-surface-muted"
                }`}
                aria-pressed={viewMode === "board"}
              >
                <LayoutGrid className="h-3.5 w-3.5" aria-hidden /> Board
              </button>
            </div>
          </div>
        </div>
        {hasActiveFilters && !tasksQuery.isLoading && (
          <p className="mt-3 text-xs text-muted-foreground">
            Showing {filteredTasks.length} of {tasks.length}
            {filteredTasks.length === 1 ? " task" : " tasks"}.
          </p>
        )}
      </Card>

      {tasksQuery.isLoading ? (
        <Card padding={false}>
          <div className="space-y-2 p-5">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        </Card>
      ) : tasksQuery.isError ? (
        <Card>
          <EmptyState
            icon={AlertTriangle}
            title="Could not load tasks"
            description={getErrorMessage(tasksQuery.error)}
            action={
              <Button variant="secondary" size="sm" onClick={() => tasksQuery.refetch()}>
                Try again
              </Button>
            }
          />
        </Card>
      ) : tasks.length === 0 ? (
        <Card>
          <EmptyState
            icon={ListChecks}
            title="No tasks yet"
            description={
              isAdmin
                ? "Create the first task above."
                : "Nothing has been assigned to you yet."
            }
          />
        </Card>
      ) : filteredTasks.length === 0 ? (
        <Card>
          <EmptyState
            icon={Search}
            title="No matches"
            description="Try adjusting search or filters."
            action={
              <Button variant="secondary" size="sm" onClick={clearFilters}>
                Clear filters
              </Button>
            }
          />
        </Card>
      ) : viewMode === "board" ? (
        <div className="grid gap-4 lg:grid-cols-3">
          {BOARD_COLUMNS.map((col) => {
            const colTasks = filteredTasks.filter((t) => t.status === col.status);
            const isOver = dragOverColumn === col.status;
            return (
              <div
                key={col.status}
                onDragOver={(e) => handleDragOver(e, col.status)}
                onDragLeave={() => handleDragLeave(col.status)}
                onDrop={(e) => handleDrop(e, col.status)}
                className={`rounded-2xl border p-3 transition ${
                  isOver
                    ? "border-brand bg-brand-subtle/60 ring-2 ring-brand-subtle-border"
                    : "border-border bg-surface-muted/50"
                }`}
              >
                <div className="mb-3 flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${col.dotClass}`} />
                    <h3 className="text-sm font-semibold text-foreground">{col.status}</h3>
                  </div>
                  <span className="rounded-full bg-surface px-2 py-0.5 text-xs font-medium text-muted-foreground ring-1 ring-border">
                    {colTasks.length}
                  </span>
                </div>
                <div className="min-h-[120px] space-y-2">
                  {colTasks.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border-strong bg-surface/60 px-3 py-6 text-center text-xs text-subtle">
                      Drop tasks here
                    </div>
                  ) : (
                    colTasks.map(renderTaskCard)
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <Card padding={false}>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead className="bg-surface-muted text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-5 py-3">Title</th>
                  <th className="px-5 py-3">Project</th>
                  <th className="px-5 py-3">Assignee</th>
                  <th className="px-5 py-3">Due</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredTasks.map((t, i) => {
                  const project = projectsById.get(t.project_id);
                  const canChangeStatus =
                    isAdmin || (user?.id !== undefined && t.assigned_to === user.id);
                  return (
                    <tr
                      key={t.id}
                      className="animate-fade-in border-l-2 border-transparent transition hover:border-brand hover:bg-surface-muted"
                      style={{ animationDelay: `${i * 30}ms` }}
                    >
                      <td className="px-5 py-3 align-top">
                        <p className="font-medium text-foreground">{t.title}</p>
                        {t.description && (
                          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                            {t.description}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-3 align-top">
                        {project ? (
                          <Link
                            to={`/projects/${project.id}`}
                            className="text-foreground hover:text-brand-hover"
                          >
                            {project.name}
                          </Link>
                        ) : (
                          <span className="text-subtle">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3 align-top text-foreground">
                        {t.assigned_to ? (
                          <span className="inline-flex items-center gap-2">
                            <UserCircle2 className="h-4 w-4 text-subtle" aria-hidden />
                            {t.assigned_to === user?.id ? "You" : `User #${t.assigned_to}`}
                          </span>
                        ) : (
                          <span className="text-subtle">Unassigned</span>
                        )}
                      </td>
                      <td className="px-5 py-3 align-top text-foreground">
                        {formatDue(t.due_date)}
                      </td>
                      <td className="px-5 py-3 align-top">
                        {canChangeStatus ? (
                          <Select<TaskStatus>
                            value={t.status}
                            onChange={(v) =>
                              updateStatusMutation.mutate({ taskId: t.id, status: v })
                            }
                            options={TASK_STATUS_OPTIONS.map((s) => ({ value: s, label: s }))}
                            size="sm"
                          />
                        ) : (
                          <StatusBadge status={t.status} />
                        )}
                      </td>
                      <td className="px-5 py-3 text-right align-top">
                        {isAdmin && (
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => openEdit(t)}>
                              <Pencil className="h-3.5 w-3.5" aria-hidden /> Edit
                            </Button>
                            <Button variant="danger" size="sm" onClick={() => onDelete(t)}>
                              <Trash2 className="h-3.5 w-3.5" aria-hidden />
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal
        open={!!editingTask}
        onClose={() => setEditingTask(null)}
        title="Edit task"
        description={editingTask?.title}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditingTask(null)}>
              Cancel
            </Button>
            <Button onClick={onSaveEdit} disabled={editMutation.isPending}>
              {editMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Saving...
                </>
              ) : (
                "Save changes"
              )}
            </Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Title
            </label>
            <input
              value={etTitle}
              onChange={(e) => {
                setEtTitle(e.target.value);
                if (etErrors.title) setEtErrors((p) => ({ ...p, title: undefined }));
              }}
              className={`mt-1 w-full rounded-lg border bg-surface px-3 py-2 text-sm text-foreground hover:border-border-strong focus-ring ${
                etErrors.title ? "border-destructive" : "border-border-strong"
              }`}
            />
            {etErrors.title && (
              <p className="mt-1 text-xs text-destructive">! {etErrors.title}</p>
            )}
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Description
            </label>
            <textarea
              value={etDescription}
              onChange={(e) => setEtDescription(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-foreground hover:border-border-strong focus-ring"
            />
          </div>
          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Assignee
            </label>
            <Select<number>
              value={etAssignee}
              onChange={(v) => setEtAssignee(v)}
              options={editMemberOptions}
              placeholder="Unassigned"
              searchable
              emptyText="No members yet"
            />
          </div>
          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Status
            </label>
            <Select<TaskStatus>
              value={etStatus}
              onChange={(v) => setEtStatus(v)}
              options={TASK_STATUS_OPTIONS.map((s) => ({ value: s, label: s }))}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Due date
            </label>
            <DateTimePicker value={etDue} onChange={setEtDue} placeholder="Pick a due date" />
          </div>
        </div>
        {editingTask && (
          <div className="mt-5 border-t border-border pt-5">
            <TaskComments taskId={editingTask.id} />
          </div>
        )}
      </Modal>
    </div>
  );
}
