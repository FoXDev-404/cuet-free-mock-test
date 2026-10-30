"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  Loader2,
  Save,
  Trash2,
  UserRound,
} from "lucide-react";

type Profile = {
  name: string | null;
  username: string | null;
  bio: string | null;
  isProfilePublic: boolean;
  email: string | null;
  createdAt: string;
};

export function AccountPrivacy() {
  const { status } = useSession();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [password, setPassword] = useState("");
  const [showDelete, setShowDelete] = useState(false);

  const load = useCallback(async () => {
    if (status !== "authenticated") {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/me/profile");
      if (res.ok) {
        setProfile(await res.json());
      } else {
        const data = await res.json().catch(() => ({}));
        setError(typeof data?.error === "string" ? data.error : "Could not load your profile.");
      }
    } catch {
      setError("Could not load your profile.");
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    const id = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(id);
  }, [load]);

  const save = async () => {
    if (!profile) return;
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const res = await fetch("/api/me/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: profile.name,
          username: profile.username,
          bio: profile.bio,
          isProfilePublic: profile.isProfilePublic,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof data?.error === "string"
            ? data.error
            : Array.isArray(data?.error)
              ? data.error[0]?.message ?? "Could not save your profile."
              : "Could not save your profile.",
        );
      }
      setProfile((current) => (current ? { ...current, ...data } : data));
      setMessage("Account and privacy settings saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save your profile.");
    } finally {
      setSaving(false);
    }
  };

  const exportData = async () => {
    setExporting(true);
    setMessage("");
    setError("");
    try {
      const res = await fetch("/api/me/export");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(typeof data?.error === "string" ? data.error : "Export failed.");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `cuet-account-${profile?.username ?? "data"}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setMessage("Your data export has been downloaded.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed.");
    } finally {
      setExporting(false);
    }
  };

  const deleteAccount = async () => {
    if (confirmText !== "DELETE") {
      setError("Type DELETE exactly to confirm account deletion.");
      return;
    }
    setDeleting(true);
    setMessage("");
    setError("");
    try {
      const res = await fetch("/api/me/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: "DELETE", password: password || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof data?.error === "string"
            ? data.error
            : Array.isArray(data?.error)
              ? data.error[0]?.message ?? "Account deletion failed."
              : "Account deletion failed.",
        );
      }
      await signOut({ callbackUrl: "/" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Account deletion failed.");
      setDeleting(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <Card className="mb-6">
        <CardContent className="flex items-center gap-2 pt-6 text-sm text-neutral-500 dark:text-neutral-400">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading account settings…
        </CardContent>
      </Card>
    );
  }

  if (status !== "authenticated") {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <UserRound className="h-5 w-5 text-primary-600 dark:text-primary-400" />
            Account & privacy
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            <Link href="/login" className="font-semibold text-primary-600 hover:underline dark:text-primary-400">
              Sign in
            </Link>{" "}
            to manage your username, public profile, data export and account deletion.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!profile) {
    return (
      <Card className="mb-6">
        <CardContent className="pt-6 text-sm text-red-600 dark:text-red-400">
          {error || "Could not load your account."}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <UserRound className="h-5 w-5 text-primary-600 dark:text-primary-400" />
          Account & privacy
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Your dashboard and attempt history are always private. A public profile is opt-in and shows only your
          username, bio, join month, badges and aggregate totals — never your email, full history or wrong answers.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200">
            Display name (private)
            <input
              value={profile.name ?? ""}
              onChange={(event) => setProfile({ ...profile, name: event.target.value })}
              maxLength={80}
              className="input mt-1"
              placeholder="How your name appears in your own account"
            />
          </label>
          <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200">
            Username (public)
            <input
              value={profile.username ?? ""}
              onChange={(event) => setProfile({ ...profile, username: event.target.value })}
              maxLength={24}
              className="input mt-1"
              placeholder="lowercase-letters-and-numbers"
              aria-describedby="username-help"
            />
            <span id="username-help" className="mt-1 block text-xs font-normal text-neutral-500 dark:text-neutral-400">
              Lowercase letters, numbers and hyphens. Used at /u/username.
            </span>
          </label>
        </div>

        <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200">
          Bio (public when your profile is public)
          <textarea
            value={profile.bio ?? ""}
            onChange={(event) => setProfile({ ...profile, bio: event.target.value })}
            rows={3}
            maxLength={300}
            className="input mt-1"
            placeholder="A short line about your CUET preparation"
          />
          <span className="mt-1 block text-right text-xs font-normal text-neutral-500 dark:text-neutral-400">
            {(profile.bio ?? "").length}/300
          </span>
        </label>

        <div className="flex items-start justify-between gap-4 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-sm font-medium text-neutral-900 dark:text-white">
              {profile.isProfilePublic ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              Public profile
            </p>
            <p className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">
              {profile.isProfilePublic
                ? "Anyone with the link can see your username, bio, badges and aggregate totals."
                : "Only you can open your profile. Visitors get a 404."}
            </p>
            {profile.username ? (
              <Link
                href={`/u/${profile.username}`}
                className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:underline dark:text-primary-400"
              >
                {profile.isProfilePublic ? "View public profile" : "Preview your profile"}
                <ExternalLink className="h-3 w-3" />
              </Link>
            ) : null}
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={profile.isProfilePublic}
            aria-label="Make profile public"
            onClick={() => setProfile({ ...profile, isProfilePublic: !profile.isProfilePublic })}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
              profile.isProfilePublic ? "bg-primary-600" : "bg-neutral-300 dark:bg-neutral-600"
            }`}
          >
            <span
              className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                profile.isProfilePublic ? "translate-x-[1.375rem]" : "translate-x-0.5"
              }`}
              aria-hidden="true"
            />
          </button>
        </div>

        {message ? (
          <p className="rounded-lg bg-secondary-50 p-2.5 text-sm text-secondary-800 dark:bg-secondary-900/20 dark:text-secondary-200" role="status">
            {message}
          </p>
        ) : null}
        {error ? (
          <p className="rounded-lg bg-red-50 p-2.5 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300" role="alert">
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <Button variant="brand" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
            Save account settings
          </Button>
          <Button variant="outline" onClick={exportData} disabled={exporting}>
            {exporting ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Download className="mr-1.5 h-4 w-4" />}
            Export my data
          </Button>
        </div>

        <div className="rounded-xl border border-danger-200 p-4 dark:border-danger-900/60">
          <p className="flex items-center gap-2 text-sm font-semibold text-danger-700 dark:text-danger-300">
            <AlertTriangle className="h-4 w-4" /> Delete account
          </p>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            Personal identity data is erased and your posts are removed. Submitted attempts are anonymised so
            historical test statistics stay accurate. This cannot be undone.
          </p>
          {!showDelete ? (
            <Button variant="danger" className="mt-3" onClick={() => setShowDelete(true)}>
              <Trash2 className="mr-1.5 h-4 w-4" /> Start account deletion
            </Button>
          ) : (
            <div className="mt-3 space-y-3">
              <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200">
                Type DELETE to confirm
                <input
                  value={confirmText}
                  onChange={(event) => setConfirmText(event.target.value)}
                  className="input mt-1 max-w-xs"
                  autoComplete="off"
                />
              </label>
              <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200">
                Password (if you sign in with email)
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="input mt-1 max-w-xs"
                  autoComplete="current-password"
                />
              </label>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="danger"
                  onClick={deleteAccount}
                  disabled={deleting || confirmText !== "DELETE"}
                >
                  {deleting ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Trash2 className="mr-1.5 h-4 w-4" />}
                  Permanently delete my account
                </Button>
                <Button variant="outline" onClick={() => setShowDelete(false)} disabled={deleting}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
