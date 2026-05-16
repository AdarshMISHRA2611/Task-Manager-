import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { ClipboardCheck, Eye, EyeOff, Lock, Mail } from "lucide-react";
import { useAuth } from "@/services/authContext";
import { getErrorMessage } from "@/services/api";
import { Button } from "@/components/ui/Button";

type Errors = { email?: string; password?: string };

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation() as { state?: { from?: { pathname: string } } };
  const redirectTo = location.state?.from?.pathname || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [errors, setErrors] = useState<Errors>({});

  const mutation = useMutation({
    mutationFn: async () => {
      await login(email.trim(), password);
    },
    onSuccess: () => {
      toast.success("Welcome back");
      navigate(redirectTo, { replace: true });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  function validate(): boolean {
    const next: Errors = {};
    if (!email.trim()) next.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) next.email = "Enter a valid email address";
    if (!password) next.password = "Password is required";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    mutation.mutate();
  }

  return (
    <div className="surface-grid flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md animate-fade-in">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand text-brand-foreground shadow-glow">
            <ClipboardCheck className="h-7 w-7" />
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Welcome to <span className="text-gradient">Team Task Manager</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Sign in to manage your projects and tasks.</p>
        </div>

        <form
          onSubmit={onSubmit}
          noValidate
          className="space-y-5 rounded-2xl bg-surface p-6 shadow-xl ring-1 ring-border"
        >
          <div>
            <label htmlFor="email" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Email
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors((p) => ({ ...p, email: undefined }));
                }}
                placeholder="you@example.com"
                className={`w-full rounded-lg border ${
                  errors.email ? "border-destructive" : "border-border-strong"
                } bg-surface py-2.5 pl-10 pr-3 text-sm text-foreground placeholder:text-subtle transition hover:border-border-strong focus-ring`}
              />
            </div>
            {errors.email && <p className="mt-1.5 text-xs text-destructive">! {errors.email}</p>}
          </div>

          <div>
            <label htmlFor="password" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Password
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
              <input
                id="password"
                type={showPw ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) setErrors((p) => ({ ...p, password: undefined }));
                }}
                placeholder="••••••••"
                className={`w-full rounded-lg border ${
                  errors.password ? "border-destructive" : "border-border-strong"
                } bg-surface py-2.5 pl-10 pr-10 text-sm text-foreground placeholder:text-subtle transition hover:border-border-strong focus-ring`}
              />
              <button
                type="button"
                onClick={() => setShowPw((s) => !s)}
                aria-label={showPw ? "Hide password" : "Show password"}
                className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-surface-muted hover:text-foreground focus-ring"
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && <p className="mt-1.5 text-xs text-destructive">! {errors.password}</p>}
          </div>

          <Button type="submit" className="w-full" disabled={mutation.isPending}>
            {mutation.isPending ? "Signing in..." : "Sign in"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          No account?{" "}
          <Link to="/signup" className="font-semibold text-brand hover:text-brand-hover">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
