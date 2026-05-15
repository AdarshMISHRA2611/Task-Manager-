import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ChevronRight,
  ClipboardList,
  Pencil,
  Plus,
  Trash2,
  UserMinus,
  Users,
} from "lucide-react";
import toast from "react-hot-toast";
import { api, getErrorMessage } from "@/services/api";
import { qk } from "@/services/queryClient";
import { useAuth } from "@/services/authContext";
import { TASK_STATUS_OPTIONS, type Project, type ProjectMemberDetail, type Task, type TaskStatus, type User } from "@/services/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase() || "?";
}

export default function ProjectDetailPage() {
  const { id } = useParams();
  const projectId = Number(id);
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === "Admin";
  const qc = useQueryClient();

  const projectQ = useQuery({
    queryKey: qk.project(projectId),
    queryFn: () => api.get<Project>(`/api/projects/${projectId}`).then((r) => r.data),
    enabled: Number.isFinite(projectId),
  });

  const membersQ = useQuery({
    queryKey: qk.projectMembers(projectId),
    queryFn: () => api.get<ProjectMemberDetail[]>(`/api/projects/${projectId}/members`).then((r) => r.data),
    enabled: Number.isFinite(projectId),
  });

  const usersQ = useQuery({
    queryKey: qk.users,
    queryFn: () => api.get<User[]>("/api/users").then((r) => r.data),
    enabled: isAdmin && Number.isFinite(projectId),
  });

  const tasksQ = useQuery({
    queryKey: qk.tasks,
    queryFn: () => api.get<Task[]>("/api/tasks").then((r) => r.data),
  });

  const members = membersQ.data ?? [];
  const memberIds = useMemo(() => new Set(members.map((m) => m.user_id)), [members]);
  const inviteCandidates = useMemo(
    () => (usersQ.data ?? []).filter((u) => !memberIds.has(u.id)),
    [usersQ.data, memberIds]
  );

  const tasks = useMemo(
    () => (tasksQ.data ?? []).filter((t) => t.project_id === projectId),
    [tasksQ.data, projectId]
  );

  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [inviteUserId, setInviteUserId] = useState("");

  const [tTitle, setTTitle] = useState("");
  const [tDesc, setTDesc] = useState("");
  const [tAssignee, setTAssignee] = useState("");
  const [tDue, setTDue] = useState("");
  const [tStatus, setTStatus] = useState<TaskStatus>("Queued");

  const [editing, setEditing] = useState<Task | null>(null);
  const [editTaskTitle, setEditTaskTitle] = useState("");
  const [editTaskDesc, setEditTaskDesc] = useState("");
  const [editTaskStatus, setEditTaskStatus] = useState<TaskStatus>("Queued");
  const [editTaskAssignee, setEditTaskAssignee] = useState("");
  const [editTaskDue, setEditTaskDue] = useState("");

  useEffect(() => {
    if (projectQ.data) {
      setEditName(projectQ.data.name);
      setEditDesc(projectQ.data.description || "");
    }
  }, [projectQ.data]);

  useEffect(() => {
    if (editing) {
      setEditTaskTitle(editing.title);
      setEditTaskDesc(editing.description || "");
      setEditTaskStatus(editing.status);
      setEditTaskAssignee(editing.assigned_to != null ? String(editing.assigned_to) : "");
      setEditTaskDue(
        editing.due_date ? new Date(editing.due_date).toISOString().slice(0, 16) : ""
      );
    }
  }, [editing]);

  const invalidateAll = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: qk.project(projectId) }),
      qc.invalidateQueries({ queryKey: qk.projectMembers(projectId) }),
      qc.invalidateQueries({ queryKey: qk.tasks }),
      qc.invalidateQueries({ queryKey: qk.dashboard }),
      qc.invalidateQueries({ queryKey: qk.projects }),
    ]);
  };

  const saveProjectM = useMutation({
    mutationFn: () =>
      api.put(`/api/projects/${projectId}`, { name: editName.trim(), description: editDesc.trim() || null }),
    onSuccess: async () => {
      toast.success("Initiative updated");
      await invalidateAll();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const deleteProjectM = useMutation({
    mutationFn: () => api.delete(`/api/projects/${projectId}`),
    onSuccess: async () => {
      toast.success("Initiative removed");
      await qc.invalidateQueries({ queryKey: qk.projects });
      navigate("/projects");
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const addMemberM = useMutation({
    mutationFn: (user_id: number) => api.post(`/api/projects/${projectId}/members`, { user_id }),
    onSuccess: async () => {
      toast.success("Member added");
      setInviteUserId("");
      await invalidateAll();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const removeMemberM = useMutation({
    mutationFn: (user_id: number) => api.delete(`/api/projects/${projectId}/members/${user_id}`),
    onSuccess: async () => {
      toast.success("Member removed");
      await invalidateAll();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const createTaskM = useMutation({
    mutationFn: () =>
      api.post("/api/tasks", {
        title: tTitle.trim(),
        description: tDesc.trim() || null,
        status: tStatus,
        assigned_to: tAssignee ? Number(tAssignee) : null,
        project_id: projectId,
        due_date: tDue ? new Date(tDue).toISOString() : null,
      }),
    onSuccess: async () => {
      toast.success("Work item added");
      setTTitle("");
      setTDesc("");
      setTAssignee("");
      setTDue("");
      setTStatus("Queued");
      await invalidateAll();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const statusM = useMutation({
    mutationFn: ({ id: tid, status }: { id: number; status: TaskStatus }) =>
      api.put(`/api/tasks/${tid}`, { status }),
    onSuccess: async () => {
      toast.success("Stage updated");
      await invalidateAll();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const updateTaskM = useMutation({
    mutationFn: () =>
      api.put(`/api/tasks/${editing!.id}`, {
        title: editTaskTitle.trim(),
        description: editTaskDesc.trim() || null,
        status: editTaskStatus,
        assigned_to: editTaskAssignee ? Number(editTaskAssignee) : null,
        due_date: editTaskDue ? new Date(editTaskDue).toISOString() : null,
      }),
    onSuccess: async () => {
      toast.success("Item saved");
      setEditing(null);
      await invalidateAll();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const deleteTaskM = useMutation({
    mutationFn: (tid: number) => api.delete(`/api/tasks/${tid}`),
    onSuccess: async () => {
      toast.success("Item removed");
      setEditing(null);
      await invalidateAll();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  if (!Number.isFinite(projectId)) {
    return <p className="text-sm text-rose-400">Invalid initiative.</p>;
  }

  const loading = projectQ.isLoading || membersQ.isLoading || tasksQ.isLoading;

  if (projectQ.isError) {
    return <Card className="border-rose-500/30 text-sm text-rose-200">You cannot open this initiative.</Card>;
  }

  const project = projectQ.data;

  return (
    <div className="space-y-8">
      <nav className="flex flex-wrap items-center gap-1 text-sm text-slate-500">
        <Link to="/projects" className="hover:text-brand-400">
          Initiatives
        </Link>
        <ChevronRight className="h-4 w-4 text-slate-600" />
        <span className="font-medium text-slate-300">{project?.name ?? "…"}</span>
      </nav>

      {loading && !project && (
        <div className="space-y-4">
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-24" />
        </div>
      )}

      {project && (
        <>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">{project.name}</h1>
            <p className="mt-1 text-sm text-slate-500">
              Created {new Date(project.created_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
            </p>
            <p className="mt-3 max-w-3xl text-slate-300">{project.description || "No description yet."}</p>
          </div>

          {isAdmin && (
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <h2 className="text-lg font-semibold text-white">Initiative settings</h2>
                <form
                  className="mt-4 space-y-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    saveProjectM.mutate();
                  }}
                >
                  <div>
                    <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">Name</label>
                    <input
                      className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2.5 text-sm text-white focus-ring"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">Description</label>
                    <textarea
                      rows={3}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2.5 text-sm text-white focus-ring"
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="submit" disabled={saveProjectM.isPending}>
                      Save changes
                    </Button>
                    <Button
                      type="button"
                      variant="danger"
                      disabled={deleteProjectM.isPending}
                      onClick={() => {
                        if (window.confirm("Remove this initiative and every work item inside it?")) deleteProjectM.mutate();
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete initiative
                    </Button>
                  </div>
                </form>
              </Card>

              <Card>
                <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
                  <Users className="h-5 w-5 text-brand-400" />
                  Roster
                </h2>
                <p className="mt-1 text-sm text-slate-500">Pull people in from the organization directory.</p>

                <form
                  className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const uid = Number(inviteUserId);
                    if (!Number.isFinite(uid)) {
                      toast.error("Select a teammate");
                      return;
                    }
                    addMemberM.mutate(uid);
                  }}
                >
                  <div className="min-w-0 flex-1">
                    <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">Add member</label>
                    <select
                      className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2.5 text-sm text-white focus-ring"
                      value={inviteUserId}
                      onChange={(e) => setInviteUserId(e.target.value)}
                    >
                      <option value="">Choose user…</option>
                      {inviteCandidates.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.email}) — {u.role}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Button type="submit" disabled={addMemberM.isPending || !inviteCandidates.length}>
                    <Plus className="h-4 w-4" />
                    Add
                  </Button>
                </form>

                <div className="mt-6 space-y-2">
                  {members.map((m) => (
                    <div
                      key={m.membership_id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-slate-800/80 bg-slate-950/40 px-3 py-2.5"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-600/20 text-xs font-bold text-brand-200 ring-1 ring-brand-500/25">
                          {initials(m.name)}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-white">{m.name}</p>
                          <p className="truncate text-xs text-slate-500">{m.email}</p>
                        </div>
                        <span className="hidden rounded-md bg-slate-800 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-400 sm:inline">
                          {m.role}
                        </span>
                      </div>
                      {isAdmin && m.user_id !== user?.id && (
                        <button
                          type="button"
                          className="shrink-0 rounded-lg p-2 text-slate-500 hover:bg-rose-500/10 hover:text-rose-300 focus-ring"
                          title="Remove member"
                          onClick={() => {
                            if (window.confirm(`Remove ${m.name} from this project?`)) removeMemberM.mutate(m.user_id);
                          }}
                        >
                          <UserMinus className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  {members.length === 0 && <p className="text-sm text-slate-500">No members listed.</p>}
                </div>
              </Card>

              <Card className="lg:col-span-2">
                <h2 className="text-lg font-semibold text-white">Add work item</h2>
                <form
                  className="mt-4 grid gap-4 sm:grid-cols-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    createTaskM.mutate();
                  }}
                >
                  <div className="sm:col-span-2">
                    <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">Title</label>
                    <input
                      className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2.5 text-sm text-white focus-ring"
                      value={tTitle}
                      onChange={(e) => setTTitle(e.target.value)}
                      required
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">Description</label>
                    <textarea
                      rows={2}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2.5 text-sm text-white focus-ring"
                      value={tDesc}
                      onChange={(e) => setTDesc(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">Owner</label>
                    <select
                      className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2.5 text-sm text-white focus-ring"
                      value={tAssignee}
                      onChange={(e) => setTAssignee(e.target.value)}
                    >
                      <option value="">Unassigned</option>
                      {members.map((m) => (
                        <option key={m.user_id} value={m.user_id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">Due</label>
                    <input
                      type="datetime-local"
                      className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2.5 text-sm text-white focus-ring"
                      value={tDue}
                      onChange={(e) => setTDue(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">Stage</label>
                    <select
                      className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2.5 text-sm text-white focus-ring"
                      value={tStatus}
                      onChange={(e) => setTStatus(e.target.value as TaskStatus)}
                    >
                      {TASK_STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <Button type="submit" disabled={createTaskM.isPending}>
                      <Plus className="h-4 w-4" />
                      Add item
                    </Button>
                  </div>
                </form>
              </Card>
            </div>
          )}

          <Card padding={false} className="overflow-hidden">
            <div className="border-b border-slate-800 px-5 py-4">
              <h2 className="text-lg font-semibold text-white">Work items</h2>
              <p className="text-sm text-slate-500">
                {isAdmin ? "Every item tied to this initiative." : "Only items currently assigned to you."}
              </p>
            </div>
            {tasks.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon={ClipboardList}
                  title="No work items yet"
                  description={isAdmin ? "Use the form above to queue the first item." : "You have no assigned items in this initiative."}
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="border-b border-slate-800 bg-slate-900/80">
                    <tr>
                      <th className="px-5 py-3 font-semibold text-slate-400">Item</th>
                      <th className="px-5 py-3 font-semibold text-slate-400">Stage</th>
                      <th className="px-5 py-3 font-semibold text-slate-400">Owner</th>
                      <th className="px-5 py-3 font-semibold text-slate-400">Due</th>
                      <th className="w-40 px-5 py-3 font-semibold text-slate-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {tasks.map((t) => {
                      const assigneeName = members.find((m) => m.user_id === t.assigned_to)?.name;
                      return (
                        <tr key={t.id} className="hover:bg-slate-800/20">
                          <td className="px-5 py-4 font-medium text-white">{t.title}</td>
                          <td className="px-5 py-4">
                            <StatusBadge status={t.status} />
                          </td>
                          <td className="px-5 py-4 text-slate-400">{assigneeName ?? (t.assigned_to ? `#${t.assigned_to}` : "—")}</td>
                          <td className="px-5 py-4 text-slate-500">{t.due_date ? new Date(t.due_date).toLocaleString() : "—"}</td>
                          <td className="px-5 py-4">
                            {isAdmin && (
                              <div className="flex flex-wrap gap-2">
                                <Button variant="secondary" size="sm" onClick={() => setEditing(t)}>
                                  <Pencil className="h-3.5 w-3.5" />
                                  Edit
                                </Button>
                              </div>
                            )}
                            {!isAdmin && t.assigned_to === user?.id && (
                              <select
                                className="w-full max-w-[180px] rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-white focus-ring"
                                value={t.status}
                                onChange={(e) =>
                                  statusM.mutate({ id: t.id, status: e.target.value as TaskStatus })
                                }
                              >
                                {TASK_STATUS_OPTIONS.map((s) => (
                                  <option key={s} value={s}>
                                    {s}
                                  </option>
                                ))}
                              </select>
                            )}
                            {!isAdmin && t.assigned_to !== user?.id && <span className="text-slate-600">—</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}

      {editing && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center"
          onClick={() => setEditing(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-white">Edit work item</h3>
            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">Title</label>
                <input
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white focus-ring"
                  value={editTaskTitle}
                  onChange={(e) => setEditTaskTitle(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">Description</label>
                <textarea
                  rows={3}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white focus-ring"
                  value={editTaskDesc}
                  onChange={(e) => setEditTaskDesc(e.target.value)}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">Stage</label>
                  <select
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white focus-ring"
                    value={editTaskStatus}
                    onChange={(e) => setEditTaskStatus(e.target.value as TaskStatus)}
                  >
                    {TASK_STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">Owner</label>
                  <select
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white focus-ring"
                    value={editTaskAssignee}
                    onChange={(e) => setEditTaskAssignee(e.target.value)}
                  >
                    <option value="">Unassigned</option>
                    {members.map((m) => (
                      <option key={m.user_id} value={m.user_id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">Due</label>
                <input
                  type="datetime-local"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white focus-ring"
                  value={editTaskDue}
                  onChange={(e) => setEditTaskDue(e.target.value)}
                />
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              <Button
                onClick={() => {
                  if (!editTaskTitle.trim()) {
                    toast.error("Title required");
                    return;
                  }
                  updateTaskM.mutate();
                }}
                disabled={updateTaskM.isPending}
              >
                Save item
              </Button>
              <Button variant="secondary" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                disabled={deleteTaskM.isPending}
                onClick={() => {
                  if (window.confirm("Remove this work item permanently?")) deleteTaskM.mutate(editing.id);
                }}
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
