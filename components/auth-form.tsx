"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { GraduationCap, Store, Eye, EyeOff } from "lucide-react";
import { MarketShell } from "@/components/market-shell";
import { Button } from "@/components/ui/button";
import { StudentCodeLogin } from "@/components/student-code-login";
import { api } from "@/lib/api-client";
export function AuthForm({
  register = false,
  reset = false,
  next,
  initialType = "student",
  initialError = "",
  initialMessage = "",
}: {
  register?: boolean;
  reset?: boolean;
  next?: string;
  initialType?: "student" | "vendor";
  initialError?: string;
  initialMessage?: string;
}) {
  const [type, setType] = useState(initialType);
  const [error, setError] = useState(initialError);
  const [busy, setBusy] = useState(false);
  const [visible, setVisible] = useState(false);
  if (!register && !reset)
    return <StudentCodeLogin next={next} initialError={initialError} initialMessage={initialMessage} />;
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const f = new FormData(e.currentTarget);
    if (f.get("password") !== f.get("confirm_password")) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const r = await api<{ redirectTo?: string }>(
        reset ? "/api/auth/update-password" : "/api/auth/register",
        "POST",
        reset
          ? { password: String(f.get("password")) }
          : {
              email: String(f.get("email")),
              full_name: String(f.get("full_name")),
              password: String(f.get("password")),
              account_type: type,
            },
      );
      if (register) {
        try {
          sessionStorage.removeItem("campus-connect-pending-student-email");
          sessionStorage.removeItem("campus-connect-pending-vendor-email");
        } catch {}
      }
      window.location.assign(
        reset ? "/account" : r.redirectTo || "/login?registered=1",
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not create your account.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <MarketShell>
      <section className="auth-card">
        <span className="eyebrow">
          {reset ? "ACCOUNT SETTINGS" : "JOIN YOUR CAMPUS COMMUNITY"}
        </span>
        <h1>{reset ? "Set a new password" : "Create your account"}</h1>
        <p>
          {reset
            ? "Choose a password with at least 8 characters."
            : "No code needed to sign up. You’ll use an email code when you log in."}
        </p>
        {!reset && (
          <div className="account-type-switch">
            <button
              type="button"
              aria-pressed={type === "student"}
              onClick={() => setType("student")}
            >
              <GraduationCap size={18} /> Student buyer
            </button>
            <button
              type="button"
              aria-pressed={type === "vendor"}
              onClick={() => setType("vendor")}
            >
              <Store size={18} /> Vendor
            </button>
          </div>
        )}
        <form className="listing-form" onSubmit={submit}>
          {!reset && (
            <>
              <label>
                Full name
                <input
                  name="full_name"
                  required
                  minLength={2}
                  maxLength={80}
                  autoComplete="name"
                />
              </label>
              <label>
                Email
                <input
                  name="email"
                  type="email"
                  required
                  maxLength={254}
                  autoComplete="email"
                />
              </label>
            </>
          )}
          <label>
            Password
            <div className="password-field">
              <input
                name="password"
                type={visible ? "text" : "password"}
                required
                minLength={8}
                maxLength={128}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setVisible(!visible)}
                aria-label={visible ? "Hide password" : "Show password"}
              >
                {visible ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>
          <label>
            Confirm password
            <input
              name="confirm_password"
              type={visible ? "text" : "password"}
              required
              minLength={8}
              maxLength={128}
              autoComplete="new-password"
            />
          </label>
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
          <Button disabled={busy} className="w-full">
            {busy
              ? "Saving…"
              : reset
                ? "Update password"
                : `Create ${type === "vendor" ? "vendor" : "student"} account`}
          </Button>
        </form>
        <p className="auth-switch">
          Already registered? <Link href="/login">Log in with a code</Link>
        </p>
        {!reset && type === "vendor" && (
          <p className="demo-note">
            After your first login, submit your business application to open
            your storefront.
          </p>
        )}
      </section>
    </MarketShell>
  );
}
