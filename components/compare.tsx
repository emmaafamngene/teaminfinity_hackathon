"use client";
import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Columns3, X } from "lucide-react";
import { useMarket } from "@/components/market-provider";
import { MarketShell } from "@/components/market-shell";
import { Button } from "@/components/ui/button";
import { ProductImage } from "@/components/product-image";
import { isStudent } from "@/lib/permissions";
import { formatPrice } from "@/lib/businesses";
import { publicProducts } from "@/lib/marketplace";
import { shortlistIds, toggleShortlist } from "@/lib/shortlist";
const key = "campus-connect-comparison";
function subscribe(fn: () => void) {
  window.addEventListener("storage", fn);
  window.addEventListener("campus-shortlist", fn);
  return () => {
    window.removeEventListener("storage", fn);
    window.removeEventListener("campus-shortlist", fn);
  };
}
function snapshot() {
  try {
    return localStorage.getItem(key) || "[]";
  } catch {
    return "[]";
  }
}
function save(ids: string[]) {
  try {
    localStorage.setItem(key, JSON.stringify(ids));
    window.dispatchEvent(new Event("campus-shortlist"));
    return true;
  } catch {
    return false;
  }
}
function useShortlist() {
  return shortlistIds(useSyncExternalStore(subscribe, snapshot, () => "[]"));
}
export function CompareButton({ id }: { id: string }) {
  const { user } = useMarket();
  const ids = useShortlist();
  const [error, setError] = useState("");
  if (user && !isStudent(user)) return null;
  return (
    <div className="compare-control">
      <button
        type="button"
        aria-pressed={ids.includes(id)}
        disabled={!ids.includes(id) && ids.length >= 3}
        onClick={() => {
          if (!save(toggleShortlist(ids, id)))
            setError("Browser storage is unavailable.");
        }}
      >
        <Columns3 size={14} />
        {ids.includes(id) ? "Added to compare" : "Compare"}
      </button>
      {ids.length > 0 && <Link href="/compare">View ({ids.length}/3)</Link>}
      {error && <small role="alert">{error}</small>}
    </div>
  );
}
export function ComparePage({ sharedIds }: { sharedIds?: string }) {
  const { state, ready, error } = useMarket();
  const local = useShortlist();
  const ids = sharedIds
    ? shortlistIds(JSON.stringify(sharedIds.split(",")))
    : local;
  const products = publicProducts(state).filter((p) => ids.includes(p.id));
  const [message, setMessage] = useState("");
  return (
    <MarketShell>
      <div className="dashboard-heading">
        <div>
          <span className="eyebrow">YOUR CAMPUS SHORTLIST</span>
          <h1>Find your best fit.</h1>
          <p>
            Compare up to three products by price, seller ratings, availability
            and location.
          </p>
        </div>
        {products.length > 0 && (
          <Button
            variant="outline"
            onClick={async () => {
              const url = new URL("/compare", window.location.origin);
              url.searchParams.set("ids", products.map((p) => p.id).join(","));
              try {
                await navigator.clipboard.writeText(url.href);
                setMessage("Comparison link copied. Share it with a friend.");
              } catch {
                setMessage(url.href);
              }
            }}
          >
            Share shortlist
          </Button>
        )}
      </div>
      {message && <p role="status">{message}</p>}
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      {!ready ? (
        <p role="status">Loading your shortlist…</p>
      ) : !products.length ? (
        <section className="empty-state">
          <Columns3 />
          <h2>Your comparison starts here</h2>
          <p>Tap Compare on marketplace cards to build your shortlist.</p>
          <Button asChild>
            <Link href="/marketplace">Explore products</Link>
          </Button>
        </section>
      ) : (
        <div className="compare-grid">
          {products.map((p) => {
            const v = state.vendors.find((v) => v.id === p.businessId)!;
            return (
              <article key={p.id} className="compare-card">
                <div className="compare-image"><ProductImage src={p.images?.[0]} alt={p.name} /></div>
                <h2>{p.name}</h2>
                <strong className="product-price">
                  {formatPrice(p.price)}
                </strong>
                <dl>
                  <dt>Seller</dt>
                  <dd>{v.name}</dd>
                  <dt>Seller rating</dt>
                  <dd>
                    {v.rating == null
                      ? "No ratings yet"
                      : `${v.rating.toFixed(1)} / 5 (${v.reviewCount || 0} reviews)`}
                  </dd>
                  <dt>Availability</dt>
                  <dd>{p.available ? "Available" : "Unavailable"}</dd>
                  <dt>Pickup location</dt>
                  <dd>{v.location}</dd>
                </dl>
                <Button asChild>
                  <Link href={`/products/${p.id}`}>View product</Link>
                </Button>
                {!sharedIds && (
                  <Button
                    variant="ghost"
                    onClick={() => save(local.filter((id) => id !== p.id))}
                  >
                    <X size={15} /> Remove
                  </Button>
                )}
              </article>
            );
          })}
        </div>
      )}
    </MarketShell>
  );
}
