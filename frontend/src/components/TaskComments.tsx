import { useState, type KeyboardEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { MessageSquare, Send, Trash2 } from "lucide-react";
import { api, getErrorMessage } from "@/services/api";
import { qk } from "@/services/queryClient";
import { useAuth } from "@/services/authContext";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { Skeleton } from "@/components/ui/Skeleton";
import type { Comment } from "@/services/types";

interface Props {
  taskId: number;
}

function formatRelative(iso: string): string {
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 30) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.charAt(0).toUpperCase();
  return (parts[0]!.charAt(0) + parts[parts.length - 1]!.charAt(0)).toUpperCase();
}

export default function TaskComments({ taskId }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const confirm = useConfirm();
  const [body, setBody] = useState("");

  const query = useQuery({
    queryKey: qk.taskComments(taskId),
    queryFn: async () => (await api.get<Comment[]>(`/api/tasks/${taskId}/comments`)).data,
  });

  const createMutation = useMutation({
    mutationFn: async (text: string) =>
      (await api.post<Comment>("/api/comments", { task_id: taskId, body: text })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.taskComments(taskId) });
      setBody("");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => api.delete(`/api/comments/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.taskComments(taskId) }),
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  function submit() {
    const trimmed = body.trim();
    if (!trimmed || createMutation.isPending) return;
    createMutation.mutate(trimmed);
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  async function onDelete(c: Comment) {
    const ok = await confirm({
      title: "Delete comment?",
      description: "This action cannot be undone.",
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (ok) deleteMutation.mutate(c.id);
  }

  const isAdmin = user?.role === "Admin";
  const comments = query.data ?? [];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Comments
        </span>
        {comments.length > 0 && (
          <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground ring-1 ring-border">
            {comments.length}
          </span>
        )}
      </div>

      <div className="space-y-3">
        {query.isLoading && (
          <>
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </>
        )}
        {!query.isLoading && comments.length === 0 && (
          <p className="rounded-lg border border-dashed border-border bg-surface-muted px-3 py-4 text-center text-xs text-muted-foreground">
            No comments yet. Start the discussion below.
          </p>
        )}
        {comments.map((c) => {
          const own = c.user_id === user?.id;
          const canDelete = (own || isAdmin) && c.deleted_at === null;
          return (
            <div key={c.id} className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-subtle text-[10px] font-bold text-brand-subtle-foreground ring-1 ring-brand-subtle-border">
                {initials(c.user_name)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">{c.user_name}</span>
                  {own && (
                    <span className="rounded bg-brand-subtle px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-subtle-foreground">
                      You
                    </span>
                  )}
                  <span className="text-[11px] text-muted-foreground">
                    {formatRelative(c.created_at)}
                  </span>
                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => onDelete(c)}
                      disabled={deleteMutation.isPending}
                      className="ml-auto inline-flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition hover:bg-destructive-subtle hover:text-destructive disabled:opacity-50 focus-ring"
                      aria-label="Delete comment"
                      title="Delete comment"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                {c.deleted_at ? (
                  <p className="mt-0.5 text-sm italic text-subtle">Comment deleted</p>
                ) : (
                  <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-foreground">
                    {c.body}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-lg border border-border-strong bg-input p-2 focus-within:border-brand transition">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Write a comment..."
          rows={2}
          maxLength={2000}
          className="w-full resize-none bg-transparent text-sm text-foreground placeholder:text-subtle outline-none"
        />
        <div className="flex items-center justify-between gap-2 pt-1">
          <span className="text-[10px] text-muted-foreground">
            <kbd className="rounded border border-border bg-surface-muted px-1 py-0.5">Enter</kbd>{" "}
            send ·{" "}
            <kbd className="rounded border border-border bg-surface-muted px-1 py-0.5">
              Shift+Enter
            </kbd>{" "}
            newline
          </span>
          <button
            type="button"
            onClick={submit}
            disabled={!body.trim() || createMutation.isPending}
            className="inline-flex items-center gap-1 rounded-md bg-brand px-3 py-1 text-xs font-semibold text-brand-foreground transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50 focus-ring"
          >
            <Send className="h-3.5 w-3.5" />
            {createMutation.isPending ? "Sending..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}
