"use client";
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMarket } from "@/components/market-provider";
import { api } from "@/lib/api-client";
import { isStudent } from "@/lib/permissions";
import { ReviewComments } from "@/components/review-comments";
export type CustomerReview = {
  id: string;
  user_id: string;
  business_id: string;
  product_id: string | null;
  rating: number;
  body: string;
  reviewer_name: string;
  created_at: string;
  hidden: boolean;
  order_id?: string | null;
};
export function Reviews({
  businessId,
  productId,
  mine = false,
  vendorView = false,
}: {
  businessId?: string;
  productId?: string;
  mine?: boolean;
  vendorView?: boolean;
}) {
  const { user, state, refresh } = useMarket();
  const [rows, setRows] = useState<CustomerReview[]>([]);
  const [count, setCount] = useState(0);
  const [average, setAverage] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<CustomerReview | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  const [eligible, setEligible] = useState(false);
  const [checkingEligibility, setCheckingEligibility] = useState(false);
  const [eligibilityError, setEligibilityError] = useState("");
  const [writing, setWriting] = useState(false);
  const ownBusiness =
    state.vendors.find((v) => v.id === businessId)?.ownerId === user?.id;
  async function load() {
    setLoading(true);
    try {
      const q = new URLSearchParams({
        page: String(page),
        ...(mine
          ? { mine: "1" }
          : productId
            ? { product: productId }
            : businessId
              ? { business: businessId }
              : {}),
      });
      const data = await api<{
        reviews: CustomerReview[];
        count: number;
        summary?: { average: number; count: number } | null;
      }>(`/api/reviews?${q}`);
      setRows(data.reviews);
      setCount(data.count);
      setAverage(data.summary ? Number(data.summary.average) : null);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load reviews.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, [businessId, productId, mine, page]);
  useEffect(() => {
    let active = true;
    setEligible(false);
    setEligibilityError("");
    if (!businessId || mine || vendorView || !isStudent(user)) return;
    setCheckingEligibility(true);
    const q = new URLSearchParams({
      business: businessId,
      ...(productId ? { product: productId } : {}),
    });
    api<{ eligible: boolean }>(`/api/review-eligibility?${q}`)
      .then((r) => { if (active) setEligible(r.eligible); })
      .catch((e) => { if (active) setEligibilityError(e instanceof Error ? e.message : "Could not check review access. Reload to try again."); })
      .finally(() => { if (active) setCheckingEligibility(false); });
    return () => { active = false; };
  }, [businessId, productId, user?.id, mine, vendorView]);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    try {
      await api(
        editing ? `/api/reviews/${editing.id}` : "/api/reviews",
        editing ? "PATCH" : "POST",
        editing
          ? { rating, body: text }
          : {
              business_id: businessId,
              product_id: productId || null,
              rating,
              body: text,
            },
      );
      setEditing(null);
      setWriting(false);
      setText("");
      await load();
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save your review.");
    } finally {
      setBusy(false);
    }
  }
  async function remove(id: string) {
    if (!window.confirm("Delete your review?")) return;
    try {
      await api(`/api/reviews/${id}`, "DELETE");
      await load();
      await refresh();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not delete your review.",
      );
    }
  }
  return (
    <section className="reviews-panel">
      <div className="market-section-title">
        <h2>{mine ? "Your reviews" : "Customer reviews"}</h2>
        <span>
          {average !== null ? `${average.toFixed(1)} / 5 · ` : ""}
          {count} reviews
        </span>
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {loading ? (
        <p role="status">Loading reviews…</p>
      ) : rows.length === 0 ? (
        <p className="dialog-description">No reviews yet.</p>
      ) : (
        rows.map((r) => (
          <article className="customer-review" key={r.id}>
            <div>
              <strong>{r.reviewer_name}</strong>
              <span className="rating">
                <Star size={13} fill="currentColor" />
                {r.rating}/5
              </span>
              <small>
                {new Date(r.created_at).toLocaleDateString("en-GB", {
                  timeZone: "Africa/Lagos",
                })}
                {r.hidden ? " · Hidden by moderation" : ""}
              </small>
            </div>
            <p>{r.body}</p>
            {!r.hidden && <ReviewComments reviewId={r.id} />}
            {mine && (
              <Link
                href={
                  r.product_id
                    ? `/products/${r.product_id}`
                    : `/businesses/${state.vendors.find((v) => v.id === r.business_id)?.slug || ""}`
                }
              >
                View listing →
              </Link>
            )}
            {!vendorView && isStudent(user) && r.user_id === user?.id && (
              <div className="form-actions">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditing(r);
                    setRating(r.rating);
                    setText(r.body);
                  }}
                >
                  Edit your review
                </Button>
                <Button size="sm" variant="ghost" onClick={() => remove(r.id)}>
                  Delete
                </Button>
              </div>
            )}
          </article>
        ))
      )}
      {count > 10 && (
        <div className="pagination">
          <Button
            size="sm"
            variant="outline"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </Button>
          <span>
            Page {page} of {Math.ceil(count / 10)}
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={page * 10 >= count}
            onClick={() => setPage(page + 1)}
          >
            Next
          </Button>
        </div>
      )}
      {!vendorView && !mine && !editing && (!user || isStudent(user)) && (
        <div>
          <Button
            type="button"
            disabled={!eligible}
            variant="outline"
            onClick={() => setWriting(!writing)}
          >
            {checkingEligibility ? "Checking review access…" : "Rate this seller"}
          </Button>
          {!eligible && user && !checkingEligibility && (
            <p className="demo-note">{eligibilityError || "Reviews are available for approved sellers from student buyer accounts."}</p>
          )}
        </div>
      )}
      {!vendorView &&
      ((user && eligible && writing && !ownBusiness && !mine) || editing) ? (
        <form className="listing-form review-form" onSubmit={submit}>
          <h3>{editing ? "Edit your review" : "Share your experience"}</h3>
          <label>
            Rating
            <select
              value={rating}
              onChange={(e) => setRating(Number(e.target.value))}
            >
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>
                  {n} {n === 1 ? "star" : "stars"}
                </option>
              ))}
            </select>
          </label>
          <label>
            Your review
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              required
              minLength={10}
              maxLength={1500}
              placeholder="What should other students know?"
            />
          </label>
          <div className="form-actions">
            <Button disabled={busy}>
              {busy ? "Saving…" : editing ? "Update review" : "Post review"}
            </Button>
            {editing && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditing(null);
                  setText("");
                }}
              >
                Cancel
              </Button>
            )}
          </div>
        </form>
      ) : !user && !mine ? (
        <p className="dialog-description">
          <Link href="/login">Sign in</Link> to write a review.
        </p>
      ) : ownBusiness ? (
        <p className="demo-note">
          Owners cannot review their own business or products.
        </p>
      ) : null}
    </section>
  );
}
