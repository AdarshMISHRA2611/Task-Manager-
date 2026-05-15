import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { FolderKanban, Plus, ArrowRight, Loader2 } from "lucide-react";
import { api, getErrorMessage } from "@/services/api";
import { qk } from "@/services/queryClient";
import type { Project } from "@/services/types";
import { useAuth } from "@/services/authContext";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";

type Errors = { name?: string; description?: string };

export default function ProjectsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "Admin";
  const queryClient = useQueryClient();

  const projectsQuery = useQuery({
    queryKey: qk.projects,
    queryFn: async () => (await api.get<Project[]>("/api/projects")).data,
  });

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState<Errors>({});

  const createMutation = useMutation({
    mutationFn: async (payload: { name: string; description?: string }) =>
      (await api.post<Project>("/api/projects", payload)).data,
    onSuccess: () => {
      toast.success("Project created");
      setName("");
      setDescription("");
      setErrors({});
      queryClient.invalidateQueries({ queryKey: qk.projects });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const validate = (): Errors => {
    const next: Errors = {};
    if (!name.trim()) next.name = "Project name is required";
    else if (name.trim().length < 2) next.name = "Name must be at least 2 characters";
    return next;
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const v = validate();
    setErrors(v);
    if (Object.keys(v).length > 0) return;
    createMutation.mutate({
      name: name.trim(),
      description: description.trim() || undefined,
    });
  };

  const projects = useMemo(() => projectsQuery.data ?? [], [projectsQuery.data]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Projects</h1>
          <p className="mt-1 text-sm text-slate-600">
            {isAdmin
              ? "Every project in the workspace."
              : "Projects you have been added to."}
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
              <h2 className="text-sm font-semibold text-slate-900">New project</h2>
              <p className="text-xs text-slate-500">Spin up a workspace for your team.</p>
            </div>
          </div>

          <form noValidate onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Name
              </label>
              <input
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
                }}
                placeholder="Atlas migration"
                className={`mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition hover:border-slate-400 focus-ring ${
                  errors.name ? "border-rose-400" : "border-slate-300"
                }`}
              />
              {errors.name && (
                <p className="mt-1 text-xs text-rose-600">! {errors.name}</p>
              )}
            </div>
            <div>
              <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Description
              </label>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Short summary (optional)"
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition hover:border-slate-400 focus-ring"
              />
            </div>
            <div className="sm:col-span-2 flex justify-end">
              <Button
                type="submit"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Creating…
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" aria-hidden /> Create project
                  </>
                )}
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card padding={false}>
        {projectsQuery.isLoading ? (
          <div className="space-y-3 p-6">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-5 w-2/3" />
          </div>
        ) : projects.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={FolderKanban}
              title="No projects yet"
              description={
                isAdmin
                  ? "Create your first project to get started."
                  : "Ask an admin to add you to a project."
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                <tr>
                  <th scope="col" className="px-5 py-3">
                    Name
                  </th>
                  <th scope="col" className="px-5 py-3">
                    Description
                  </th>
                  <th scope="col" className="px-5 py-3 text-right">
                    <span className="sr-only">Open</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {projects.map((p) => (
                  <tr key={p.id} className="transition hover:bg-slate-50">
                    <td className="px-5 py-3 align-top">
                      <Link
                        to={`/projects/${p.id}`}
                        className="font-medium text-slate-900 hover:text-brand-700"
                      >
                        {p.name}
                      </Link>
                    </td>
                    <td className="px-5 py-3 align-top text-slate-600">
                      {p.description || <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-5 py-3 text-right align-top">
                      <Link
                        to={`/projects/${p.id}`}
                        className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700"
                      >
                        Open <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
