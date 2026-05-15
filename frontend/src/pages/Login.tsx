import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { ArrowRight, Lock, Mail } from "lucide-react";
import { getErrorMessage } from "@/services/api";
import { useAuth } from "@/services/authContext";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from || "/dashboard";
  const qc = useQueryClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const mutation = useMutation({
    mutationFn: () => login(email, password),
    onSuccess: async () => {
      toast.success("Welcome back");
      await qc.invalidateQueries();
      navigate(from, { replace: true });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  return (
    <div className="surface-grid flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md animate-fade-in">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-white">Sign in</h1>
          <p className="mt-2 text-sm text-slate-400">Ethara — initiatives, roster, and tracked delivery.</p>
        </div>
        <Card>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              mutation.mutate();
            }}
          >
            <div>
              <label htmlFor="email" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                Email
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/80 py-2.5 pl-10 pr-3 text-sm text-white placeholder:text-slate-600 focus-ring"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>
            <div>
              <label htmlFor="password" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                Password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/80 py-2.5 pl-10 pr-3 text-sm text-white placeholder:text-slate-600 focus-ring"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={mutation.isPending}>
              {mutation.isPending ? "Signing in…" : "Continue"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-slate-400">
            New here?{" "}
            <Link to="/signup" className="font-medium text-brand-400 hover:text-brand-300">
              Create an account
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
}
