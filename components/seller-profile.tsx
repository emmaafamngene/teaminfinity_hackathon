"use client";
import { useState } from "react";
import { Star, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Vendor } from "@/lib/marketplace";
export function SellerProfile({ vendor }: { vendor: Vendor }) {
  const [message, setMessage] = useState("");
  const link = () => new URL(`/v/${vendor.slug}`, window.location.origin).href;
  return <section className="trust-profile">
    <h2>{vendor.name}</h2>
    <p className="rating"><Star size={18} fill="currentColor" /> {vendor.rating == null ? "No ratings yet" : `${vendor.rating.toFixed(1)} / 5`} · {vendor.reviewCount ?? 0} buyer reviews</p>
    <p>Read buyer feedback, explore the seller’s products, and choose pickup or delivery when ordering.</p>
    <div className="form-actions">
      <Button variant="outline" onClick={async () => { try { await navigator.clipboard.writeText(link()); setMessage("Seller link copied."); } catch { setMessage(link()); } }}><Copy size={16} /> Copy seller link</Button>
      <Button variant="outline" onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`${vendor.name} on Campus Connect: ${link()}`)}`, "_blank", "noopener,noreferrer")}>Share to WhatsApp</Button>
    </div>
    {message && <p role="status">{message}</p>}
  </section>;
}
