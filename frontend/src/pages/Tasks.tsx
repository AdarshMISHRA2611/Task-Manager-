import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  ListChecks,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  UserCircle2,
} from "lucide-react";
import { api, getErrorMessage } from "@/services/api";
import { qk } from "@/services/queryClient";
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
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Select } from "@/components/ui/Select";
import { DateTimePicker } from "@/components/ui/DateTimePicker";
import { Modal } from "@/components/ui/Modal";
import { useConfirm } from "@/components/ui/ConfirmDialog";

type TaskErrors = { title?: string; project_id?: string };

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

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Tasks</h1>
          <p className="mt-1 text-sm text-slate-600">
            {isAdmin ? "Every task across the workspace." : "Tasks assigned to you."}
          </p>
        </div>
      </header>

      {isAdmin && (
        <Card>
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600 ring-1 ring-brand-200">
              <Plus className="h-4 w-4" aria-hidden />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">New task</h2>
              <p className="text-xs text-slate-500">Pick a project and assign a member.</p>
            </div>
          </div>
          <form noValidate onSubmit={onCreate} className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
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
                <p className="mt-1 text-xs text-rose-600">! {newErrors.project_id}</p>
              )}
            </div>
            <div>
              <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
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
              <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Title
              </label>
              <input
                value={newTitle}
                onChange={(e) => {
                  setNewTitle(e.target.value);
                  if (newErrors.title) setNewErrors((p) => ({ ...p, title: undefined }));
                }}
                placeholder="Ship onboarding flow"
                className={`mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 hover:border-slate-400 focus-ring ${
                  newErrors.title ? "border-rose-400" : "border-slate-300"
                }`}
              />
              {newErrors.title && (
                <p className="mt-1 text-xs text-rose-600">! {newErrors.title}</p>
              )}
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Description
              </label>
              <textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Short brief (optional)"
                rows={3}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 hover:border-slate-400 focus-ring"
              />
            </div>
            <div>
              <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Status
              </label>
              <Select<TaskStatus>
                value={newStatus}
                onChange={(v) => setNewStatus(v)}
                options={TASK_STATUS_OPTIONS.map((s) => ({ value: s, label: s }))}
              />
            </div>
            <div>
              <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Due date
              </label>
              <DateTimePicker value={newDue} onChange={setNewDue} placeholder="Pick a due date" />
            </div>
            <div className="sm:col-span-2 flex justify-end">
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Creating…
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

      <Card padding={false}>
        {tasksQuery.isLoading ? (
          <div className="space-y-2 p-5">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="p-5">
            <EmptyState
              icon={ListChecks}
              title="No tasks yet"
              description={
                isAdmin
                  ? "Create the first task above."
                  : "Nothing has been assigned to you yet."
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
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
              <tbody className="divide-y divide-slate-100">
                {tasks.map((t) => {
                  const project = projectsById.get(t.project_id);
                  const canChangeStatus =
                    isAdmin || (user?.id !== undefined && t.assigned_to === user.id);
                  return (
                    <tr key={t.id} className="transition hover:bg-slate-50">
                      <td className="px-5 py-3 align-top">
                        <p className="font-medium text-slate-900">{t.title}</p>
                        {t.description && (
                          <p className="mt-0.5 line-clamp-2 text-xs text-slate-600">
                            {t.description}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-3 align-top">
                        {project ? (
                          <Link
                            to={`/projects/${project.id}`}
                            className="text-slate-700 hover:text-brand-700"
                          >
                            {project.name}
                          </Link>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3 align-top text-slate-700">
                        {t.assigned_to ? (
                          <span className="inline-flex items-center gap-2">
                            <UserCircle2 className="h-4 w-4 text-slate-400" aria-hidden />
                            {t.assigned_to === user?.id ? "You" : `User #${t.assigned_to}`}
                          </span>
                        ) : (
                          <span className="text-slate-400">Unassigned</span>
                        )}
                      </td>
                      <td className="px-5 py-3 align-top text-slate-700">
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
        )}
      </Card>

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
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Saving…
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
            <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Title
            </label>
            <input
              value={etTitle}
              onChange={(e) => {
                setEtTitle(e.target.value);
                if (etErrors.title) setEtErrors((p) => ({ ...p, title: undefined }));
              }}
              className={`mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 hover:border-slate-400 focus-ring ${
                etErrors.title ? "border-rose-400" : "border-slate-300"
              }`}
            />
            {etErrors.title && (
              <p className="mt-1 text-xs text-rose-600">! {etErrors.title}</p>
            )}
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Description
            </label>
            <textarea
              value={etDescription}
              onChange={(e) => setEtDescription(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 hover:border-slate-400 focus-ring"
            />
          </div>
          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
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
            <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Status
            </label>
            <Select<TaskStatus>
              value={etStatus}
              onChange={(v) => setEtStatus(v)}
              options={TASK_STATUS_OPTIONS.map((s) => ({ value: s, label: s }))}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Due date
            </label>
            <DateTimePicker value={etDue} onChange={setEtDue} placeholder="Pick a due date" />
          </div>
        </div>
      </Modal>
    </div>
  );
}
