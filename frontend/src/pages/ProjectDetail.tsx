import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  CalendarClock,
  ChevronRight,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  UserCircle2,
  UserPlus,
  Users,
} from "lucide-react";
import { api, getErrorMessage } from "@/services/api";
import { qk } from "@/services/queryClient";
import type {
  Project,
  ProjectMemberDetail,
  Task,
  TaskStatus,
  User,
  UserRole,
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

type ProjectErrors = { name?: string };
type TaskErrors = { title?: string; assigned_to?: string };

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

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const projectId = Number(id);
  const { user } = useAuth();
  const isAdmin = user?.role === "Admin";
  const navigate = useNavigate();
  const confirm = useConfirm();
  const queryClient = useQueryClient();

  const projectQuery = useQuery({
    queryKey: qk.project(projectId),
    queryFn: async () => (await api.get<Project>(`/api/projects/${projectId}`)).data,
    enabled: Number.isFinite(projectId),
  });

  const membersQuery = useQuery({
    queryKey: qk.projectMembers(projectId),
    queryFn: async () =>
      (await api.get<ProjectMemberDetail[]>(`/api/projects/${projectId}/members`)).data,
    enabled: Number.isFinite(projectId),
  });

  const usersQuery = useQuery({
    queryKey: qk.users,
    queryFn: async () => (await api.get<User[]>("/api/users")).data,
    enabled: isAdmin,
  });

  const tasksQuery = useQuery({
    queryKey: qk.tasks,
    queryFn: async () => (await api.get<Task[]>("/api/tasks")).data,
  });

  const projectTasks = useMemo(
    () => (tasksQuery.data ?? []).filter((t) => t.project_id === projectId),
    [tasksQuery.data, projectId],
  );

  // ---- Project settings ----
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editErrors, setEditErrors] = useState<ProjectErrors>({});
  const [editInitialized, setEditInitialized] = useState(false);

  if (projectQuery.data && !editInitialized) {
    setEditName(projectQuery.data.name);
    setEditDescription(projectQuery.data.description ?? "");
    setEditInitialized(true);
  }

  const saveProjectMutation = useMutation({
    mutationFn: async (payload: { name: string; description?: string | null }) =>
      (await api.put<Project>(`/api/projects/${projectId}`, payload)).data,
    onSuccess: () => {
      toast.success("Project updated");
      queryClient.invalidateQueries({ queryKey: qk.project(projectId) });
      queryClient.invalidateQueries({ queryKey: qk.projects });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const deleteProjectMutation = useMutation({
    mutationFn: async () => api.delete(`/api/projects/${projectId}`),
    onSuccess: () => {
      toast.success("Project deleted");
      queryClient.invalidateQueries({ queryKey: qk.projects });
      queryClient.invalidateQueries({ queryKey: qk.tasks });
      queryClient.invalidateQueries({ queryKey: qk.dashboard });
      navigate("/projects");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const onSaveProject = (e: React.FormEvent) => {
    e.preventDefault();
    const next: ProjectErrors = {};
    if (!editName.trim()) next.name = "Project name is required";
    setEditErrors(next);
    if (Object.keys(next).length > 0) return;
    saveProjectMutation.mutate({
      name: editName.trim(),
      description: editDescription.trim() || null,
    });
  };

  const onDeleteProject = async () => {
    const ok = await confirm({
      title: "Delete project?",
      description:
        "This permanently removes the project, its tasks and all member assignments. This cannot be undone.",
      confirmLabel: "Delete project",
      tone: "danger",
    });
    if (!ok) return;
    deleteProjectMutation.mutate();
  };

  // ---- Members ----
  const [memberToAdd, setMemberToAdd] = useState<number | "">("");

  const addMemberMutation = useMutation({
    mutationFn: async (userId: number) =>
      api.post(`/api/projects/${projectId}/members`, { user_id: userId }),
    onSuccess: () => {
      toast.success("Member added");
      setMemberToAdd("");
      queryClient.invalidateQueries({ queryKey: qk.projectMembers(projectId) });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (userId: number) =>
      api.delete(`/api/projects/${projectId}/members/${userId}`),
    onSuccess: () => {
      toast.success("Member removed");
      queryClient.invalidateQueries({ queryKey: qk.projectMembers(projectId) });
      queryClient.invalidateQueries({ queryKey: qk.tasks });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const roleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: number; role: UserRole }) =>
      api.patch(`/api/users/${userId}/role`, { role }),
    onSuccess: () => {
      toast.success("Role updated");
      queryClient.invalidateQueries({ queryKey: qk.projectMembers(projectId) });
      queryClient.invalidateQueries({ queryKey: qk.users });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const memberIdSet = useMemo(
    () => new Set((membersQuery.data ?? []).map((m) => m.user_id)),
    [membersQuery.data],
  );

  const addableUsers = useMemo(
    () => (usersQuery.data ?? []).filter((u) => !memberIdSet.has(u.id)),
    [usersQuery.data, memberIdSet],
  );

  const onAddMember = async () => {
    if (!memberToAdd) return;
    addMemberMutation.mutate(Number(memberToAdd));
  };

  const onRemoveMember = async (m: ProjectMemberDetail) => {
    const ok = await confirm({
      title: `Remove ${m.name}?`,
      description: "They will lose access to this project and its tasks.",
      confirmLabel: "Remove",
      tone: "danger",
    });
    if (!ok) return;
    removeMemberMutation.mutate(m.user_id);
  };

  const onChangeMemberRole = async (m: ProjectMemberDetail, role: UserRole) => {
    if (role === m.role) return;
    if (user && m.user_id === user.id) {
      toast.error("You cannot change your own role.");
      return;
    }
    const verb = role === "Admin" ? "Promote" : "Demote";
    const ok = await confirm({
      title: `${verb} ${m.name}?`,
      description: `This will change their workspace role to ${role}.`,
      confirmLabel: verb,
      tone: role === "Member" ? "danger" : "primary",
    });
    if (!ok) return;
    roleMutation.mutate({ userId: m.user_id, role });
  };

  // ---- Create task ----
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskAssignee, setTaskAssignee] = useState<number | "">("");
  const [taskStatus, setTaskStatus] = useState<TaskStatus>("Todo");
  const [taskDue, setTaskDue] = useState("");
  const [taskErrors, setTaskErrors] = useState<TaskErrors>({});

  const createTaskMutation = useMutation({
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
      setTaskTitle("");
      setTaskDescription("");
      setTaskAssignee("");
      setTaskStatus("Todo");
      setTaskDue("");
      setTaskErrors({});
      queryClient.invalidateQueries({ queryKey: qk.tasks });
      queryClient.invalidateQueries({ queryKey: qk.dashboard });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const onCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    const next: TaskErrors = {};
    if (!taskTitle.trim()) next.title = "Task title is required";
    setTaskErrors(next);
    if (Object.keys(next).length > 0) return;
    createTaskMutation.mutate({
      title: taskTitle.trim(),
      description: taskDescription.trim() || undefined,
      assigned_to: taskAssignee === "" ? null : Number(taskAssignee),
      project_id: projectId,
      due_date: fromLocalInput(taskDue),
      status: taskStatus,
    });
  };

  // ---- Update / delete task ----
  const updateTaskStatusMutation = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: number; status: TaskStatus }) =>
      (await api.put<Task>(`/api/tasks/${taskId}`, { status })).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.tasks });
      queryClient.invalidateQueries({ queryKey: qk.dashboard });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: number) => api.delete(`/api/tasks/${taskId}`),
    onSuccess: () => {
      toast.success("Task deleted");
      queryClient.invalidateQueries({ queryKey: qk.tasks });
      queryClient.invalidateQueries({ queryKey: qk.dashboard });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  // ---- Edit task modal ----
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [etTitle, setEtTitle] = useState("");
  const [etDescription, setEtDescription] = useState("");
  const [etAssignee, setEtAssignee] = useState<number | "">("");
  const [etStatus, setEtStatus] = useState<TaskStatus>("Todo");
  const [etDue, setEtDue] = useState("");
  const [etErrors, setEtErrors] = useState<TaskErrors>({});

  const openEdit = (t: Task) => {
    setEditingTask(t);
    setEtTitle(t.title);
    setEtDescription(t.description ?? "");
    setEtAssignee(t.assigned_to ?? "");
    setEtStatus(t.status);
    setEtDue(toLocalInput(t.due_date));
    setEtErrors({});
  };

  const editTaskMutation = useMutation({
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
    if (!etTitle.trim()) next.title = "Task title is required";
    setEtErrors(next);
    if (Object.keys(next).length > 0) return;
    editTaskMutation.mutate({
      taskId: editingTask.id,
      title: etTitle.trim(),
      description: etDescription.trim() || null,
      assigned_to: etAssignee === "" ? null : Number(etAssignee),
      status: etStatus,
      due_date: fromLocalInput(etDue),
    });
  };

  const onDeleteTask = async (t: Task) => {
    const ok = await confirm({
      title: `Delete "${t.title}"?`,
      description: "This task will be permanently removed.",
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (!ok) return;
    deleteTaskMutation.mutate(t.id);
  };

  // ---- Render ----
  if (!Number.isFinite(projectId)) {
    return (
      <Card>
        <p className="text-sm text-rose-600">Invalid project id.</p>
      </Card>
    );
  }

  if (projectQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (projectQuery.isError || !projectQuery.data) {
    return (
      <Card>
        <p className="text-sm text-rose-600">
          {getErrorMessage(projectQuery.error) || "Could not load project."}
        </p>
        <div className="mt-3">
          <Button variant="ghost" onClick={() => navigate("/projects")}>
            <ArrowLeft className="h-4 w-4" aria-hidden /> Back to projects
          </Button>
        </div>
      </Card>
    );
  }

  const project = projectQuery.data;
  const members = membersQuery.data ?? [];
  const memberOptions = members.map((m) => ({
    value: m.user_id,
    label: m.name,
    description: m.email,
  }));
  const addableOptions = addableUsers.map((u) => ({
    value: u.id,
    label: u.name,
    description: u.email,
  }));

  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-1 text-xs text-slate-500">
        <Link to="/projects" className="hover:text-slate-700">
          Projects
        </Link>
        <ChevronRight className="h-3.5 w-3.5" aria-hidden />
        <span className="text-slate-900">{project.name}</span>
      </nav>

      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{project.name}</h1>
          {project.description && (
            <p className="mt-1 max-w-2xl text-sm text-slate-600">{project.description}</p>
          )}
        </div>
      </header>

      {isAdmin && (
        <Card>
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600 ring-1 ring-brand-200">
              <Pencil className="h-4 w-4" aria-hidden />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Project settings</h2>
              <p className="text-xs text-slate-500">Update name, description or remove this project.</p>
            </div>
          </div>
          <form noValidate onSubmit={onSaveProject} className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Name
              </label>
              <input
                value={editName}
                onChange={(e) => {
                  setEditName(e.target.value);
                  if (editErrors.name) setEditErrors((p) => ({ ...p, name: undefined }));
                }}
                className={`mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 hover:border-slate-400 focus-ring ${
                  editErrors.name ? "border-rose-400" : "border-slate-300"
                }`}
              />
              {editErrors.name && (
                <p className="mt-1 text-xs text-rose-600">! {editErrors.name}</p>
              )}
            </div>
            <div>
              <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Description
              </label>
              <input
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 hover:border-slate-400 focus-ring"
              />
            </div>
            <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-3">
              <Button
                type="button"
                variant="danger"
                onClick={onDeleteProject}
                disabled={deleteProjectMutation.isPending}
              >
                <Trash2 className="h-4 w-4" aria-hidden />
                {deleteProjectMutation.isPending ? "Deleting…" : "Delete project"}
              </Button>
              <Button type="submit" disabled={saveProjectMutation.isPending}>
                {saveProjectMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Saving…
                  </>
                ) : (
                  "Save changes"
                )}
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card>
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600 ring-1 ring-brand-200">
            <Users className="h-4 w-4" aria-hidden />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Team</h2>
            <p className="text-xs text-slate-500">
              {members.length} {members.length === 1 ? "member" : "members"} on this project.
            </p>
          </div>
        </div>

        {isAdmin && (
          <div className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex-1 min-w-[220px]">
              <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Add member
              </label>
              <Select
                value={memberToAdd}
                onChange={(v) => setMemberToAdd(v)}
                options={addableOptions}
                placeholder={
                  addableOptions.length === 0
                    ? "All users are already on this project"
                    : "Choose a user…"
                }
                searchable
                disabled={addableOptions.length === 0}
                emptyText="No matching users"
              />
            </div>
            <Button
              onClick={onAddMember}
              disabled={!memberToAdd || addMemberMutation.isPending}
            >
              {addMemberMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Adding…
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" aria-hidden /> Add to project
                </>
              )}
            </Button>
          </div>
        )}

        {membersQuery.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        ) : members.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No members yet"
            description={isAdmin ? "Add the first teammate above." : "An admin will add members soon."}
          />
        ) : (
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
            {members.map((m) => (
              <li
                key={m.membership_id}
                className="flex flex-wrap items-center justify-between gap-3 px-3 py-2"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700 ring-1 ring-brand-200">
                    {m.name
                      .split(" ")
                      .map((s) => s[0])
                      .filter(Boolean)
                      .slice(0, 2)
                      .join("")
                      .toUpperCase() || "?"}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">{m.name}</p>
                    <p className="truncate text-xs text-slate-500">{m.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isAdmin ? (
                    <Select<UserRole>
                      value={m.role}
                      onChange={(v) => onChangeMemberRole(m, v)}
                      options={[
                        { value: "Admin", label: "Admin" },
                        { value: "Member", label: "Member" },
                      ]}
                      size="sm"
                      disabled={user?.id === m.user_id}
                    />
                  ) : (
                    <span className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-700 ring-1 ring-slate-200">
                      {m.role}
                    </span>
                  )}
                  {isAdmin && (
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => onRemoveMember(m)}
                      disabled={removeMemberMutation.isPending}
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {isAdmin && (
        <Card>
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600 ring-1 ring-brand-200">
              <Plus className="h-4 w-4" aria-hidden />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">New task</h2>
              <p className="text-xs text-slate-500">Assign work to a project member.</p>
            </div>
          </div>
          <form noValidate onSubmit={onCreateTask} className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Title
              </label>
              <input
                value={taskTitle}
                onChange={(e) => {
                  setTaskTitle(e.target.value);
                  if (taskErrors.title) setTaskErrors((p) => ({ ...p, title: undefined }));
                }}
                placeholder="Finalize Q3 roadmap"
                className={`mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 hover:border-slate-400 focus-ring ${
                  taskErrors.title ? "border-rose-400" : "border-slate-300"
                }`}
              />
              {taskErrors.title && (
                <p className="mt-1 text-xs text-rose-600">! {taskErrors.title}</p>
              )}
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Description
              </label>
              <textarea
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
                placeholder="Short brief (optional)"
                rows={3}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 hover:border-slate-400 focus-ring"
              />
            </div>
            <div>
              <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Assignee
              </label>
              <Select<number>
                value={taskAssignee}
                onChange={(v) => setTaskAssignee(v)}
                options={memberOptions}
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
                value={taskStatus}
                onChange={(v) => setTaskStatus(v)}
                options={TASK_STATUS_OPTIONS.map((s) => ({ value: s, label: s }))}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Due date
              </label>
              <DateTimePicker value={taskDue} onChange={setTaskDue} placeholder="Pick a due date" />
            </div>
            <div className="sm:col-span-2 flex justify-end">
              <Button type="submit" disabled={createTaskMutation.isPending}>
                {createTaskMutation.isPending ? (
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
        <div className="flex items-center justify-between px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Tasks</h2>
            <p className="text-xs text-slate-500">
              {projectTasks.length} {projectTasks.length === 1 ? "task" : "tasks"} in this project.
            </p>
          </div>
        </div>
        {tasksQuery.isLoading ? (
          <div className="space-y-2 p-5">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        ) : projectTasks.length === 0 ? (
          <div className="p-5">
            <EmptyState
              icon={CalendarClock}
              title="No tasks yet"
              description={isAdmin ? "Create the first task above." : "No tasks have been assigned to you on this project."}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                <tr>
                  <th scope="col" className="px-5 py-3">
                    Title
                  </th>
                  <th scope="col" className="px-5 py-3">
                    Assignee
                  </th>
                  <th scope="col" className="px-5 py-3">
                    Due
                  </th>
                  <th scope="col" className="px-5 py-3">
                    Status
                  </th>
                  <th scope="col" className="px-5 py-3 text-right">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {projectTasks.map((t) => {
                  const assignee = members.find((m) => m.user_id === t.assigned_to);
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
                      <td className="px-5 py-3 align-top text-slate-700">
                        {assignee ? (
                          <span className="inline-flex items-center gap-2">
                            <UserCircle2 className="h-4 w-4 text-slate-400" aria-hidden />
                            {assignee.name}
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
                              updateTaskStatusMutation.mutate({ taskId: t.id, status: v })
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
                            <Button variant="danger" size="sm" onClick={() => onDeleteTask(t)}>
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
            <Button onClick={onSaveEdit} disabled={editTaskMutation.isPending}>
              {editTaskMutation.isPending ? (
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
              options={memberOptions}
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
