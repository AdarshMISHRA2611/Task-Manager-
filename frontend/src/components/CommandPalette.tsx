import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  FolderKanban,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Moon,
  Search,
  Sun,
  UserCircle,
  User as UserIcon,
  Users,
  type LucideIcon,
} from "lucide-react";
import { api } from "@/services/api";
import { useAuth } from "@/services/authContext";
import { qk } from "@/services/queryClient";
import { useTheme } from "@/services/themeContext";
import type { Project, Task, User } from "@/services/types";
import { useBodyScrollLock, useKey } from "@/components/ui/hooks";

type GroupName = "Actions" | "Projects" | "Tasks" | "People";

interface CommandItem {
  id: string;
  label: string;
  secondary?: string;
  group: GroupName;
  icon: LucideIcon;
  keywords?: string;
  onSelect: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

const GROUP_ORDER: GroupName[] = ["Actions", "Projects", "Tasks", "People"];
const PER_GROUP_LIMIT = 8;

export default function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { toggle: toggleTheme, resolved } = useTheme();
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const isAdmin = user?.role === "Admin";

  useBodyScrollLock(open);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIdx(0);
    }
  }, [open]);

  useKey(
    "Escape",
    () => {
      if (open) onClose();
    },
    open
  );

  const projectsQuery = useQuery({
    queryKey: qk.projects,
    queryFn: async () => (await api.get<Project[]>("/api/projects")).data,
    enabled: open,
  });
  const tasksQuery = useQuery({
    queryKey: qk.tasks,
    queryFn: async () => (await api.get<Task[]>("/api/tasks")).data,
    enabled: open,
  });
  const usersQuery = useQuery({
    queryKey: qk.users,
    queryFn: async () => (await api.get<User[]>("/api/users")).data,
    enabled: open && isAdmin,
  });

  const allItems = useMemo<CommandItem[]>(() => {
    const items: CommandItem[] = [
      {
        id: "nav-dashboard",
        group: "Actions",
        label: "Go to Dashboard",
        icon: LayoutDashboard,
        onSelect: () => navigate("/dashboard"),
      },
      {
        id: "nav-projects",
        group: "Actions",
        label: "Go to Projects",
        icon: FolderKanban,
        onSelect: () => navigate("/projects"),
      },
      {
        id: "nav-tasks",
        group: "Actions",
        label: "Go to Tasks",
        icon: ListChecks,
        onSelect: () => navigate("/tasks"),
      },
    ];
    if (isAdmin) {
      items.push({
        id: "nav-team",
        group: "Actions",
        label: "Manage team",
        icon: Users,
        onSelect: () => navigate("/team"),
      });
    }
    items.push(
      {
        id: "nav-profile",
        group: "Actions",
        label: "My profile",
        icon: UserCircle,
        onSelect: () => navigate("/profile"),
      },
      {
        id: "theme-toggle",
        group: "Actions",
        label: `Switch to ${resolved === "dark" ? "light" : "dark"} theme`,
        icon: resolved === "dark" ? Sun : Moon,
        keywords: "theme dark light mode",
        onSelect: toggleTheme,
      },
      {
        id: "sign-out",
        group: "Actions",
        label: "Sign out",
        icon: LogOut,
        keywords: "log out logout",
        onSelect: () => {
          logout();
          navigate("/login", { replace: true });
        },
      }
    );
    (projectsQuery.data ?? []).slice(0, PER_GROUP_LIMIT).forEach((p) =>
      items.push({
        id: `project-${p.id}`,
        group: "Projects",
        label: p.name,
        secondary: p.description ?? undefined,
        icon: FolderKanban,
        keywords: p.description ?? "",
        onSelect: () => navigate(`/projects/${p.id}`),
      })
    );
    (tasksQuery.data ?? []).slice(0, PER_GROUP_LIMIT).forEach((t) =>
      items.push({
        id: `task-${t.id}`,
        group: "Tasks",
        label: t.title,
        secondary: t.status,
        icon: ListChecks,
        keywords: t.description ?? "",
        onSelect: () => navigate(`/projects/${t.project_id}`),
      })
    );
    (usersQuery.data ?? []).slice(0, PER_GROUP_LIMIT).forEach((u) =>
      items.push({
        id: `user-${u.id}`,
        group: "People",
        label: u.name,
        secondary: `${u.email} · ${u.role}`,
        icon: UserIcon,
        keywords: u.email,
        onSelect: () => navigate("/team"),
      })
    );
    return items;
  }, [
    projectsQuery.data,
    tasksQuery.data,
    usersQuery.data,
    isAdmin,
    navigate,
    resolved,
    toggleTheme,
    logout,
  ]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allItems;
    return allItems.filter((it) => {
      const haystack = `${it.label} ${it.secondary ?? ""} ${it.keywords ?? ""}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [allItems, query]);

  const sections = useMemo(() => {
    const groups: Record<GroupName, CommandItem[]> = {
      Actions: [],
      Projects: [],
      Tasks: [],
      People: [],
    };
    filtered.forEach((it) => groups[it.group].push(it));
    return GROUP_ORDER.filter((g) => groups[g].length > 0).map((g) => ({
      name: g,
      items: groups[g],
    }));
  }, [filtered]);

  useEffect(() => {
    if (activeIdx >= filtered.length) setActiveIdx(0);
  }, [filtered, activeIdx]);

  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(`[data-cmd-idx="${activeIdx}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIdx, open]);

  useKey(
    ["ArrowDown", "ArrowUp", "Enter"],
    (e) => {
      if (!open) return;
      const max = Math.max(filtered.length, 1);
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIdx((i) => (i + 1) % max);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIdx((i) => (i - 1 + max) % max);
      } else if (e.key === "Enter") {
        e.preventDefault();
        const item = filtered[activeIdx];
        if (item) {
          item.onSelect();
          onClose();
        }
      }
    },
    open
  );

  if (!open) return null;

  const portal = (
    <div
      className="fixed inset-0 z-[150] flex items-start justify-center bg-slate-900/40 px-4 pt-[10vh] backdrop-blur-sm animate-fade-in"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-label="Command palette"
    >
      <div className="w-full max-w-xl overflow-hidden rounded-2xl bg-surface shadow-2xl ring-1 ring-border">
        <div className="flex items-center gap-2 border-b border-border bg-surface px-4 py-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIdx(0);
            }}
            placeholder="Search projects, tasks, people, actions..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-subtle outline-none"
          />
          <kbd className="rounded border border-border bg-surface-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            Esc
          </kbd>
        </div>
        <div ref={listRef} className="max-h-[60vh] overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <div className="px-3 py-10 text-center text-sm text-muted-foreground">
              No results for &quot;{query}&quot;
            </div>
          ) : (
            sections.map((section) => (
              <div key={section.name} className="mb-2 last:mb-0">
                <div className="px-2 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {section.name}
                </div>
                {section.items.map((it) => {
                  const globalIdx = filtered.indexOf(it);
                  const isActive = globalIdx === activeIdx;
                  const Icon = it.icon;
                  return (
                    <button
                      key={it.id}
                      type="button"
                      data-cmd-idx={globalIdx}
                      onMouseEnter={() => setActiveIdx(globalIdx)}
                      onClick={() => {
                        it.onSelect();
                        onClose();
                      }}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition ${
                        isActive ? "bg-surface-muted text-foreground" : "text-foreground hover:bg-surface-muted"
                      }`}
                    >
                      <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-brand" : "text-muted-foreground"}`} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate">{it.label}</div>
                        {it.secondary && (
                          <div className="truncate text-[11px] text-muted-foreground">{it.secondary}</div>
                        )}
                      </div>
                      <ArrowRight
                        className={`h-3.5 w-3.5 shrink-0 transition ${
                          isActive ? "text-brand opacity-100" : "opacity-0"
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
        <div className="flex items-center justify-between border-t border-border bg-surface-muted px-4 py-2 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-border bg-surface px-1.5 py-0.5">↑↓</kbd> navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-border bg-surface px-1.5 py-0.5">↵</kbd> select
            </span>
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-border bg-surface px-1.5 py-0.5">⌘K</kbd>
            <span className="opacity-60">/</span>
            <kbd className="rounded border border-border bg-surface px-1.5 py-0.5">Ctrl+K</kbd>
          </span>
        </div>
      </div>
    </div>
  );

  return createPortal(portal, document.body);
}
