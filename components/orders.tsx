"use client";
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { MarketShell } from "@/components/market-shell";
import { VendorNav } from "@/components/vendor";
import { useMarket } from "@/components/market-provider";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api-client";
import { orderLabels, orderSteps, type Order } from "@/lib/trust";
import { formatPrice } from "@/lib/businesses";
import { isStudent } from "@/lib/permissions";
export function OrderButton({ productId }: { productId: string }) {
  const { user, state } = useMarket();
  const product = state.products.find((p) => p.id === productId);
  const vendor = state.vendors.find((v) => v.id === product?.businessId);
  const [fulfillment, setFulfillment] = useState<"pickup" | "delivery">("pickup");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function place(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    const f = new FormData(e.currentTarget);
    try {
      const r = await api<{ order: Order }>("/api/orders", "POST", {
        product_id: productId,
        quantity: Number(f.get("quantity")),
        fulfillment: f.get("fulfillment"),
        fulfillment_location: f.get("fulfillment_location") || "",
        notes: f.get("notes"),
      });
      window.location.assign(`/orders/${r.order.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to place order.");
    } finally {
      setBusy(false);
    }
  }
  if (user && !isStudent(user)) return null;
  return (
    <div className="place-order">
      <Button
        className="w-full"
        onClick={() =>
          user
            ? setOpen(!open)
            : window.location.assign(
                `/login?next=${encodeURIComponent(`/products/${productId}`)}`,
              )
        }
      >
        Order safely · Pay on delivery / pickup
      </Button>
      {open && (
        <form className="listing-form" onSubmit={place}>
          <label>
            Quantity
            <input
              name="quantity"
              type="number"
              min="1"
              max="99"
              defaultValue="1"
              required
            />
          </label>
          <label>
            Receive your order
            <select name="fulfillment" value={fulfillment} onChange={(e) => setFulfillment(e.target.value as "pickup" | "delivery")}>
              <option value="pickup">Pickup</option>
              <option value="delivery">Delivery</option>
            </select>
          </label>
          {fulfillment === "delivery" ? <label>Campus delivery location<input name="fulfillment_location" required minLength={5} maxLength={300} placeholder="Building, room or campus meeting point" /><small>Agree delivery timing and any delivery charge with the seller in order chat before they prepare your order.</small></label> : <p className="safety-banner">Pickup location: <strong>{vendor?.location || "Seller location unavailable"}</strong>. Agree a pickup time in order chat.</p>}
          <label>
            Notes
            <textarea
              name="notes"
              maxLength={1000}
              placeholder="Agree a campus pickup or delivery point with the seller. Avoid sharing sensitive information."
            />
          </label>
          <p className="safety-banner">
            Pay on delivery / pickup. Confirm receipt only after checking your
            order.
          </p>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <Button disabled={busy}>
            {busy ? "Placing order…" : "Place order"}
          </Button>
        </form>
      )}
    </div>
  );
}
export function OrdersPage({ vendor = false }: { vendor?: boolean }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  useEffect(() => {
    api<{ orders: Order[] }>(`/api/orders${vendor ? "?vendor=1" : ""}`)
      .then((r) => setOrders(r.orders))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [vendor]);
  const labels = {
    placed: "Pending",
    preparing: "Preparing",
    delivered: "Delivered",
    confirmed: "Confirmed",
  };
  return (
    <MarketShell>
      <div className="dashboard-heading">
        <div>
          <span className="eyebrow">
            {vendor ? "VENDOR WORKSPACE" : "YOUR ACCOUNT"}
          </span>
          <h1>{vendor ? "Customer orders" : "Your orders"}</h1>
          <p>Payment: Pay on delivery / pickup</p>
        </div>
      </div>
      {vendor ? <VendorNav /> : <Link href="/account">← Your profile</Link>}
      <div className="order-filters">
        {["all", ...orderSteps].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            aria-pressed={filter === s}
          >
            {s === "all" ? "All" : labels[s as keyof typeof labels]} (
            {orders.filter((o) => s === "all" || o.status === s).length})
          </button>
        ))}
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {loading ? (
        <p role="status">Loading orders…</p>
      ) : orders.filter((o) => filter === "all" || o.status === filter)
          .length === 0 ? (
        <section className="empty-state">
          <h2>No orders here yet</h2>
          <Link href="/marketplace">Explore the marketplace</Link>
        </section>
      ) : (
        <div className="order-list">
          {orders
            .filter((o) => filter === "all" || o.status === filter)
            .map((o) => (
              <Link key={o.id} href={`/orders/${o.id}`} className="order-card">
                <div>
                  <strong>{o.product_name}</strong>
                  <p>
                    {o.quantity} × {formatPrice(Number(o.unit_price))} ·{" "}
                    {o.fulfillment}
                  </p>
                  <small>
                    {new Date(o.created_at).toLocaleDateString("en-GB")}
                  </small>
                </div>
                <span className="status-badge approved">
                  {o.status === "delivered" && o.fulfillment === "pickup" ? "Ready for pickup" : labels[o.status]}
                </span>
              </Link>
            ))}
        </div>
      )}
    </MarketShell>
  );
}
type Message = {
  id: string;
  author_id: string;
  body: string;
  created_at: string;
};
export function OrderDetails({ id }: { id: string }) {
  const { user, state, refresh } = useMarket();
  const [order, setOrder] = useState<Order | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  async function load() {
    try {
      const [o, m] = await Promise.all([
        api<{ order: Order }>(`/api/orders/${id}`),
        api<{ messages: Message[] }>(`/api/orders/${id}/messages`),
      ]);
      setOrder(o.order);
      setMessages(m.messages.reverse());
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load order.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
    const timer = setInterval(() => {
      void load();
    }, 15000);
    return () => clearInterval(timer);
  }, [id]);
  async function advance(status: string) {
    setBusy(true);
    try {
      await api(`/api/orders/${id}`, "PATCH", { status });
      await load();
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update order.");
    } finally {
      setBusy(false);
    }
  }
  async function send(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api(`/api/orders/${id}/messages`, "POST", { body: text });
      setText("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Message failed.");
    } finally {
      setBusy(false);
    }
  }
  const vendor = state.vendors.find((v) => v.id === order?.business_id);
  const buyer = order?.buyer_id === user?.id;
  const seller = vendor?.ownerId === user?.id;
  return (
    <MarketShell>
      <Link href={seller ? "/vendor/orders" : "/account/orders"}>← Orders</Link>
      <h1 className="trust-title">Order details</h1>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {loading ? (
        <p role="status">Loading order…</p>
      ) : !order ? (
        <p>Order unavailable.</p>
      ) : (
        <>
          <section className="trust-profile">
            <h2>{order.product_name}</h2>
            <p>
              {order.quantity} × {formatPrice(Number(order.unit_price))} · Total{" "}
              {formatPrice(Number(order.unit_price) * order.quantity)}
            </p>
            <p>
              <strong>Pay on delivery / pickup</strong> · {order.fulfillment}
            </p>
            {vendor && (
              <Link href={`/v/${vendor.slug}`}>View {vendor.name} →</Link>
            )}
            <ol className="order-tracker">
              {orderSteps.map((s, i) => (
                <li
                  key={s}
                  className={
                    i <= orderSteps.indexOf(order.status) ? "complete" : ""
                  }
                >
                  <span>{i + 1}</span>
                  {s === "delivered" && order.fulfillment === "pickup" ? "Ready for pickup" : orderLabels[s]}
                </li>
              ))}
            </ol>
            {order.notes && <p>Order notes: {order.notes}</p>}
            <p><strong>{order.fulfillment === "pickup" ? "Pickup location" : "Delivery location"}:</strong> {order.fulfillment_location || "Agree the location in order chat"}</p>
            <div className="form-actions">
              {seller && order.status === "placed" && (
                <Button disabled={busy} onClick={() => advance("preparing")}>
                  Start preparing
                </Button>
              )}
              {seller && order.status === "preparing" && (
                <Button disabled={busy} onClick={() => advance("delivered")}>
                  {order.fulfillment === "pickup" ? "Mark ready for pickup" : "Mark delivered"}
                </Button>
              )}
              {buyer && order.status === "delivered" && (
                <Button
                  disabled={busy}
                  onClick={() => {
                    if (
                      window.confirm(
                        "Have you received and checked this order? This confirms the order is complete.",
                      )
                    )
                      void advance("confirmed");
                  }}
                >
                  {order.fulfillment === "pickup" ? "Confirm collected" : "Confirm received"}
                </Button>
              )}
              {buyer && order.status === "confirmed" && vendor && (
                <Button asChild>
                  <Link
                    href={
                      order.product_id
                        ? `/products/${order.product_id}`
                        : `/v/${vendor.slug}`
                    }
                  >
                    Rate this seller
                  </Link>
                </Button>
              )}
              {buyer && order.status === "confirmed" && order.product_id && state.products.some(p => p.id === order.product_id && p.available && p.active) && <Button variant="outline" asChild><Link href={`/products/${order.product_id}`}>Buy again</Link></Button>}
            </div>
          </section>
          <section className="trust-profile">
            <h2>Order chat</h2>
            <p className="safety-banner">
              Never pay outside CampusConnect before you receive your order.
            </p>
            <p className="demo-note">
              Campus Connect does not collect online payments. Default payment
              is on delivery / pickup.
            </p>
            <div className="chat-messages">
              {messages.length === 0 ? (
                <p>No messages yet. Agree delivery or pickup details here.</p>
              ) : (
                messages.map((m) => (
                  <div
                    className={
                      m.author_id === user?.id
                        ? "chat-message own"
                        : "chat-message"
                    }
                    key={m.id}
                  >
                    <small>
                      {m.author_id === user?.id
                        ? "You"
                        : m.author_id === order.buyer_id
                          ? "Buyer"
                          : "Vendor"}
                    </small>
                    <p>{m.body}</p>
                    <time>
                      {new Date(m.created_at).toLocaleTimeString("en-GB", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </time>
                  </div>
                ))
              )}
            </div>
            {(buyer || seller) && (
              <form onSubmit={send} className="chat-compose">
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  required
                  maxLength={2000}
                  placeholder="Write a message"
                  aria-label="Order message"
                />
                <Button disabled={busy || !text.trim()}>Send</Button>
              </form>
            )}
          </section>
        </>
      )}
    </MarketShell>
  );
}
