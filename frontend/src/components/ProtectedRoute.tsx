import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/services/authContext";

export default function ProtectedRoute() {
  const { token, loading } = useAuth();
  const loc = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-950 text-slate-400">
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" aria-hidden />
        <p className="text-sm">Loading workspace…</p>
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  }

  return <Outlet />;
}
