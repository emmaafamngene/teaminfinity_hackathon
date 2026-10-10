"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BadgeCheck,
  Clock3,
  FileText,
  Package,
  ShieldCheck,
  Users,
} from "lucide-react";
import { MarketShell } from "@/components/market-shell";
import { useMarket } from "@/components/market-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { api } from "@/lib/api-client";
import type { Status } from "@/lib/marketplace";
import type { CustomerReview } from "@/components/reviews";
type AdminUser = {
  id: string;
  full_name: string;
  role: string;
  blocked: boolean;
};
export function AdminWorkspace({
  initialTab = "overview",
}: {
  initialTab?: string;
}) {
  const { state, mutate, ready } = useMarket();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [files, setFiles] = useState<{ path: string; signedUrl: string }[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [reviews, setReviews] = useState<CustomerReview[]>([]);
  const selected = state.vendors.find((v) => v.id === selectedId);
  const pending = state.vendors.filter((v) => v.status === "pending");
  const approved = state.vendors.filter((v) => v.status === "approved");
  async function load() {
    try {
      if (["users", "overview"].includes(initialTab))
        setUsers((await api<{ users: AdminUser[] }>("/api/admin/users")).users);
      if (initialTab === "reviews")
        setReviews(
          (await api<{ reviews: CustomerReview[] }>("/api/admin/reviews"))
            .reviews,
        );
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Unable to load administrator records.",
      );
    }
  }
  useEffect(() => {
    void load();
  }, [initialTab]);
  async function decide(status: Status) {
    if (!selected) return;
    if (status !== "approved" && !note.trim()) {
      setError("Include a decision reason.");
      return;
    }
    setBusy(true);
    if (
      await mutate(`/api/admin/applications/${selected.id}`, "PATCH", {
        decision: status,
        reason: note,
      })
    ) {
      setSelectedId(null);
      setError("");
    }
    setBusy(false);
  }
  async function evidence() {
    if (!selected) return;
    setBusy(true);
    try {
      setFiles(
        (
          await api<{ files: { path: string; signedUrl: string }[] }>(
            `/api/evidence?business=${selected.id}`,
          )
        ).files,
      );
      setError("");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not load verification files.",
      );
    } finally {
      setBusy(false);
    }
  }
  const list = state.vendors.filter(
    (v) =>
      (initialTab === "businesses"
        ? ["approved", "suspended"].includes(v.status)
        : !["approved", "suspended"].includes(v.status)) &&
      `${v.name} ${v.owner}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <MarketShell>
      <div className="dashboard-heading">
        <div>
          <span className="eyebrow">MARKETPLACE ADMIN</span>
          <h1>
            {initialTab === "overview"
              ? "Your marketplace at a glance"
              : initialTab === "applications"
                ? "Business applications"
                : initialTab === "businesses"
                  ? "Business management"
                  : initialTab === "users"
                    ? "User management"
                    : initialTab === "products"
                      ? "Product moderation"
                      : initialTab === "reviews"
                        ? "Review moderation"
                        : "Decision audit log"}
          </h1>
          <p>
            Administrative access is verified on the server for every action.
          </p>
        </div>
        <span className="status-badge approved">
          <ShieldCheck size={13} /> Authorized administrator
        </span>
      </div>
      <div className="dashboard-tabs">
        {[
          ["overview", "/admin"],
          ["applications", "/admin/applications"],
          ["businesses", "/admin/businesses"],
          ["users", "/admin/users"],
          ["products", "/admin/products"],
          ["reviews", "/admin/reviews"],
          
          ["audit log", "/admin/audit"],
        ].map(([label, href]) => (
          <Link href={href} key={href}>
            {label}
          </Link>
        ))}
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {!ready ? (
        <p>Loading administrator records…</p>
      ) : initialTab === "overview" ? (
        <>
          <div className="dashboard-stats admin-stats">
            <div>
              <Users />
              <strong>{users.length}</strong>
              <span>Registered users (up to 200)</span>
            </div>
            <div>
              <BadgeCheck />
              <strong>{approved.length}</strong>
              <span>Approved businesses</span>
            </div>
            <div>
              <Clock3 />
              <strong>{pending.length}</strong>
              <span>Pending applications</span>
            </div>
            <div>
              <Package />
              <strong>
                {
                  state.products.filter(
                    (p) =>
                      p.active && approved.some((v) => v.id === p.businessId),
                  ).length
                }
              </strong>
              <span>Published products</span>
            </div>
          </div>
          <section className="workspace-panel mt-6">
            <h2>Review new businesses</h2>
            <p className="dialog-description">
              {pending.length} applications are waiting for review.
            </p>
            <Button asChild className="mt-5">
              <Link href="/admin/applications">Open review queue</Link>
            </Button>
          </section>
        </>
      ) : initialTab === "applications" || initialTab === "businesses" ? (
        <section className="workspace-panel">
          <div className="panel-heading">
            <h2>
              {initialTab === "applications"
                ? "Review queue"
                : "Approved & suspended businesses"}
            </h2>
            <input
              className="admin-search"
              aria-label="Search businesses"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search business or applicant…"
            />
          </div>
          <div className="approval-list">
            {list.map((v) => (
              <article key={v.id}>
                <div>
                  <span
                    className="review-avatar"
                    style={{ background: v.color }}
                  >
                    <StoreIcon />
                  </span>
                  <span>
                    <strong>{v.name}</strong>
                    <small>{v.owner}</small>
                  </span>
                </div>
                <span className="review-category">{v.category}</span>
                <span className={`status-badge ${v.status}`}>
                  {v.status.replaceAll("_", " ")}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSelectedId(v.id);
                    setNote("");
                    setError("");
                    setFiles([]);
                  }}
                >
                  Review details
                </Button>
              </article>
            ))}
            {list.length === 0 && (
              <div className="empty-state">
                <FileText size={30} />
                <h3>No businesses in this queue</h3>
              </div>
            )}
          </div>
        </section>
      ) : initialTab === "users" ? (
        <section className="workspace-panel">
          <div className="managed-products">
            {users.map((u) => (
              <article key={u.id}>
                <div>
                  <strong>{u.full_name}</strong>
                  <small>
                    {u.role} · {u.blocked ? "Restricted" : "Active"}
                  </small>
                </div>
                {u.role === "admin" ? (
                  <span className="demo-note">Managed through trusted SQL</span>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      if (
                        await mutate(`/api/admin/users/${u.id}`, "PATCH", {
                          role: u.role,
                          blocked: !u.blocked,
                        })
                      )
                        await load();
                    }}
                  >
                    {u.blocked ? "Restore access" : "Restrict account"}
                  </Button>
                )}
              </article>
            ))}
          </div>
        </section>
      ) : initialTab === "products" ? (
        <section className="workspace-panel">
          <div className="managed-products">
            {state.products.map((p) => (
              <article key={p.id}>
                <div>
                  <strong>{p.name}</strong>
                  <small>
                    {state.vendors.find((v) => v.id === p.businessId)?.name} ·{" "}
                    {p.active ? "Active" : "Hidden / archived"}
                  </small>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    mutate(`/api/admin/products/${p.id}`, "PATCH", {
                      active: !p.active,
                    })
                  }
                >
                  {p.active ? "Hide product" : "Restore product"}
                </Button>
              </article>
            ))}
          </div>
          {!state.products.length && <p>No products to moderate.</p>}
        </section>
      ) : initialTab === "reviews" ? (
        <section className="workspace-panel">
          {reviews.map((r) => (
            <article className="customer-review" key={r.id}>
              <strong>
                {r.reviewer_name} · {r.rating}/5
              </strong>
              <p>{r.body}</p>
              <small>{r.hidden ? "Hidden" : "Public"}</small>
              <div className="form-actions">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    if (
                      await mutate(`/api/admin/reviews/${r.id}`, "PATCH", {
                        hidden: !r.hidden,
                      })
                    )
                      await load();
                  }}
                >
                  {r.hidden ? "Restore review" : "Hide review"}
                </Button>
              </div>
            </article>
          ))}
          {!reviews.length && <p>No reviews to moderate.</p>}
        </section>
      ) : (
        <section className="workspace-panel">
          <h2>Recorded administrator decisions</h2>
          <div className="audit-list">
            {state.history.map((h) => (
              <article key={h.id}>
                <span className={`status-badge ${h.status}`}>
                  {h.status.replaceAll("_", " ")}
                </span>
                <div>
                  <strong>
                    {state.vendors.find((v) => v.id === h.businessId)?.name ||
                      "Account or marketplace action"}
                  </strong>
                  <p>{h.note || "Approved"}</p>
                  <small>
                    Reviewer {h.reviewer} ·{" "}
                    {new Date(h.at).toLocaleString("en-GB", {
                      timeZone: "Africa/Lagos",
                    })}
                  </small>
                </div>
              </article>
            ))}
          </div>
          {!state.history.length && <p>No recorded decisions yet.</p>}
        </section>
      )}
      <Dialog
        open={!!selected}
        onOpenChange={(open) => !open && setSelectedId(null)}
      >
        <DialogContent>
          {selected && (
            <>
              <span className="eyebrow">BUSINESS REVIEW</span>
              <DialogTitle className="dialog-title">
                {selected.name}
              </DialogTitle>
              <DialogDescription className="dialog-description">
                {selected.description}
              </DialogDescription>
              <dl className="review-details">
                <dt>Applicant</dt>
                <dd>{selected.owner}</dd>
                <dt>Category</dt>
                <dd>{selected.category}</dd>
                <dt>Contact</dt>
                <dd>{selected.phone}</dd>
                <dt>Location</dt>
                <dd>{selected.location}</dd>
                <dt>Opening hours</dt>
                <dd>{selected.hours}</dd>
              </dl>
              <div className="evidence-panel">
                <h3>Private verification files</h3>
                {selected.evidence.length ? (
                  <>
                    <p>{selected.evidence.length} evidence files submitted.</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={evidence}
                      disabled={busy}
                    >
                      View verification files
                    </Button>
                    {files.map((f, i) => (
                      <a
                        key={f.path}
                        href={f.signedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Open document {i + 1} ↗
                      </a>
                    ))}
                  </>
                ) : (
                  <p>Verification has not been completed.</p>
                )}
                <small>Document links expire after 60 seconds.</small>
              </div>
              <label className="review-note">
                Decision reason
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={1000}
                />
              </label>
              {error && (
                <p className="form-error" role="alert">
                  {error}
                </p>
              )}
              <div className="decision-actions">
                {selected.status === "pending" ? (
                  <>
                    <Button
                      disabled={busy || !selected.evidence.length}
                      onClick={() => decide("approved")}
                    >
                      Approve
                    </Button>
                    <Button
                      disabled={busy}
                      variant="outline"
                      onClick={() => decide("needs_information")}
                    >
                      Request information
                    </Button>
                    <Button
                      disabled={busy}
                      variant="outline"
                      onClick={() => decide("rejected")}
                    >
                      Reject
                    </Button>
                  </>
                ) : selected.status === "approved" ? (
                  <Button
                    disabled={busy}
                    variant="outline"
                    onClick={() => decide("suspended")}
                  >
                    Suspend business
                  </Button>
                ) : selected.status === "suspended" ? (
                  <Button disabled={busy} onClick={() => decide("approved")}>
                    Reinstate business
                  </Button>
                ) : (
                  <p className="demo-note">Awaiting applicant resubmission.</p>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </MarketShell>
  );
}
function StoreIcon() {
  return <Package size={20} />;
}
