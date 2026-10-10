"use client";
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { MarketShell } from "@/components/market-shell";
import { Button } from "@/components/ui/button";
import { api, ClientApiError } from "@/lib/api-client";
import { safeReturnPath } from "@/lib/security";
export function StudentCodeLogin({
  next,
  initialError = "",
  initialMessage = "",
}: {
  next?: string;
  initialError?: string;
  initialMessage?: string;
}) {
  const [email, setEmail] = useState("");
  const [step, setStep] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(initialError);
  const [ready, setReady] = useState(false);
  const [wait, setWait] = useState(0);
  const key = "campus-connect-student-login";
  const waitKey = "campus-connect-email-cooldown-v2";
  useEffect(() => {
    setReady(true);
    try {
      const saved = sessionStorage.getItem(key);
      if (saved) {
        setEmail(saved);
        setStep(true);
      }
    } catch {}
    const update = () => {
      try {
        setWait(
          Math.max(
            0,
            Math.ceil(
              (Number(sessionStorage.getItem(waitKey)) - Date.now()) / 1000,
            ),
          ),
        );
      } catch {}
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, []);
  function pause(seconds: number) {
    setWait(seconds);
    try {
      sessionStorage.setItem(waitKey, String(Date.now() + seconds * 1000));
    } catch {}
  }
  async function send(e?: FormEvent) {
    e?.preventDefault();
    if (busy || wait > 0) return;
    setBusy(true);
    setError("");
    try {
      await api("/api/auth/send-code", "POST", { email });
      setStep(true);
      pause(60);
      try {
        sessionStorage.setItem(key, email);
      } catch {}
    } catch (e) {
      if (e instanceof ClientApiError && e.retryAfterSeconds)
        pause(e.retryAfterSeconds);
      setError(e instanceof Error ? e.message : "Could not request a code.");
    } finally {
      setBusy(false);
    }
  }
  async function verify(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    const token = String(new FormData(e.currentTarget).get("token"));
    try {
      const r = await api<{ redirectTo: string }>("/api/auth/verify", "POST", {
        email,
        token,
      });
      try {
        sessionStorage.removeItem(key);
      } catch {}
      window.location.assign(safeReturnPath(next || r.redirectTo));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not verify code.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <MarketShell>
      <section className="auth-card">
        <span className="eyebrow">STUDENT & VENDOR SIGN-IN</span>
        <h1>{step ? "Enter your sign-in code" : "Welcome back"}</h1>
        {initialMessage && <p role="status" className="safety-banner">{initialMessage}</p>}
        <p>
          {step
            ? `Use the latest code sent to ${email}. Check your spam folder too.`
            : "Sign in with a code sent to your registered email. No password needed."}
        </p>
        {step ? (
          <form className="listing-form" onSubmit={verify}>
            <label>
              Verification code
              <input
                name="token"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6,10}"
                minLength={6}
                maxLength={10}
                required
              />
            </label>
            <Button disabled={!ready || busy} className="w-full">
              {busy ? "Verifying…" : "Verify and sign in"}
            </Button>
          </form>
        ) : (
          <form className="listing-form" onSubmit={send}>
            <label>
              Email
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                maxLength={254}
              />
            </label>
            <Button disabled={!ready || busy || wait > 0} className="w-full">
              {busy ? "Sending…" : "Send sign-in code"}
            </Button>
          </form>
        )}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {wait > 0 && (
          <p className="demo-note">Another code can be requested in {wait}s.</p>
        )}
        {step && (
          <div className="auth-help">
            <button
              type="button"
              disabled={busy || wait > 0}
              onClick={() => send()}
            >
              Resend code
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setStep(false);
                setError("");
                try {
                  sessionStorage.removeItem(key);
                } catch {}
              }}
            >
              Change email
            </button>
          </div>
        )}
        <p className="auth-switch">
          New here? <Link href="/register">Create an account</Link>
        </p>
      </section>
    </MarketShell>
  );
}
