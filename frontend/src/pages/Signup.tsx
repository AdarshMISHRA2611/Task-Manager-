import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { UserPlus } from "lucide-react";
import { getErrorMessage } from "@/services/api";
import { useAuth } from "@/services/authContext";
import type { UserRole } from "@/services/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function SignupPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("Member");

  const mutation = useMutation({
    mutationFn: () => signup(name, email, password, role),
    onSuccess: (created) => {
      toast.success(`Profile ready. User ID ${created.id} — keep it handy when an admin adds you to a roster.`, {
        duration: 6000,
      });
      navigate("/login", { replace: true });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  return (
    <div className="surface-grid flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md animate-fade-in">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-white">Create account</h1>
          <p className="mt-2 text-sm text-slate-400">Admins shape initiatives and assignments; members advance their own queue.</p>
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
              <label htmlFor="name" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                Full name
              </label>
              <input
                id="name"
                className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2.5 text-sm text-white focus-ring"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="email" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                Email
              </label>
              <input
                id="email"
                type="email"
                className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2.5 text-sm text-white focus-ring"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="password" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                Password (min 6)
              </label>
              <input
                id="password"
                type="password"
                minLength={6}
                className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2.5 text-sm text-white focus-ring"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="role" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                Role
              </label>
              <select
                id="role"
                className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2.5 text-sm text-white focus-ring"
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
              >
                <option value="Member">Member</option>
                <option value="Admin">Admin</option>
              </select>
            </div>
            <Button type="submit" className="w-full" disabled={mutation.isPending}>
              <UserPlus className="h-4 w-4" />
              {mutation.isPending ? "Creating…" : "Sign up"}
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-slate-400">
            Already registered?{" "}
            <Link to="/login" className="font-medium text-brand-400 hover:text-brand-300">
              Sign in
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
}
