import { sampleBusinesses, categories, type Category } from "./businesses.ts";
import type { Trust } from "./trust.ts";
export type Status =
  "pending" | "approved" | "rejected" | "needs_information" | "suspended";
export type Review = {
  id: string;
  businessId: string;
  status: Status;
  note: string;
  at: string;
  reviewer: string;
};
export type Vendor = {
  id: string;
  slug: string;
  ownerId: string;
  name: string;
  owner: string;
  category: Category;
  description: string;
  phone: string;
  location: string;
  hours: string;
  status: Status;
  emoji: string;
  color: string;
  tags: string[];
  sample: boolean;
  submittedAt: string;
  evidence: string[];
  logoName?: string;
  trust?: Trust;
  rating?: number;
  reviewCount?: number;
};
export type Product = {
  id: string;
  businessId: string;
  name: string;
  description: string;
  price: number;
  available: boolean;
  active: boolean;
  emoji: string;
  color: string;
  rating?: number;
  reviewCount: number;
  createdAt: string;
  images?: string[];
  imagePaths?: string[];
  category?: Category;
};
export type MarketState = {
  vendors: Vendor[];
  products: Product[];
  history: Review[];
  saved: string[];
};
export const DEMO_OWNER = "demo-student";
export const marketStorageKey = "campus-connect-marketplace-v2";
const names = [
  "Custom event flyer",
  "Signature rice bowl",
  "Everyday oversized tee",
  "Calculus tutoring session",
  "Campus portrait session",
  "Knotless braids",
  "Business landing page",
  "Laundry & fold package",
  "Celebration cupcake box",
  "Study resource library",
  "Assignment printing",
  "Beginner fitness session",
];
export function initialMarket(): MarketState {
  const vendors: Vendor[] = sampleBusinesses.map((b) => ({
    ...b,
    slug: b.id,
    ownerId: `sample-${b.id}`,
    phone: "",
    location: "PAU campus",
    hours: "Mon–Fri · 9am–6pm",
    status: "approved",
    sample: true,
    submittedAt: "2026-10-09T10:00:00.000Z",
    evidence: ["Sample ownership statement"],
  }));
  const pending: Vendor[] = [
    "Campus Bites",
    "Pixel Studios",
    "Tech Corner",
  ].map((name, i) => ({
    id: `pending-${i}`,
    slug: `pending-${i}`,
    ownerId: `sample-pending-${i}`,
    name,
    owner: ["Nneka A.", "Tobi O.", "Emeka N."][i],
    category: i === 0 ? "Food & drinks" : "Design & tech",
    description: [
      "Fresh student meals and hostel delivery.",
      "Flyers, logos and social media design.",
      "Affordable tech accessories for student life.",
    ][i],
    phone: "",
    location: "PAU campus",
    hours: "Mon–Sat · 10am–5pm",
    status: "pending",
    emoji: ["🍲", "✦", "🎧"][i],
    color: ["#f1d9b9", "#d7cce9", "#cddde7"][i],
    tags: [],
    sample: true,
    submittedAt: "2026-10-10T08:00:00.000Z",
    evidence: ["Sample verification document (demo)"],
  }));
  const products: Product[] = sampleBusinesses.map((b, i) => ({
    id: `product-${b.id}`,
    businessId: b.id,
    name: names[i],
    description: b.description,
    price: b.price,
    available: true,
    active: true,
    emoji: b.emoji,
    color: b.color,
    reviewCount: 0,
    createdAt: `2026-10-${String(9 - (i % 7)).padStart(2, "0")}T10:00:00.000Z`,
  }));
  return {
    vendors: [...vendors, ...pending],
    products,
    history: [],
    saved: [],
  };
}
export function publicVendors(state: MarketState) {
  return state.vendors.filter((v) => v.status === "approved");
}
export function publicProducts(state: MarketState) {
  const approved = new Set(publicVendors(state).map((v) => v.id));
  return state.products.filter((p) => p.active && approved.has(p.businessId));
}
export function reviewVendor(
  state: MarketState,
  id: string,
  status: Status,
  note: string,
  at: string,
  reviewId: string,
): MarketState {
  const vendor = state.vendors.find((v) => v.id === id);
  if (!vendor) throw new Error("Business not found.");
  const allowed =
    vendor.status === "approved"
      ? ["suspended"]
      : vendor.status === "suspended"
        ? ["approved"]
        : vendor.status === "pending"
          ? ["approved", "rejected", "needs_information"]
          : [];
  if (!allowed.includes(status))
    throw new Error("This application cannot receive that decision.");
  if (status !== "approved" && !note.trim())
    throw new Error("Please include a reason for this decision.");
  return {
    ...state,
    vendors: state.vendors.map((v) => (v.id === id ? { ...v, status } : v)),
    history: [
      ...state.history,
      {
        id: reviewId,
        businessId: id,
        status,
        note: note.trim(),
        at,
        reviewer: "Demo administrator",
      },
    ],
  };
}
export function submitVendor(state: MarketState, vendor: Vendor): MarketState {
  const existing = state.vendors.find((v) => v.ownerId === vendor.ownerId);
  if (existing && !["rejected", "needs_information"].includes(existing.status))
    throw new Error("You already have an application or approved business.");
  return {
    ...state,
    vendors: existing
      ? state.vendors.map((v) =>
          v.id === existing.id
            ? {
                ...vendor,
                id: existing.id,
                slug: existing.slug,
                status: "pending",
              }
            : v,
        )
      : [...state.vendors, { ...vendor, status: "pending" }],
  };
}
export function saveProduct(
  state: MarketState,
  product: Product,
  ownerId: string,
): MarketState {
  const vendor = state.vendors.find((v) => v.id === product.businessId);
  if (!vendor || vendor.ownerId !== ownerId || vendor.status !== "approved")
    throw new Error("An approved business is required to manage products.");
  const existing = state.products.find((p) => p.id === product.id);
  if (existing && existing.businessId !== vendor.id)
    throw new Error("You can only edit your own products.");
  if (
    !product.name.trim() ||
    !product.description.trim() ||
    !Number.isFinite(product.price) ||
    product.price < 0
  )
    throw new Error("Enter a name, description and valid price.");
  return {
    ...state,
    products: existing
      ? state.products.map((p) => (p.id === product.id ? product : p))
      : [...state.products, product],
  };
}
export function matches(state: MarketState, request: string) {
  const ignore = new Set([
    "need",
    "someone",
    "tomorrow",
    "please",
    "with",
    "want",
    "for",
    "the",
    "and",
    "can",
    "help",
  ]);
  const words = [
    ...new Set(request.toLowerCase().match(/[a-z]+/g) || []),
  ].filter((w) => w.length > 2 && !ignore.has(w));
  return publicProducts(state)
    .map((p) => {
      const v = state.vendors.find((v) => v.id === p.businessId)!;
      const haystack =
        `${p.name} ${p.description} ${v.name} ${v.category} ${v.tags.join(" ")}`.toLowerCase();
      return {
        product: p,
        score: words.reduce((s, w) => s + (haystack.includes(w) ? 1 : 0), 0),
      };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.product);
}
export function validMarket(value: unknown): value is MarketState {
  if (!value || typeof value !== "object") return false;
  const s = value as MarketState;
  const statuses = [
    "pending",
    "approved",
    "rejected",
    "needs_information",
    "suspended",
  ];
  return (
    Array.isArray(s.vendors) &&
    s.vendors.every(
      (v) =>
        typeof v.id === "string" &&
        typeof v.slug === "string" &&
        typeof v.ownerId === "string" &&
        typeof v.owner === "string" &&
        typeof v.name === "string" &&
        typeof v.description === "string" &&
        categories.slice(1).includes(v.category) &&
        statuses.includes(v.status) &&
        typeof v.phone === "string" &&
        (v.phone === "" || /^\d{10,15}$/.test(v.phone)) &&
        typeof v.location === "string" &&
        typeof v.hours === "string" &&
        typeof v.submittedAt === "string" &&
        typeof v.sample === "boolean" &&
        typeof v.emoji === "string" &&
        /^#[a-f0-9]{6}$/i.test(v.color) &&
        Array.isArray(v.tags) &&
        v.tags.every((t) => typeof t === "string") &&
        Array.isArray(v.evidence) &&
        v.evidence.every((t) => typeof t === "string"),
    ) &&
    Array.isArray(s.products) &&
    s.products.every(
      (p) =>
        typeof p.id === "string" &&
        s.vendors.some((v) => v.id === p.businessId) &&
        typeof p.name === "string" &&
        typeof p.description === "string" &&
        typeof p.price === "number" &&
        Number.isFinite(p.price) &&
        p.price >= 0 &&
        typeof p.active === "boolean" &&
        typeof p.available === "boolean" &&
        typeof p.emoji === "string" &&
        /^#[a-f0-9]{6}$/i.test(p.color) &&
        typeof p.createdAt === "string" &&
        typeof p.reviewCount === "number" &&
        (p.rating === undefined ||
          (typeof p.rating === "number" && p.rating >= 0 && p.rating <= 5)),
    ) &&
    Array.isArray(s.history) &&
    s.history.every(
      (h) =>
        typeof h.id === "string" &&
        typeof h.businessId === "string" &&
        statuses.includes(h.status) &&
        typeof h.note === "string" &&
        typeof h.at === "string" &&
        typeof h.reviewer === "string",
    ) &&
    Array.isArray(s.saved) &&
    s.saved.every((id) => typeof id === "string")
  );
}
