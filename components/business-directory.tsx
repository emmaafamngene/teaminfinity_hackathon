"use client";
import { useState } from "react";
import { MarketShell, StoreCard } from "@/components/marketplace";
import { useMarket } from "@/components/market-provider";
import { publicVendors } from "@/lib/marketplace";
import { categories } from "@/lib/businesses";
export function BusinessDirectory() {
  const { state, ready } = useMarket();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const vendors = publicVendors(state).filter(
    (v) =>
      (category === "All" || v.category === category) &&
      `${v.name} ${v.description}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <MarketShell>
      <div className="market-page-heading">
        <span className="eyebrow">CAMPUS TALENT, ALL IN ONE PLACE</span>
        <h1>Student businesses</h1>
        <p>Find approved businesses and meet the students behind them.</p>
      </div>
      <div className="directory-filters">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search businesses…"
          aria-label="Search businesses"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          aria-label="Business category"
        >
          {categories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>
      <div className="store-grid">
        {vendors.map((v) => (
          <StoreCard key={v.id} vendor={v} />
        ))}
      </div>
      {ready && !vendors.length && (
        <div className="empty-state">
          <h2>No approved businesses found</h2>
          <p>Try another search, or apply to bring your business to campus.</p>
        </div>
      )}
    </MarketShell>
  );
}
