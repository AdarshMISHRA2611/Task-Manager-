import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Eye, EyeOff, Loader2, Lock, Mail, ShieldCheck, UserCircle, User as UserIcon } from "lucide-react";
import { api, getErrorMessage } from "@/services/api";
import type { User } from "@/services/types";
import { useAuth } from "@/services/authContext";
import { Avatar } from "@/components/ui/Avatar";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";

function formatJoined(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

type ProfileErrors = { name?: string; email?: string };
type PasswordErrors = {
  current_password?: string;
  new_password?: string;
  confirm?: string;
};

export default function ProfilePage() {
  const { user, refreshMe } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [profileErrors, setProfileErrors] = useState<ProfileErrors>({});

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
    }
  }, [user]);

  const profileMutation = useMutation({
    mutationFn: async (payload: { name?: string; email?: string }) =>
      (await api.patch<User>("/api/auth/me", payload)).data,
    onSuccess: async () => {
      toast.success("Profile updated");
      await refreshMe();
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const onSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const next: ProfileErrors = {};
    if (!name.trim()) next.name = "Name is required";
    if (!email.trim()) next.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      next.email = "Enter a valid email";
    setProfileErrors(next);
    if (Object.keys(next).length > 0) return;
    const payload: { name?: string; email?: string } = {};
    if (name.trim() !== user.name) payload.name = name.trim();
    if (email.trim().toLowerCase() !== user.email) payload.email = email.trim().toLowerCase();
    if (Object.keys(payload).length === 0) {
      toast("No changes to save");
      return;
    }
    profileMutation.mutate(payload);
  };

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwErrors, setPwErrors] = useState<PasswordErrors>({});

  const passwordMutation = useMutation({
    mutationFn: async (payload: { current_password: string; new_password: string }) =>
      (await api.patch<User>("/api/auth/me", payload)).data,
    onSuccess: () => {
      toast.success("Password updated");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPwErrors({});
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const onChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    const next: PasswordErrors = {};
    if (!currentPassword) next.current_password = "Current password is required";
    if (!newPassword) next.new_password = "New password is required";
    else if (newPassword.length < 6)
      next.new_password = "Password must be at least 6 characters";
    if (newPassword && confirmPassword !== newPassword)
      next.confirm = "Passwords do not match";
    setPwErrors(next);
    if (Object.keys(next).length > 0) return;
    passwordMutation.mutate({
      current_password: currentPassword,
      new_password: newPassword,
    });
  };

  if (!user) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        icon={UserCircle}
        title="Profile"
        description="Manage your account details and password."
      />

      <Card>
        <div className="flex flex-wrap items-center gap-4">
          <Avatar name={user.name} size="xl" />
          <div className="min-w-0">
            <p className="text-lg font-semibold text-foreground">{user.name}</p>
            <p className="truncate text-sm text-muted-foreground">{user.email}</p>
            <div className="mt-1 inline-flex items-center gap-1 rounded-md bg-brand-subtle px-2 py-0.5 text-xs font-medium text-brand-subtle-foreground ring-1 ring-brand-subtle-border">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden /> {user.role}
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-foreground">Account</h2>
          <p className="text-xs text-muted-foreground">Update your name and email address.</p>
        </div>
        <form noValidate onSubmit={onSaveProfile} className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Name
            </label>
            <div className="relative mt-1">
              <UserIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" aria-hidden />
              <input
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (profileErrors.name)
                    setProfileErrors((p) => ({ ...p, name: undefined }));
                }}
                className={`w-full rounded-lg border bg-surface pl-9 pr-3 py-2 text-sm text-foreground hover:border-border-strong focus-ring ${
                  profileErrors.name ? "border-destructive" : "border-border-strong"
                }`}
              />
            </div>
            {profileErrors.name && (
              <p className="mt-1 text-xs text-destructive">! {profileErrors.name}</p>
            )}
          </div>
          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Email
            </label>
            <div className="relative mt-1">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" aria-hidden />
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (profileErrors.email)
                    setProfileErrors((p) => ({ ...p, email: undefined }));
                }}
                className={`w-full rounded-lg border bg-surface pl-9 pr-3 py-2 text-sm text-foreground hover:border-border-strong focus-ring ${
                  profileErrors.email ? "border-destructive" : "border-border-strong"
                }`}
              />
            </div>
            {profileErrors.email && (
              <p className="mt-1 text-xs text-destructive">! {profileErrors.email}</p>
            )}
          </div>
          <div className="sm:col-span-2 flex justify-end">
            <Button type="submit" disabled={profileMutation.isPending}>
              {profileMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Saving...
                </>
              ) : (
                "Save changes"
              )}
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-foreground">Change password</h2>
          <p className="text-xs text-muted-foreground">
            Choose a strong, unique password for your account.
          </p>
        </div>
        <form noValidate onSubmit={onChangePassword} className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Current password
            </label>
            <div className="relative mt-1">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" aria-hidden />
              <input
                type={showCurrent ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => {
                  setCurrentPassword(e.target.value);
                  if (pwErrors.current_password)
                    setPwErrors((p) => ({ ...p, current_password: undefined }));
                }}
                autoComplete="current-password"
                className={`w-full rounded-lg border bg-surface pl-9 pr-10 py-2 text-sm text-foreground hover:border-border-strong focus-ring ${
                  pwErrors.current_password ? "border-destructive" : "border-border-strong"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowCurrent((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-subtle hover:bg-surface-muted hover:text-foreground focus-ring"
                aria-label={showCurrent ? "Hide password" : "Show password"}
              >
                {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {pwErrors.current_password && (
              <p className="mt-1 text-xs text-destructive">! {pwErrors.current_password}</p>
            )}
          </div>
          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              New password
            </label>
            <div className="relative mt-1">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" aria-hidden />
              <input
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  if (pwErrors.new_password)
                    setPwErrors((p) => ({ ...p, new_password: undefined }));
                }}
                autoComplete="new-password"
                className={`w-full rounded-lg border bg-surface pl-9 pr-10 py-2 text-sm text-foreground hover:border-border-strong focus-ring ${
                  pwErrors.new_password ? "border-destructive" : "border-border-strong"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowNew((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-subtle hover:bg-surface-muted hover:text-foreground focus-ring"
                aria-label={showNew ? "Hide password" : "Show password"}
              >
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {pwErrors.new_password && (
              <p className="mt-1 text-xs text-destructive">! {pwErrors.new_password}</p>
            )}
          </div>
          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Confirm new password
            </label>
            <div className="relative mt-1">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" aria-hidden />
              <input
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (pwErrors.confirm)
                    setPwErrors((p) => ({ ...p, confirm: undefined }));
                }}
                autoComplete="new-password"
                className={`w-full rounded-lg border bg-surface pl-9 pr-10 py-2 text-sm text-foreground hover:border-border-strong focus-ring ${
                  pwErrors.confirm ? "border-destructive" : "border-border-strong"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-subtle hover:bg-surface-muted hover:text-foreground focus-ring"
                aria-label={showConfirm ? "Hide password" : "Show password"}
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {pwErrors.confirm && (
              <p className="mt-1 text-xs text-destructive">! {pwErrors.confirm}</p>
            )}
          </div>
          <div className="sm:col-span-2 flex justify-end">
            <Button type="submit" disabled={passwordMutation.isPending}>
              {passwordMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Updating...
                </>
              ) : (
                "Update password"
              )}
            </Button>
          </div>
        </form>
      </Card>

      <p className="text-xs text-muted-foreground">
        Member since {formatJoined(user.created_at)}
      </p>
    </div>
  );
}
