import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { FolderPlus, FolderKanban } from "lucide-react";
import toast from "react-hot-toast";
import { api, getErrorMessage } from "@/services/api";
import { qk } from "@/services/queryClient";
import { useAuth } from "@/services/authContext";
import type { Project } from "@/services/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";

export default function ProjectsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "Admin";
  const qc = useQueryClient();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const listQ = useQuery({
    queryKey: qk.projects,
    queryFn: () => api.get<Project[]>("/api/projects").then((r) => r.data),
  });

  const createM = useMutation({
    mutationFn: (body: { name: string; description: string | null }) => api.post<Project>("/api/projects", body),
    onSuccess: async () => {
      toast.success("Initiative created");
      setName("");
      setDescription("");
      await qc.invalidateQueries({ queryKey: qk.projects });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Initiatives</h1>
        <p className="mt-1 text-sm text-slate-400">Group related delivery into initiatives and share them with your roster.</p>
      </div>

      {isAdmin && (
        <Card>
          <h2 className="text-lg font-semibold text-white">Start an initiative</h2>
          <p className="mt-1 text-sm text-slate-500">You join automatically so you can own or delegate work items.</p>
          <form
            className="mt-5 grid gap-4 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              createM.mutate({ name: name.trim(), description: description.trim() || null });
            }}
          >
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">Name</label>
              <input
                className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2.5 text-sm text-white focus-ring"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="e.g. Website relaunch"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">Description</label>
              <textarea
                rows={3}
                className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2.5 text-sm text-white focus-ring"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional context for your team"
              />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={createM.isPending}>
                <FolderPlus className="h-4 w-4" />
                {createM.isPending ? "Creating…" : "Launch initiative"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {listQ.isLoading && (
        <div className="space-y-3">
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
        </div>
      )}

      {listQ.isError && (
        <Card className="border-rose-500/30 bg-rose-950/20 text-sm text-rose-200">Could not load initiatives.</Card>
      )}

      {listQ.isSuccess && listQ.data.length === 0 && (
        <EmptyState
          icon={FolderKanban}
          title="No initiatives yet"
          description={isAdmin ? "Launch one above to start queuing work items." : "Ask an admin to add you to an initiative."}
        />
      )}

      {listQ.isSuccess && listQ.data.length > 0 && (
        <Card padding={false} className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="border-b border-slate-800 bg-slate-900/80">
                <tr>
                  <th className="px-5 py-3 font-semibold text-slate-400">Initiative</th>
                  <th className="px-5 py-3 font-semibold text-slate-400">Description</th>
                  <th className="w-28 px-5 py-3 font-semibold text-slate-400" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {listQ.data.map((p) => (
                  <tr key={p.id} className="transition hover:bg-slate-800/30">
                    <td className="px-5 py-4 font-medium text-white">{p.name}</td>
                    <td className="max-w-md truncate px-5 py-4 text-slate-400">{p.description || "—"}</td>
                    <td className="px-5 py-4">
                      <Link
                        to={`/projects/${p.id}`}
                        className="font-medium text-brand-400 hover:text-brand-300"
                      >
                        Open →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
