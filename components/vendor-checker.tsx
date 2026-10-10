"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { MarketShell } from "@/components/market-shell";
import { Button } from "@/components/ui/button";
import { TrustBadge } from "@/components/trust";
import { api } from "@/lib/api-client";
import type { Trust } from "@/lib/trust";
export function VendorChecker() {
  const [result, setResult] = useState<{
    result: string;
    trust: Trust | null;
  } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function check(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setResult(null);
    const f = new FormData(e.currentTarget);
    try {
      setResult(
        await api(
          `/api/verify-vendor?q=${encodeURIComponent(String(f.get("lookup")))}`,
        ),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not check vendor.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <MarketShell>
      <section className="checker-card">
        <span className="eyebrow">CHECK BEFORE YOU PAY</span>
        <h1>Verify a vendor</h1>
        <p>
          Paste a Campus Connect vendor link or phone number. No account
          required.
        </p>
        <form onSubmit={check} className="checker-form">
          <label className="sr-only" htmlFor="vendor-lookup">
            Vendor link or phone
          </label>
          <input
            id="vendor-lookup"
            name="lookup"
            required
            minLength={3}
            maxLength={300}
            placeholder="/v/vendor-name or +234…"
          />
          <Button disabled={busy}>{busy ? "Checking…" : "Check vendor"}</Button>
        </form>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {result && (
          <section className="checker-result" aria-live="polite">
            <h2>{result.result}</h2>
            {result.trust ? (
              <>
                <h3>{result.trust.name}</h3>
                <TrustBadge trust={result.trust} />
                <p>
                  {result.trust.ordersCompleted} buyer-confirmed orders ·{" "}
                  {result.trust.rating
                    ? `${Number(result.trust.rating).toFixed(1)} / 5`
                    : "No buyer reviews yet"}
                </p>
                {result.trust.reported && (
                  <p className="safety-banner">
                    There are unresolved reports. Reports are allegations
                    awaiting review, not proof of misconduct.
                  </p>
                )}
                <Link href={`/v/${result.trust.slug}`}>
                  Open full vendor profile →
                </Link>
              </>
            ) : (
              <p>
                No approved public vendor matched. Ask the seller for their
                Campus Connect profile before paying.
              </p>
            )}
          </section>
        )}
        <p className="demo-note">
          A verified badge confirms specific checks. Pay on delivery / pickup
          and inspect your order.
        </p>
      </section>
    </MarketShell>
  );
}
