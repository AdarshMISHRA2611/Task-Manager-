import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ClipboardList, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { api, getErrorMessage } from "@/services/api";
import { qk } from "@/services/queryClient";
import { useAuth } from "@/services/authContext";
import { TASK_STATUS_OPTIONS, type Project, type Task, type TaskStatus } from "@/services/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Skeleton } from "@/components/ui/Skeleton";

export default function TasksPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "Admin";
  const qc = useQueryClient();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [due, setDue] = useState("");
  const [status, setStatus] = useState<TaskStatus>("Queued");

  const projectsQ = useQuery({
    queryKey: qk.projects,
    queryFn: () => api.get<Project[]>("/api/projects").then((r) => r.data),
  });

  const tasksQ = useQuery({
    queryKey: qk.tasks,
    queryFn: () => api.get<Task[]>("/api/tasks").then((r) => r.data),
  });

  const projects = projectsQ.data ?? [];
  const tasks = tasksQ.data ?? [];

  useEffect(() => {
    if (!projectId && projects.length) setProjectId(String(projects[0].id));
  }, [projects, projectId]);

  const createM = useMutation({
    mutationFn: () =>
      api.post("/api/tasks", {
        title: title.trim(),
        description: description.trim() || null,
        status,
        assigned_to: assignedTo ? Number(assignedTo) : null,
        project_id: Number(projectId),
        due_date: due ? new Date(due).toISOString() : null,
      }),
    onSuccess: async () => {
      toast.success("Work item added");
      setTitle("");
      setDescription("");
      setAssignedTo("");
      setDue("");
      setStatus("Queued");
      await qc.invalidateQueries({ queryKey: qk.tasks });
      await qc.invalidateQueries({ queryKey: qk.dashboard });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const statusM = useMutation({
    mutationFn: ({ id, status: s }: { id: number; status: TaskStatus }) => api.put(`/api/tasks/${id}`, { status: s }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: qk.tasks });
      await qc.invalidateQueries({ queryKey: qk.dashboard });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const deleteM = useMutation({
    mutationFn: (id: number) => api.delete(`/api/tasks/${id}`),
    onSuccess: async () => {
      toast.success("Item removed");
      await qc.invalidateQueries({ queryKey: qk.tasks });
      await qc.invalidateQueries({ queryKey: qk.dashboard });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const loading = tasksQ.isLoading || projectsQ.isLoading;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Work items</h1>
        <p className="mt-1 text-sm text-slate-400">Queue work, assign owners, and follow progress across initiatives.</p>
      </div>

      {isAdmin && (
        <Card>
          <h2 className="text-lg font-semibold text-white">New work item</h2>
          <p className="mt-1 text-sm text-slate-500">Owners must already belong to the selected project.</p>
          <form
            className="mt-5 grid gap-4 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              createM.mutate();
            }}
          >
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">Title</label>
              <input
                className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2.5 text-sm text-white focus-ring"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">Description</label>
              <textarea
                rows={2}
                className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2.5 text-sm text-white focus-ring"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">Initiative</label>
              <select
                className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2.5 text-sm text-white focus-ring"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                required
                disabled={!projects.length}
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">Owner (user id)</label>
              <input
                className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2.5 text-sm text-white focus-ring"
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                placeholder="Optional"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">Due</label>
              <input
                type="datetime-local"
                className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2.5 text-sm text-white focus-ring"
                value={due}
                onChange={(e) => setDue(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">Stage</label>
              <select
                className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2.5 text-sm text-white focus-ring"
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
              >
                {TASK_STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={createM.isPending || !projects.length}>
                <Plus className="h-4 w-4" />
                {createM.isPending ? "Saving…" : "Add item"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {loading && (
        <div className="space-y-3">
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
        </div>
      )}

      {!loading && tasks.length === 0 && (
        <EmptyState
          icon={ClipboardList}
          title="Nothing in the queue"
          description="Items assigned to you — or everything, if you are an admin — show up here."
        />
      )}

      {!loading && tasks.length > 0 && (
        <Card padding={false} className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-slate-800 bg-slate-900/80">
                <tr>
                  <th className="px-5 py-3 font-semibold text-slate-400">Item</th>
                  <th className="px-5 py-3 font-semibold text-slate-400">Initiative</th>
                  <th className="px-5 py-3 font-semibold text-slate-400">Status</th>
                  <th className="px-5 py-3 font-semibold text-slate-400">Owner</th>
                  <th className="px-5 py-3 font-semibold text-slate-400">Due</th>
                  <th className="w-36 px-5 py-3 font-semibold text-slate-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {tasks.map((t) => {
                  const pname = projects.find((p) => p.id === t.project_id)?.name ?? `#${t.project_id}`;
                  return (
                    <tr key={t.id} className="transition hover:bg-slate-800/30">
                      <td className="px-5 py-4 font-medium text-white">
                        <Link to={`/projects/${t.project_id}`} className="text-brand-400 hover:text-brand-300">
                          {t.title}
                        </Link>
                      </td>
                      <td className="px-5 py-4 text-slate-400">{pname}</td>
                      <td className="px-5 py-4">
                        <StatusBadge status={t.status} />
                      </td>
                      <td className="px-5 py-4 text-slate-400">{t.assigned_to ?? "—"}</td>
                      <td className="px-5 py-4 text-slate-400">{t.due_date ? new Date(t.due_date).toLocaleString() : "—"}</td>
                      <td className="px-5 py-4">
                        {isAdmin && (
                          <Button
                            variant="danger"
                            size="sm"
                            disabled={deleteM.isPending}
                            onClick={() => {
                              if (window.confirm("Remove this work item?")) deleteM.mutate(t.id);
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                          </Button>
                        )}
                        {!isAdmin && t.assigned_to === user?.id && (
                          <select
                            className="w-full max-w-[160px] rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-white focus-ring"
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
        </Card>
      )}
    </div>
  );
}
