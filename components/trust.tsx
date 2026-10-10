"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { BadgeCheck, Copy, Flag, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useMarket } from "@/components/market-provider";
import { api } from "@/lib/api-client";
import { trustScore, type Trust } from "@/lib/trust";
import type { Vendor } from "@/lib/marketplace";
const date = (value: string) =>
  new Date(value).toLocaleDateString("en-GB", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
export function TrustBadge({ trust }: { trust?: Trust }) {
  const [open, setOpen] = useState(false);
  if (!trust?.idVerifiedAt && !trust?.phoneVerifiedAt)
    return <span className="trust-unverified">Not verified</span>;
  return (
    <>
      <button
        type="button"
        className="trust-badge"
        onClick={() => setOpen(true)}
      >
        <BadgeCheck size={14} />
        {trust.idVerifiedAt ? "Student ID Verified" : "Phone Verified"}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogTitle>Verification details</DialogTitle>
          <DialogDescription>
            Checks recorded by the Campus Connect review team. Verification is
            not a guarantee of service or a reason to pay upfront.
          </DialogDescription>
          <ul className="verification-list">
            <li>
              Student ID:{" "}
              {trust.idVerifiedAt
                ? `Checked ${date(trust.idVerifiedAt)}`
                : "Not verified"}
            </li>
            <li>
              Phone ownership:{" "}
              {trust.phoneVerifiedAt
                ? `Checked ${date(trust.phoneVerifiedAt)}`
                : "Not verified"}
            </li>
          </ul>
        </DialogContent>
      </Dialog>
    </>
  );
}
export function ReportVendor({ businessId }: { businessId: string }) {
  const { user } = useMarket();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    const f = new FormData(e.currentTarget);
    try {
      await api("/api/reports", "POST", {
        business_id: businessId,
        reason: f.get("reason"),
        details: f.get("details"),
      });
      setSent(true);
      setMessage("Your report was submitted privately to the review team.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Unable to submit report.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <button
        className="report-link"
        type="button"
        onClick={() => setOpen(true)}
      >
        <Flag size={14} />
        Report vendor
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogTitle>Report this vendor</DialogTitle>
          <DialogDescription>
            Reports are investigated. Your identity and details are not shown
            publicly.
          </DialogDescription>
          {!user ? (
            <p>
              <Link href="/login">Sign in</Link> to submit a report. Public
              profiles and verification checks do not require signup.
            </p>
          ) : sent ? (
            <p role="status">{message}</p>
          ) : (
            <form onSubmit={submit} className="listing-form">
              <label>
                Reason
                <select name="reason">
                  <option value="payment">Payment or scam concern</option>
                  <option value="identity">False identity</option>
                  <option value="quality">Product or service issue</option>
                  <option value="harassment">Harassment</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <label>
                Details
                <textarea
                  name="details"
                  required
                  minLength={10}
                  maxLength={2000}
                  placeholder="Describe what happened. Do not include passwords or card details."
                />
              </label>
              {message && (
                <p role="alert" className="form-error">
                  {message}
                </p>
              )}
              <Button disabled={busy}>
                {busy ? "Submitting…" : "Submit report"}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
export function TrustProfile({ vendor }: { vendor: Vendor }) {
  const t = vendor.trust;
  const [message, setMessage] = useState("");
  function link() {
    return new URL(`/v/${vendor.slug}`, window.location.origin).href;
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(link());
      setMessage("Vendor link copied.");
    } catch {
      setMessage(`Copy this link: ${link()}`);
    }
  }
  return (
    <section className="trust-profile">
      <div className="trust-profile-heading">
        <ShieldCheck size={22} />
        <div>
          <h2>Know who you’re paying</h2>
          <TrustBadge trust={t} />
          {t?.underReview && (
            <span className="status-badge suspended">Under review</span>
          )}
        </div>
      </div>
      <div className="trust-metrics">
        <div>
          <small>Member since</small>
          <strong>{t ? date(t.memberSince) : "Unavailable"}</strong>
        </div>
        <div>
          <small>Orders completed</small>
          <strong>{t?.ordersCompleted ?? 0}</strong>
        </div>
        <div>
          <small>Response rate</small>
          <strong>
            {t?.responseRate == null ? "No orders yet" : `${t.responseRate}%`}
          </strong>
        </div>
        <div>
          <small>Buyer rating</small>
          <strong>
            {t?.rating
              ? `${Number(t.rating).toFixed(1)} / 5 (${t.reviewCount})`
              : "No reviews yet"}
          </strong>
        </div>
      </div>
      <p className="demo-note">
        Completed orders are confirmed by buyers. Response rate measures orders
        the seller has acknowledged through an update or message.
      </p>
      <div className="form-actions">
        <Button type="button" variant="outline" size="sm" onClick={copy}>
          <Copy size={14} />
          Copy vendor link
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            window.open(
              `https://wa.me/?text=${encodeURIComponent(`Check ${vendor.name} on Campus Connect: ${link()}`)}`,
              "_blank",
              "noopener,noreferrer",
            )
          }
        >
          Share to WhatsApp
        </Button>
        <ReportVendor businessId={vendor.id} />
      </div>
      {message && <p role="status">{message}</p>}
    </section>
  );
}
export function VendorTrustChecklist({ vendor }: { vendor: Vendor }) {
  const t = vendor.trust;
  if (!t) return null;
  return (
    <section className="trust-profile">
      <h2>
        Trust score <strong>{trustScore(t)}/100</strong>
      </h2>
      <p className="demo-note">
        ID checked: 50 points · phone checked: 30 · first buyer-confirmed order:
        20. This measures completed checks, not a guarantee.
      </p>
      <h3>Get verified</h3>
      <ul className="verification-list">
        <li>{t.idUploaded ? "✓" : "○"} Verification document uploaded</li>
        <li>
          {t.idVerifiedAt ? "✓" : "○"} Student ID checked by the review team
        </li>
        <li>
          {t.phoneVerifiedAt ? "✓" : "○"} Phone ownership confirmed by the
          review team
        </li>
        <li>
          {t.ordersCompleted > 0 ? "✓" : "○"} First order confirmed by its buyer
        </li>
      </ul>
      <p className="demo-note">
        Contact the campus review team for ID and phone checks. Changing your
        business phone invalidates its phone badge until checked again.
      </p>
      <Link href="/vendor/orders">Manage your orders →</Link>
    </section>
  );
}
