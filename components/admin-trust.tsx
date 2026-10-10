"use client";
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { MarketShell } from "@/components/market-shell";
import { Button } from "@/components/ui/button";
import { useMarket } from "@/components/market-provider";
import { api } from "@/lib/api-client";
type Report = {
  id: string;
  business_id: string;
  reason: string;
  details: string;
  status: string;
  created_at: string;
};
export function AdminTrust() {
  const { state, refresh } = useMarket();
  const [reports, setReports] = useState<Report[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [files, setFiles] = useState<{ path: string; signedUrl: string }[]>([]);
  const [business, setBusiness] = useState("");
  const [verifications, setVerifications] = useState<
    {
      business_id: string;
      id_verified_at: string | null;
      phone_verified_at: string | null;
    }[]
  >([]);
  async function load() {
    try {
      const r = await api<{
        reports: Report[];
        verifications: typeof verifications;
      }>("/api/admin/trust");
      setReports(r.reports);
      setVerifications(r.verifications);
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : "Unable to load trust records.",
      );
    }
  }
  useEffect(() => {
    void load();
  }, []);
  async function evidence() {
    setBusy(true);
    try {
      setFiles(
        (
          await api<{ files: typeof files }>(
            `/api/evidence?business=${business}`,
          )
        ).files,
      );
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Unable to open evidence.");
    } finally {
      setBusy(false);
    }
  }
  async function verify(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const f = new FormData(e.currentTarget);
    try {
      await api(`/api/admin/verification/${business}`, "PATCH", {
        id_checked: f.get("id_checked") === "on",
        phone_checked: f.get("phone_checked") === "on",
        reason: f.get("reason"),
      });
      setMessage("Verification checks recorded and audited.");
      await load();
      await refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Unable to record checks.");
    } finally {
      setBusy(false);
    }
  }
  async function moderate(id: string, status: string) {
    setBusy(true);
    try {
      await api(`/api/admin/reports/${id}`, "PATCH", { status });
      await load();
      await refresh();
      setMessage("Report status updated and audited.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Unable to update report.");
    } finally {
      setBusy(false);
    }
  }
  const current = verifications.find((v) => v.business_id === business);
  return (
    <MarketShell>
      <div className="dashboard-heading">
        <div>
          <span className="eyebrow">TRUST & SAFETY ADMINISTRATION</span>
          <h1>Vendor checks & reports</h1>
        </div>
        <Link href="/admin">← Admin overview</Link>
      </div>
      {message && (
        <p className="success-banner" role="status">
          {message}
        </p>
      )}
      <section className="workspace-panel">
        <h2>Record evidence-backed verification</h2>
        <p className="dialog-description">
          Approval does not prove student identity or phone ownership. Inspect
          the uploaded ID, then independently confirm control of the displayed
          phone (for example through a supervised call or in-person check).
          Record what you checked.
        </p>
        <form onSubmit={verify} className="listing-form narrow-form">
          <label>
            Approved vendor
            <select
              value={business}
              required
              onChange={(e) => {
                setBusiness(e.target.value);
                setFiles([]);
              }}
            >
              <option value="">Select a business</option>
              {state.vendors
                .filter((v) => v.status === "approved")
                .map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} · {v.phone}
                  </option>
                ))}
            </select>
          </label>
          <Button
            type="button"
            variant="outline"
            disabled={!business || busy}
            onClick={evidence}
          >
            Open verification evidence
          </Button>
          {files.map((f) => (
            <a
              href={f.signedUrl}
              target="_blank"
              rel="noopener noreferrer"
              key={f.path}
            >
              View private document (link expires in 60 seconds)
            </a>
          ))}
          <p className="demo-note">
            Current ID check:{" "}
            {current?.id_verified_at
              ? new Date(current.id_verified_at).toLocaleDateString("en-GB")
              : "Not verified"}
            . Phone check:{" "}
            {current?.phone_verified_at
              ? new Date(current.phone_verified_at).toLocaleDateString("en-GB")
              : "Not verified"}
            .
          </p>
          <label className="checkbox-label">
            <input
              key={`id-${business}-${current?.id_verified_at}`}
              type="checkbox"
              name="id_checked"
              defaultChecked={!!current?.id_verified_at}
            />
            I checked a valid student ID belonging to this owner
          </label>
          <label className="checkbox-label">
            <input
              key={`phone-${business}-${current?.phone_verified_at}`}
              type="checkbox"
              name="phone_checked"
              defaultChecked={!!current?.phone_verified_at}
            />
            I confirmed ownership of the business phone shown above
          </label>
          <label>
            Check details
            <textarea
              name="reason"
              required
              minLength={10}
              maxLength={1000}
              placeholder="Record how each check was performed. Unchecking a check revokes its badge."
            />
          </label>
          <Button disabled={busy || !business}>Save verification checks</Button>
        </form>
      </section>
      <section className="workspace-panel">
        <h2>Vendor reports</h2>
        {reports.length === 0 ? (
          <p>No reports submitted.</p>
        ) : (
          reports.map((r) => (
            <article className="report-card" key={r.id}>
              <Link
                href={`/v/${state.vendors.find((v) => v.id === r.business_id)?.slug}`}
              >
                {state.vendors.find((v) => v.id === r.business_id)?.name ||
                  "Vendor"}
              </Link>
              <span className="status-badge suspended">{r.status}</span>
              <h3>{r.reason}</h3>
              <p>{r.details}</p>
              <small>{new Date(r.created_at).toLocaleString("en-GB")}</small>
              <div className="form-actions">
                <Button
                  disabled={busy}
                  size="sm"
                  variant="outline"
                  onClick={() => moderate(r.id, "reviewing")}
                >
                  Investigate
                </Button>
                <Button
                  disabled={busy}
                  size="sm"
                  variant="outline"
                  onClick={() => moderate(r.id, "resolved")}
                >
                  Resolve
                </Button>
                <Button
                  disabled={busy}
                  size="sm"
                  variant="ghost"
                  onClick={() => moderate(r.id, "dismissed")}
                >
                  Dismiss
                </Button>
              </div>
            </article>
          ))
        )}
      </section>
    </MarketShell>
  );
}
