import { NavLink } from "react-router-dom";
import { ClipboardList, FolderKanban, LayoutDashboard, Users, X } from "lucide-react";
import clsx from "clsx";
import { useAuth } from "@/services/authContext";

type LinkDef = { to: string; label: string; icon: typeof LayoutDashboard; adminOnly?: boolean };

const links: LinkDef[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/projects", label: "Projects", icon: FolderKanban },
  { to: "/tasks", label: "Tasks", icon: ClipboardList },
  { to: "/team", label: "Team", icon: Users, adminOnly: true },
];

export default function Sidebar({
  mobileOpen,
  onCloseMobile,
}: {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}) {
  const { user } = useAuth();
  const isAdmin = user?.role === "Admin";
  const visible = links.filter((l) => !l.adminOnly || isAdmin);

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    clsx(
      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition",
      isActive
        ? "bg-brand-50 text-brand-700 border-l-2 border-brand-600"
        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 border-l-2 border-transparent"
    );

  const nav = (
    <nav className="space-y-1 p-3">
      <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">Navigate</p>
      {visible.map(({ to, label, icon: Icon }) => (
        <NavLink key={to} to={to} className={linkClass} onClick={() => onCloseMobile?.()}>
          <Icon className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
          {label}
        </NavLink>
      ))}
    </nav>
  );

  return (
    <>
      <aside className="hidden w-56 shrink-0 border-r border-slate-200 bg-white md:block">{nav}</aside>

      <div
        className={clsx(
          "fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm transition md:hidden",
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        aria-hidden={!mobileOpen}
        onClick={() => onCloseMobile?.()}
      />
      <aside
        className={clsx(
          "fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] border-r border-slate-200 bg-white shadow-2xl transition-transform duration-200 md:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-3 py-3">
          <span className="text-sm font-semibold text-slate-900">Navigate</span>
          <button
            type="button"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus-ring"
            aria-label="Close menu"
            onClick={() => onCloseMobile?.()}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {nav}
      </aside>
    </>
  );
}
