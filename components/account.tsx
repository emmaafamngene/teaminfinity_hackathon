"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { MarketShell } from "@/components/marketplace";
import { useMarket } from "@/components/market-provider";
import { Reviews } from "@/components/reviews";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api-client";
import { isStudent, isVendorAccount } from "@/lib/permissions";
import { ShieldCheck, ShoppingBag, Bookmark, Star } from "lucide-react";
export function AccountPage({ reviews = false }: { reviews?: boolean }) {
  const { user, state, mutate, ready } = useMarket();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const name = String(new FormData(e.currentTarget).get("full_name"));
    if (await mutate("/api/profile", "PATCH", { full_name: name }))
      setMessage("Profile updated.");
    setBusy(false);
  }
  async function logout() {
    try {
      await api("/api/auth/logout", "POST");
      window.location.assign("/login");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not sign out.");
    }
  }
  async function password(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    if (f.get("password") !== f.get("confirm_password")) {
      setMessage("New passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      await api("/api/auth/change-password", "POST", {
        password: f.get("password"),
        currentPassword: f.get("current_password"),
      });
      form.reset();
      setMessage("Password updated.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Unable to change password.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <MarketShell>
      <div className="dashboard-heading">
        <div>
          <span className="eyebrow">YOUR CAMPUS CONNECT ACCOUNT</span>
          <h1>{reviews ? "Your reviews" : "Your account"}</h1>
        </div>
        <Button variant="outline" onClick={logout}>
          Sign out
        </Button>
      </div>
      <div className="dashboard-tabs">
        <Link href="/account">Profile</Link>
        {isStudent(user) && (
          <>
            <Link href="/account/reviews">My reviews</Link>
            <Link href="/account/orders">My orders</Link>
            <Link href="/marketplace?saved=1">Saved favourites</Link>
          </>
        )}
        <Link href="/account#security">Security settings</Link>
        {isVendorAccount(user) && (
          <Link href="/vendor/application-status">Vendor application</Link>
        )}
      </div>
      {!ready ? (
        <p>Loading account…</p>
      ) : reviews ? (
        <Reviews mine />
      ) : (
        <>
          <div className="account-summary">
            <span className="account-avatar">
              {user?.full_name
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join("")}
            </span>
            <div>
              <h2>{user?.full_name}</h2>
              <p>{user?.email}</p>
              <span className="status-badge approved">
                {user?.role === "admin"
                  ? "Administrator"
                  : user?.role === "vendor"
                    ? "Approved vendor"
                    : isVendorAccount(user)
                      ? "Vendor applicant"
                      : "Student"}
              </span>
              {user?.created_at && (
                <p>
                  Member since{" "}
                  {new Date(user.created_at).toLocaleDateString("en-GB")}
                </p>
              )}
            </div>
          </div>
          <div className="account-shortcuts">
            {isStudent(user) ? (
              <>
                <Link href="/account/orders">
                  <ShoppingBag />
                  Your orders<span>Track delivery and confirm receipt</span>
                </Link>
                <Link href="/marketplace?saved=1">
                  <Bookmark />
                  Saved favourites
                  <span>{state.saved.length} saved listings</span>
                </Link>
                <Link href="/account/reviews">
                  <Star />
                  My reviews
                  <span>Manage feedback from completed orders</span>
                </Link>
              </>
            ) : isVendorAccount(user) ? (
              <>
                <Link href="/vendor/application-status">
                  <ShieldCheck />
                  Vendor workspace
                  <span>Application status and business access</span>
                </Link>
                {user?.role === "vendor" && (
                  <>
                    <Link href="/vendor/orders">
                      <ShoppingBag />
                      Customer orders
                      <span>Prepare and deliver your orders</span>
                    </Link>
                    <Link href="/vendor/products">
                      <Bookmark />
                      Your products<span>Manage your listings</span>
                    </Link>
                    <Link href="/vendor/reviews">
                      <Star />
                      Customer feedback<span>Read buyer ratings and reviews</span>
                    </Link>
                  </>
                )}
              </>
            ) : (
              <Link href="/admin">
                <ShieldCheck />
                Administrator workspace<span>Manage the marketplace</span>
              </Link>
            )}
          </div>
          <section className="workspace-panel">
            <h2>Profile settings</h2>
            <p className="dialog-description">
              {user?.email} · {user?.role}
            </p>
            <form className="listing-form narrow-form" onSubmit={save}>
              <label>
                Display name
                <input
                  name="full_name"
                  required
                  minLength={2}
                  maxLength={80}
                  defaultValue={user?.full_name}
                />
              </label>
              <Button disabled={busy}>
                {busy ? "Saving…" : "Save profile"}
              </Button>
            </form>
            {message && (
              <p role="status" className="success-banner">
                {message}
              </p>
            )}
          </section>
          <section className="workspace-panel" id="security">
            <h2>Password & security</h2>
            <p className="dialog-description">
              Your email is your sign-in address. Changing your password
              requires your current password.
            </p>
            {isStudent(user) ? (
              <p className="dialog-description">
                Student sign-in uses a one-time code sent to your email. No
                password is required.
              </p>
            ) : (
              <form onSubmit={password} className="listing-form narrow-form">
                <label>
                  Current password
                  <input
                    name="current_password"
                    type="password"
                    autoComplete="current-password"
                    required
                  />
                </label>
                <label>
                  New password
                  <input
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    maxLength={128}
                  />
                </label>
                <label>
                  Confirm new password
                  <input
                    name="confirm_password"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    maxLength={128}
                  />
                </label>
                <Button disabled={busy}>Update password</Button>
              </form>
            )}
          </section>
          <section className="trust-profile">
            <h2>Shop safely</h2>
            <p>
              Read seller ratings and reviews. Pay
              on delivery / pickup, and use order chat to agree the details.
              Confirm receipt after checking your order, then share your rating.
            </p>
          </section>
        </>
      )}
    </MarketShell>
  );
}
