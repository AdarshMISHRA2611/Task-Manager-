import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ClipboardCheck, LogOut, Menu, ShieldCheck, User as UserIcon, Users } from "lucide-react";
import { useAuth } from "@/services/authContext";
import { useClickOutside, useKey } from "./ui/hooks";
import { useConfirm } from "./ui/ConfirmDialog";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.charAt(0).toUpperCase();
  return (parts[0]!.charAt(0) + parts[parts.length - 1]!.charAt(0)).toUpperCase();
}

export default function Navbar({ onOpenMobile }: { onOpenMobile?: () => void }) {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const confirm = useConfirm();
  const wrapperRef = useClickOutside<HTMLDivElement>(open, () => setOpen(false));

  useKey("Escape", () => setOpen(false), open);

  const handleSignOut = async () => {
    setOpen(false);
    const ok = await confirm({
      title: "Sign out?",
      description: "You will need to sign in again to access your work.",
      confirmLabel: "Sign out",
      tone: "danger",
    });
    if (ok) {
      logout();
      navigate("/login", { replace: true });
    }
  };

  const isAdmin = user?.role === "Admin";

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex items-center gap-2">
          {onOpenMobile && (
            <button
              type="button"
              className="inline-flex rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 md:hidden focus-ring"
              aria-label="Open menu"
              onClick={onOpenMobile}
            >
              <Menu className="h-5 w-5" />
            </button>
          )}
          <Link to="/dashboard" className="flex items-center gap-2 font-semibold text-slate-900">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 text-white ring-1 ring-brand-600/40 shadow-sm">
              <ClipboardCheck className="h-4 w-4" />
            </span>
            <span className="hidden sm:inline">
              <span className="text-gradient">Team</span>
              <span className="text-slate-700"> Task Manager</span>
            </span>
          </Link>
        </div>
        {user && (
          <div className="relative" ref={wrapperRef}>
            <button
              type="button"
              onClick={() => setOpen((s) => !s)}
              className="flex items-center gap-2 rounded-full bg-white px-1 py-1 pr-3 ring-1 ring-slate-200 transition hover:ring-brand-400 focus-ring"
              aria-haspopup="menu"
              aria-expanded={open}
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-[11px] font-bold text-brand-700 ring-1 ring-brand-200">
                {initials(user.name)}
              </span>
              <span className="hidden max-w-[120px] truncate text-xs font-medium text-slate-700 sm:inline">
                {user.name}
              </span>
            </button>
            {open && (
              <div
                role="menu"
                className="absolute right-0 z-50 mt-2 w-64 origin-top-right animate-fade-in overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg"
              >
                <div className="border-b border-slate-200 px-4 py-3">
                  <p className="truncate text-sm font-semibold text-slate-900">{user.name}</p>
                  <p className="truncate text-xs text-slate-500">{user.email}</p>
                  <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-700 ring-1 ring-brand-200">
                    <ShieldCheck className="h-3 w-3" /> {user.role}
                  </span>
                </div>
                <div className="p-1">
                  <Link
                    to="/profile"
                    role="menuitem"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <UserIcon className="h-4 w-4 text-slate-500" /> My profile
                  </Link>
                  {isAdmin && (
                    <Link
                      to="/team"
                      role="menuitem"
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      <Users className="h-4 w-4 text-slate-500" /> Manage team
                    </Link>
                  )}
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleSignOut}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-rose-600 hover:bg-rose-50"
                  >
                    <LogOut className="h-4 w-4" /> Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
