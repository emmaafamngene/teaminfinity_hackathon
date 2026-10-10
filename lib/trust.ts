export type Trust = {
  businessId: string;
  slug: string;
  name: string;
  phone: string;
  memberSince: string;
  idVerifiedAt: string | null;
  phoneVerifiedAt: string | null;
  ordersCompleted: number;
  responseRate: number | null;
  rating: number | null;
  reviewCount: number;
  reported: boolean;
  underReview: boolean;
  idUploaded?: boolean;
};
export type Order = {
  id: string;
  business_id: string;
  product_id: string | null;
  buyer_id: string;
  product_name: string;
  unit_price: number;
  quantity: number;
  status: "placed" | "preparing" | "delivered" | "confirmed";
  payment_method: "pay_on_delivery";
  fulfillment: "delivery" | "pickup";
  fulfillment_location: string;
  notes: string;
  created_at: string;
  confirmed_at: string | null;
};
export const orderSteps = [
  "placed",
  "preparing",
  "delivered",
  "confirmed",
] as const;
export const orderLabels = {
  placed: "Placed",
  preparing: "Preparing",
  delivered: "Delivered",
  confirmed: "Confirmed by buyer",
};
export function trustScore(t: Trust) {
  return (
    (t.idVerifiedAt ? 50 : 0) +
    (t.phoneVerifiedAt ? 30 : 0) +
    (t.ordersCompleted > 0 ? 20 : 0)
  );
}
export function normalizeVendorLookup(value: string, trustedHostname?: string) {
  const text = value.trim();
  if (/^[+\d\s()-]+$/.test(text)) {
    const digits = text.replace(/\D/g, "");
    return {
      phone:
        digits.startsWith("0") && digits.length === 11
          ? "234" + digits.slice(1)
          : digits,
    };
  }
  const parsed = text.startsWith("/")
    ? null
    : new URL(text.includes("://") ? text : "https://" + text);
  if (parsed && trustedHostname && parsed.hostname !== trustedHostname)
    throw new Error("Use a link from this Campus Connect site.");
  const path = parsed ? parsed.pathname : text;
  const match = path.match(/^\/(?:v|businesses)\/([a-zA-Z0-9_-]+)\/?$/);
  if (!match)
    throw new Error("Paste a Campus Connect vendor link or phone number.");
  return { slug: match[1] };
}
