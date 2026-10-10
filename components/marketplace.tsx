"use client";
import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Bookmark,
  ChevronRight,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Store,
  UserRound,
  MessageCircle,
  Package,
  X,
} from "lucide-react";
import { MarketShell } from "@/components/market-shell";
import { ProductImage } from "@/components/product-image";
import { Reviews } from "@/components/reviews";
import { SellerProfile } from "@/components/seller-profile";
import { OrderButton } from "@/components/orders";
import { CompareButton } from "@/components/compare";
import { isStudent, isVendorAccount } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { useMarket } from "@/components/market-provider";
import { categories, formatPrice } from "@/lib/businesses";
import {
  matches,
  publicProducts,
  publicVendors,
  type Product,
  type Vendor,
} from "@/lib/marketplace";
export { MarketShell } from "@/components/market-shell";
export function ProductCard({ product: p }: { product: Product }) {
  const { state, mutate, user } = useMarket();
  const [saving, setSaving] = useState(false);
  const vendor = state.vendors.find((v) => v.id === p.businessId)!;
  const saved = state.saved.includes(p.id);
  return (
    <article className="product-card">
      <Link
        href={`/products/${p.id}`}
        className="product-art"
        style={{ backgroundColor: p.color }}
        aria-label={`View ${p.name}`}
      >
        <ProductImage src={p.images?.[0]} alt={p.name} />
        {!p.available && <span className="availability-tag">Unavailable</span>}
      </Link>
      {(!user || isStudent(user)) && (
        <button
          className="product-save"
          aria-label={`${saved ? "Unsave" : "Save"} ${p.name}`}
          aria-pressed={saved}
          disabled={saving}
          onClick={async () => {
            if (!user) {
              window.location.assign("/login");
              return;
            }
            setSaving(true);
            await mutate("/api/saved", "POST", {
              product_id: p.id,
              saved: !saved,
            });
            setSaving(false);
          }}
        >
          <Bookmark size={16} fill={saved ? "currentColor" : "none"} />
        </button>
      )}
      <div className="product-info">
        <Link href={`/businesses/${vendor.slug}`} className="seller-line">
          <Store size={12} />
          {vendor.name}
        </Link>
        
        <Link href={`/products/${p.id}`} className="product-name">
          {p.name}
        </Link>
        <strong className="product-price">{formatPrice(p.price)}</strong>
        {p.rating ? (
          <span className="rating">
            <Star size={12} fill="currentColor" />
            {p.rating.toFixed(1)} <small>({p.reviewCount} reviews)</small>
          </span>
        ) : (
          <span className="rating muted">New listing</span>
        )}
        <span className="delivery-line">
          {vendor.category === "Food & drinks"
            ? "Campus delivery"
            : vendor.category === "Digital platforms"
              ? "Access online"
              : vendor.location}
        </span>
        <CompareButton id={p.id} />
      </div>
    </article>
  );
}
export function StoreCard({ vendor: v }: { vendor: Vendor }) {
  return (
    <article className="store-card">
      <Link href={`/v/${v.slug}`} className="store-card-link">
        <span className="store-avatar" style={{ background: v.color }}>
          {v.emoji || <Store size={27} />}
        </span>
        <div>
          <strong>{v.name}</strong>
          <p>{v.category}</p>
          <small>Approved business</small>
        </div>
        <ChevronRight size={17} />
      </Link>
    </article>
  );
}
export function MarketplaceHome() {
  const { state, user } = useMarket();
  const products = publicProducts(state);
  const vendors = publicVendors(state);
  const [need, setNeed] = useState("");
  function solve(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    window.location.assign(`/marketplace?need=${encodeURIComponent(need)}`);
  }
  return (
    <MarketShell>
      <section className="shopping-hero">
        <aside className="category-sidebar">
          <h3>
            <Package size={16} /> Shop by category
          </h3>
          {categories.slice(1).map((c, i) => (
            <Link
              href={`/marketplace?category=${encodeURIComponent(c)}`}
              key={c}
            >
              <span>{["🍜", "✦", "✿", "📚", "⚡", "⌘"][i]}</span>
              {c}
              <ChevronRight size={13} />
            </Link>
          ))}
        </aside>
        <div className="market-promo">
          <span className="eyebrow">YOUR CAMPUS. YOUR MARKETPLACE.</span>
          <h1>Discover your campus favourites.</h1>
          <p>
            Shop student-made products. Discover brilliant services.
            <br />
            Connect with the people behind them.
          </p>
          <Button asChild>
            <Link href="/marketplace">
              Explore the marketplace <ArrowRight size={16} />
            </Link>
          </Button>
          <div className="promo-sticker sticker-shirt">
            👕<small>STYLE YOUR WAY</small>
          </div>
          <div className="promo-sticker sticker-food">
            🍜<small>LUNCH, SORTED.</small>
          </div>
          <div className="promo-spark">✳</div>
          <span className="promo-pagination">
            <i />
            <i />
            <i />
          </span>
        </div>
        <div className="hero-side">
          <Link
            href={
              isStudent(user)
                ? "/account/orders"
                : user
                  ? "/vendor/apply"
                  : "/register/vendor"
            }
          >
            <Store size={26} />
            <h3>
              {isStudent(user) ? "Your orders." : "Your hustle."}
              <br />
              {isStudent(user) ? "One clear view." : "A bigger audience."}
            </h3>
            <p>
              {isStudent(user)
                ? "Track delivery, chat with sellers and confirm receipt."
                : "Apply to open your campus storefront."}
            </p>
            <strong>
              {isStudent(user) ? "View my orders" : "Become a vendor"}{" "}
              <ArrowUpRight size={14} />
            </strong>
          </Link>
          <div>
            <ShieldCheck size={24} />
            <strong>
              Student businesses.
              <br />
              Reviewed first.
            </strong>
            <p>Every storefront starts with an application.</p>
          </div>
        </div>
      </section>
      <div className="trust-row">
        <span>
          <BadgeCheck />
          Approved storefronts
        </span>
        <span>
          <MessageCircle />
          Connect directly with sellers
        </span>
        <span>
          <Store />
          Support student-owned businesses
        </span>
        <span>
          <Sparkles />
          Find what you need faster
        </span>
      </div>
      <section className="market-section">
        <div className="market-section-title">
          <div>
            <span className="eyebrow">CAMPUS FAVOURITES</span>
            <h2>Products & services to discover</h2>
          </div>
          <Link href="/marketplace">
            See all <ArrowRight size={15} />
          </Link>
        </div>
        <div className="product-grid home-products">
          {products.slice(0, 6).map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>
      <section className="market-solution">
        <div>
          <span className="eyebrow">
            <Sparkles size={13} /> FIND MY SOLUTION
          </span>
          <h2>
            A need in mind?
            <br />
            Let’s find your people.
          </h2>
          <p>Tell us what you need. Explore relevant approved listings.</p>
        </div>
        <form onSubmit={solve}>
          <label className="sr-only" htmlFor="home-need">
            What do you need?
          </label>
          <div className="solution-input">
            <input
              id="home-need"
              value={need}
              onChange={(e) => setNeed(e.target.value)}
              required
              maxLength={500}
              placeholder="I need a flyer designed for my event tomorrow…"
            />
            <Button>
              Find my solution <Sparkles size={15} />
            </Button>
          </div>
          <div className="suggestions">
            <span>Try:</span>
            {["Event flyer", "Lunch delivery", "Calculus tutor"].map((n) => (
              <Link href={`/marketplace?need=${encodeURIComponent(n)}`} key={n}>
                {n}
              </Link>
            ))}
          </div>
          <p className="demo-note">
            Find relevant products and services from approved businesses.
          </p>
        </form>
      </section>
      <section className="market-section">
        <div className="market-section-title">
          <div>
            <span className="eyebrow">THE PEOPLE BEHIND THE PRODUCTS</span>
            <h2>Meet your campus businesses</h2>
          </div>
          <Link href="/businesses">
            View all businesses <ArrowRight size={15} />
          </Link>
        </div>
        <div className="store-grid">
          {vendors.slice(0, 3).map((v) => (
            <StoreCard key={v.id} vendor={v} />
          ))}
        </div>
      </section>
      {(!user || isVendorAccount(user)) && (
        <section className="seller-cta">
          <div>
            <span className="eyebrow">TURN YOUR TALENT INTO OPPORTUNITY</span>
            <h2>Start small. Get discovered.</h2>
            <p>Apply, get reviewed, and build your student storefront.</p>
          </div>
          <Button asChild>
            <Link href={user ? "/vendor/apply" : "/register/vendor"}>
              Apply to become a vendor <ArrowUpRight size={16} />
            </Link>
          </Button>
        </section>
      )}
    </MarketShell>
  );
}
export function MarketplaceBrowse({
  initialQuery = "",
  initialCategory = "All",
  initialNeed = "",
  initialSort = "recommended",
  initialSaved = false,
}: {
  initialQuery?: string;
  initialCategory?: string;
  initialNeed?: string;
  initialSort?: string;
  initialSaved?: boolean;
}) {
  const { state, user } = useMarket();
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState(
    categories.includes(initialCategory as (typeof categories)[number])
      ? initialCategory
      : "All",
  );
  const [max, setMax] = useState("");
  const [available, setAvailable] = useState(false);
  const [verified, setVerified] = useState(true);
  const [sort, setSort] = useState(initialSort);
  const [savedOnly, setSavedOnly] = useState(initialSaved);
  const [page, setPage] = useState(1);
  const [need, setNeed] = useState(initialNeed);
  const [activeNeed, setActiveNeed] = useState(initialNeed);
  const filtered = useMemo(() => {
    let list = activeNeed ? matches(state, activeNeed) : publicProducts(state);
    list = list.filter((p) => {
      const v = state.vendors.find((v) => v.id === p.businessId)!;
      return (
        (category === "All" || (p.category || v.category) === category) &&
        (!query ||
          `${p.name} ${p.description} ${v.name}`
            .toLowerCase()
            .includes(query.toLowerCase())) &&
        (!max || p.price <= Number(max)) &&
        (!available || p.available) &&
        (!savedOnly || state.saved.includes(p.id)) &&
        (!verified || v.status === "approved")
      );
    });
    if (sort === "price-low") list.sort((a, b) => a.price - b.price);
    if (sort === "price-high") list.sort((a, b) => b.price - a.price);
    if (sort === "newest")
      list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return list;
  }, [
    state,
    query,
    category,
    max,
    available,
    sort,
    savedOnly,
    activeNeed,
    verified,
  ]);
  const pages = Math.max(1, Math.ceil(filtered.length / 8));
  const current = Math.min(page, pages);
  function reset() {
    setQuery("");
    setCategory("All");
    setMax("");
    setAvailable(false);
    setSavedOnly(false);
    setActiveNeed("");
    setNeed("");
    setPage(1);
  }
  return (
    <MarketShell>
      <div className="breadcrumbs">
        <Link href="/">Home</Link>
        <ChevronRight size={12} />
        Marketplace
      </div>
      <div className="market-page-heading">
        <span className="eyebrow">FIND YOUR NEXT CAMPUS FAVOURITE</span>
        <h1>Explore the marketplace</h1>
        <p>
          Products, services and platforms from approved student businesses.
        </p>
      </div>
      <form
        className="browse-solution"
        onSubmit={(e) => {
          e.preventDefault();
          setActiveNeed(need.trim());
          setPage(1);
        }}
      >
        <Sparkles size={18} />
        <input
          aria-label="Describe your need"
          placeholder="Describe what you need…"
          value={need}
          onChange={(e) => setNeed(e.target.value)}
          maxLength={500}
        />
        <Button size="sm">Find my solution</Button>
      </form>
      <div className="browse-layout">
        <aside className="browse-filters">
          <div className="filter-title">
            <strong>Filters</strong>
            <button onClick={reset}>Reset</button>
          </div>
          <label className="filter-field">
            Search
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Product or business"
            />
          </label>
          <h3>Category</h3>
          {categories.map((c) => (
            <label className="checkbox-label" key={c}>
              <input
                type="radio"
                name="category"
                checked={category === c}
                onChange={() => {
                  setCategory(c);
                  setPage(1);
                }}
              />
              {c}
            </label>
          ))}
          <label className="filter-field">
            Maximum price (₦)
            <input
              type="number"
              min="0"
              value={max}
              placeholder="Any price"
              onChange={(e) => {
                setMax(e.target.value);
                setPage(1);
              }}
            />
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={available}
              onChange={(e) => setAvailable(e.target.checked)}
            />
            Available now
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={verified}
              onChange={(e) => setVerified(e.target.checked)}
            />
            Approved businesses
          </label>
          {(!user || isStudent(user)) && <label className="checkbox-label">
            <input
              type="checkbox"
              checked={savedOnly}
              onChange={(e) => setSavedOnly(e.target.checked)}
            />
            Saved favourites
          </label>}
          <p className="demo-note">
            Public discovery always excludes unapproved storefronts.
          </p>
        </aside>
        <div>
          {activeNeed && (
            <div className="match-banner">
              <Sparkles size={15} />
              <span>Matches for “{activeNeed}”</span>
              <button
                onClick={() => setActiveNeed("")}
                aria-label="Clear solution"
              >
                <X size={15} />
              </button>
            </div>
          )}
          <div className="browse-results">
            <span>{filtered.length} listings found</span>
            <label>
              Sort by{" "}
              <select value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="recommended">Recommended</option>
                <option value="newest">Newest first</option>
                <option value="price-low">Price: low to high</option>
                <option value="price-high">Price: high to low</option>
              </select>
            </label>
          </div>
          <div className="product-grid browse-products">
            {filtered.slice((current - 1) * 8, current * 8).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
          {filtered.length === 0 && (
            <div className="empty-state">
              <Search size={30} />
              <h3>No listings found</h3>
              <p>Try a different keyword, category or price.</p>
              <Button onClick={reset}>Reset filters</Button>
            </div>
          )}
          <div className="pagination">
            <Button
              variant="outline"
              size="sm"
              disabled={current === 1}
              onClick={() => setPage(current - 1)}
            >
              Previous
            </Button>
            <span>
              Page {current} of {pages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={current === pages}
              onClick={() => setPage(current + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </MarketShell>
  );
}
function ContactSeller({
  vendor: v,
  product,
}: {
  vendor: Vendor;
  product?: Product;
}) {
  return v.sample || !v.phone ? (
    <div className="sample-notice">
      <MessageCircle size={18} />
      <p>
        Sample seller: contact is disabled. An approved application with your
        own WhatsApp number can demonstrate this flow.
      </p>
    </div>
  ) : (
    <Button asChild className="w-full">
      <a
        href={`https://wa.me/${v.phone}?text=${encodeURIComponent(`Hi! I found ${product?.name || v.name} on Campus Connect. Can you tell me more?`)}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        <MessageCircle size={17} />
        Contact seller on WhatsApp
        <ArrowUpRight size={16} />
      </a>
    </Button>
  );
}
export function BusinessStorefront({ slug }: { slug: string }) {
  const { state, ready } = useMarket();
  const v = publicVendors(state).find((v) => v.slug === slug);
  if (!v)
    return (
      <MarketShell>
        <div className="empty-state">
          <Store size={35} />
          <h1>{ready ? "Storefront unavailable" : "Loading storefront…"}</h1>
          <p>This business may be awaiting approval or no longer public.</p>
          <Button asChild>
            <Link href="/marketplace">Back to marketplace</Link>
          </Button>
        </div>
      </MarketShell>
    );
  const products = publicProducts(state).filter((p) => p.businessId === v.id);
  return (
    <MarketShell>
      <div className="breadcrumbs">
        <Link href="/">Home</Link>
        <ChevronRight size={12} />
        <Link href="/marketplace">Marketplace</Link>
        <ChevronRight size={12} />
        {v.name}
      </div>
      <section className="store-banner" style={{ background: v.color }}>
        <span>{v.emoji || <Store size={27} />}</span>
        <div>
          <span className="eyebrow">YOUR STUDENT STOREFRONT</span>
          <h1>{v.name}</h1>
          <p>
            <BadgeCheck size={16} />
            Approved business · {v.category}
          </p>
        </div>
      </section>
      <SellerProfile vendor={v} />
      <div className="store-layout">
        <aside className="store-details">
          <h3>Meet {v.owner}</h3>
          <p>{v.description}</p>
          <dl>
            <dt>Location</dt>
            <dd>{v.location}</dd>
            <dt>Opening hours</dt>
            <dd>{v.hours}</dd>
          </dl>
          <ContactSeller vendor={v} />
          <small>
            Share your experience and help other students discover great
            services.
          </small>
        </aside>
        <section>
          <div className="market-section-title">
            <h2>Products & services</h2>
            <span>{products.length} listings</span>
          </div>
          <div className="product-grid storefront-products">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
          {products.length === 0 && (
            <div className="empty-state">
              <Package size={28} />
              <h3>Something good is on its way</h3>
              <p>This approved business hasn’t added any products yet.</p>
            </div>
          )}
        </section>
      </div>
      <Reviews businessId={v.id} />
    </MarketShell>
  );
}
export function ProductDetails({ id }: { id: string }) {
  const { state, ready } = useMarket();
  const [image, setImage] = useState(0);
  const p = publicProducts(state).find((p) => p.id === id);
  if (!p)
    return (
      <MarketShell>
        <div className="empty-state">
          <Package size={30} />
          <h1>{ready ? "Listing unavailable" : "Loading listing…"}</h1>
          <p>
            This listing is archived, awaiting approval, or no longer available
            publicly.
          </p>
          <Button asChild>
            <Link href="/marketplace">Explore marketplace</Link>
          </Button>
        </div>
      </MarketShell>
    );
  const v = publicVendors(state).find((v) => v.id === p.businessId)!;
  const related = publicProducts(state)
    .filter(
      (r) =>
        r.id !== p.id &&
        (r.category ||
          state.vendors.find((b) => b.id === r.businessId)?.category) ===
          (p.category || v.category),
    )
    .slice(0, 4);
  return (
    <MarketShell>
      <div className="breadcrumbs">
        <Link href="/marketplace">Marketplace</Link>
        <ChevronRight size={12} />
        <Link href={`/businesses/${v.slug}`}>{v.name}</Link>
        <ChevronRight size={12} />
        {p.name}
      </div>
      <section className="product-detail">
        <div>
          <div className="product-detail-art relative">
            <ProductImage src={p.images?.[image]} alt={p.name} large />
          </div>
          {p.images && p.images.length > 1 && (
            <div className="image-thumbnails">
              {p.images.map((src, i) => (
                <button
                  key={src}
                  aria-label={`View product image ${i + 1}`}
                  aria-pressed={image === i}
                  onClick={() => setImage(i)}
                >
                  <ProductImage src={src} alt={`${p.name}, image ${i + 1}`} />
                </button>
              ))}
            </div>
          )}
        </div>
        <div>
          <span className="eyebrow">{v.category}</span>
          <h1>{p.name}</h1>
          {p.rating && (
            <p className="rating">
              <Star size={14} fill="currentColor" />
              {p.rating.toFixed(1)} · {p.reviewCount} reviews
            </p>
          )}
          <strong className="detail-price">{formatPrice(p.price)}</strong>
          <span
            className={`status-badge ${p.available ? "approved" : "suspended"}`}
          >
            {p.available ? "Available" : "Currently unavailable"}
          </span>
          <p className="product-description">{p.description}</p>
          <Link href={`/businesses/${v.slug}`} className="detail-seller">
            <span style={{ background: v.color }}>{v.emoji}</span>
            <div>
              <small>Sold by</small>
              <strong>
                {v.name}
                <BadgeCheck size={14} />
              </strong>
            </div>
            <ChevronRight size={18} />
          </Link>
          {p.available ? (
            <>
              
              <OrderButton productId={p.id} />
              <ContactSeller vendor={v} product={p} />
            </>
          ) : (
            <Button disabled className="w-full">
              Currently unavailable
            </Button>
          )}
          <p className="purchase-note">
            Pay on delivery / pickup. Inspect your order before paying.
          </p>
        </div>
      </section>
      <Reviews businessId={v.id} productId={p.id} />
      {related.length > 0 && (
        <section className="market-section">
          <h2>You might also like</h2>
          <div className="product-grid related-products">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </MarketShell>
  );
}
