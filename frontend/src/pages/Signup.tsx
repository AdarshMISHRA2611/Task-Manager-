import { useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { ClipboardCheck, Eye, EyeOff, Lock, Mail, ShieldCheck, User as UserIcon } from "lucide-react";
import { useAuth } from "@/services/authContext";
import { getErrorMessage } from "@/services/api";
import { Button } from "@/components/ui/Button";
import type { UserRole } from "@/services/types";

type Errors = { name?: string; email?: string; password?: string };

const ROLES: UserRole[] = ["Member", "Admin"];
const ADMIN_EMAIL_DOMAIN = "@ethara.ai";

function strengthOf(pw: string): { score: 0 | 1 | 2 | 3 | 4 | 5; label: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const labels = ["", "Weak", "Fair", "Good", "Strong", "Excellent"];
  return { score: score as 0 | 1 | 2 | 3 | 4 | 5, label: labels[score]! };
}

const STRENGTH_COLORS = [
  "bg-border",
  "bg-rose-400",
  "bg-orange-400",
  "bg-amber-400",
  "bg-lime-500",
  "bg-emerald-500",
];

export default function SignupPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();

  const [role, setRole] = useState<UserRole>("Member");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [errors, setErrors] = useState<Errors>({});

  const pwStrength = useMemo(() => strengthOf(password), [password]);
  const trimmedEmail = email.trim().toLowerCase();
  const adminEmailValid = trimmedEmail.endsWith(ADMIN_EMAIL_DOMAIN);
  const showAdminWarning = role === "Admin" && trimmedEmail.length > 0 && !adminEmailValid;

  const mutation = useMutation({
    mutationFn: async () => {
      await signup(name.trim(), email.trim(), password, role);
    },
    onSuccess: () => {
      toast.success("Account created. Welcome aboard.");
      navigate("/dashboard", { replace: true });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  function validate(): boolean {
    const next: Errors = {};
    if (!name.trim()) next.name = "Name is required";
    if (!email.trim()) next.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) next.email = "Enter a valid email address";
    else if (role === "Admin" && !email.trim().toLowerCase().endsWith(ADMIN_EMAIL_DOMAIN)) {
      next.email = `Admin signup requires an ${ADMIN_EMAIL_DOMAIN} email address`;
    }
    if (!password) next.password = "Password is required";
    else if (password.length < 8) next.password = "Use at least 8 characters";
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
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Create your account</h1>
          <p className="mt-1 text-sm text-muted-foreground">Start collaborating with your team.</p>
        </div>

        <form
          onSubmit={onSubmit}
          noValidate
          className="space-y-5 rounded-2xl bg-surface p-6 shadow-xl ring-1 ring-border"
        >
          <div>
            <div
              role="radiogroup"
              aria-label="Account role"
              className="flex w-full gap-1 rounded-lg border border-border-strong bg-surface-muted p-1"
            >
              {ROLES.map((r) => (
                <button
                  key={r}
                  type="button"
                  role="radio"
                  aria-checked={role === r}
                  onClick={() => {
                    setRole(r);
                    if (errors.email) setErrors((p) => ({ ...p, email: undefined }));
                  }}
                  className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition focus-ring ${
                    role === r
                      ? "bg-brand text-brand-foreground shadow-sm"
                      : "text-foreground hover:bg-surface"
                  }`}
                >
                  Sign up as {r}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              {role === "Admin"
                ? `Admin signup requires an ${ADMIN_EMAIL_DOMAIN} email address.`
                : "Members can be promoted to Admin later by an existing Admin."}
            </p>
          </div>

          <div>
            <label htmlFor="name" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Name
            </label>
            <div className="relative">
              <UserIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
              <input
                id="name"
                type="text"
                autoComplete="name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errors.name) setErrors((p) => ({ ...p, name: undefined }));
                }}
                placeholder="Jane Doe"
                className={`w-full rounded-lg border ${
                  errors.name ? "border-destructive" : "border-border-strong"
                } bg-surface py-2.5 pl-10 pr-3 text-sm text-foreground placeholder:text-subtle transition hover:border-border-strong focus-ring`}
              />
            </div>
            {errors.name && <p className="mt-1.5 text-xs text-destructive">! {errors.name}</p>}
          </div>

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
                placeholder={role === "Admin" ? `you${ADMIN_EMAIL_DOMAIN}` : "you@example.com"}
                className={`w-full rounded-lg border ${
                  errors.email || showAdminWarning ? "border-destructive" : "border-border-strong"
                } bg-surface py-2.5 pl-10 pr-3 text-sm text-foreground placeholder:text-subtle transition hover:border-border-strong focus-ring`}
              />
            </div>
            {errors.email && <p className="mt-1.5 text-xs text-destructive">! {errors.email}</p>}
            {!errors.email && showAdminWarning && (
              <p className="mt-1.5 flex items-center gap-1 text-xs text-destructive">
                <ShieldCheck className="h-3.5 w-3.5" />
                Admin role is restricted to {ADMIN_EMAIL_DOMAIN} email addresses.
              </p>
            )}
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
                autoComplete="new-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) setErrors((p) => ({ ...p, password: undefined }));
                }}
                placeholder="At least 8 characters"
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

            <div className="mt-2.5">
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((seg) => (
                  <span
                    key={seg}
                    className={`h-1.5 flex-1 rounded-full transition ${
                      pwStrength.score >= seg ? STRENGTH_COLORS[pwStrength.score]! : "bg-border"
                    }`}
                  />
                ))}
              </div>
              <p className="mt-1.5 flex justify-between text-[11px] text-muted-foreground">
                <span>Strength</span>
                <span className="font-medium text-foreground">{pwStrength.label || "—"}</span>
              </p>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={mutation.isPending}>
            {mutation.isPending ? "Creating account..." : "Create account"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-brand hover:text-brand-hover">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
