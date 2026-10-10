import "server-only";
import { requireStudentIdentity } from "@/lib/auth";
import { isStudent } from "@/lib/permissions";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { ApiError, identity, requireIdentity } from "@/lib/auth";
import { normalizeVendorLookup } from "@/lib/trust";
const uuid = z.uuid();
function data<
  R extends {
    data?: unknown;
    error: { message: string; code?: string } | null;
  },
>(r: R): R["data"] {
  if (r.error)
    throw new ApiError(
      r.error.code === "42501" ? 403 : r.error.code === "23505" ? 409 : 400,
      r.error.message,
    );
  return r.data;
}
async function body(r: Request) {
  if (Number(r.headers.get("content-length") || 0) > 10000)
    throw new ApiError(413, "Request too large.");
  return r.json();
}
export async function trustApi(request: Request, parts: string[]) {
  const path = parts.join("/");
  const method = request.method;
  const url = new URL(request.url);
  if (path === "trust" && method === "GET") {
    const db = await createClient();
    return {
      trust: data(
        await db.rpc("cc_vendor_trust", {
          business: uuid.parse(url.searchParams.get("business")),
        }),
      ),
    };
  }
  if (path === "verify-vendor" && method === "GET") {
    const db = await createClient();
    let value;
    try {
      value = normalizeVendorLookup(
        z.string().min(3).max(300).parse(url.searchParams.get("q")),
        url.hostname,
      );
    } catch {
      throw new ApiError(
        400,
        "Paste a vendor link from this Campus Connect site or a phone number.",
      );
    }
    let q = db.from("cc_businesses").select("id").eq("status", "approved");
    if (value.slug) q = q.eq("slug", value.slug);
    else {
      const phone = value.phone!;
      q = q.in(
        "phone",
        phone.startsWith("234") ? [phone, "0" + phone.slice(3)] : [phone],
      );
    }
    const found = data(await q.maybeSingle());
    if (!found) return { result: "Not found", trust: null };
    const trust = data(
      await db.rpc("cc_vendor_trust", { business: found.id }),
    ) as Record<string, unknown> | null;
    return {
      result: trust?.reported
        ? "Reported"
        : trust?.idVerifiedAt || trust?.phoneVerifiedAt
          ? "Verified"
          : "Not verified",
      trust,
    };
  }
  if (path === "orders" && method === "GET") {
    const auth =
      url.searchParams.get("vendor") === "1"
        ? await requireIdentity("vendor")
        : await requireStudentIdentity();
    const { db, user } = auth;
    let q = db
      .from("cc_orders")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (url.searchParams.get("vendor") !== "1") q = q.eq("buyer_id", user.id);
    else {
      const b = data(
        await db
          .from("cc_businesses")
          .select("id")
          .eq("owner_id", user.id)
          .maybeSingle(),
      );
      if (!b) return { orders: [] };
      q = q.eq("business_id", b.id);
    }
    return { orders: data(await q) };
  }
  if (path === "orders" && method === "POST") {
    const { db, user } = await requireStudentIdentity();
    const input = z
      .object({
        product_id: uuid,
        quantity: z.number().int().min(1).max(99),
        fulfillment: z.enum(["pickup", "delivery"]),
        fulfillment_location: z.string().trim().max(300).default(""),
        notes: z.string().trim().max(1000).default(""),
      })
      .strict()
      .parse(await body(request));
    const product = data(
      await db
        .from("cc_products")
        .select("business_id")
        .eq("id", input.product_id)
        .single(),
    );
    if (!product) throw new ApiError(404, "Listing unavailable.");
    const order = data(
      await db
        .from("cc_orders")
        .insert({
          ...input,
          business_id: product.business_id,
          buyer_id: user.id,
        })
        .select("*")
        .single(),
    );
    return { order };
  }
  if (parts[0] === "orders" && parts[1]) {
    const { db, user } = await requireIdentity();
    const id = uuid.parse(parts[1]);
    const order = data(
      await db.from("cc_orders").select("*").eq("id", id).maybeSingle(),
    );
    if (!order) throw new ApiError(404, "Order not found.");
    if (parts.length === 2 && method === "GET") return { order };
    if (parts.length === 2 && method === "PATCH") {
      const input = z
        .object({ status: z.enum(["preparing", "delivered", "confirmed"]) })
        .strict()
        .parse(await body(request));
      const changed = data(
        await db
          .from("cc_orders")
          .update(input)
          .eq("id", id)
          .eq("status", order.status)
          .select("*")
          .maybeSingle(),
      );
      if (!changed)
        throw new ApiError(409, "Order changed; refresh and try again.");
      return { order: changed };
    }
    if (parts[2] === "messages" && method === "GET")
      return {
        messages: data(
          await db
            .from("cc_messages")
            .select("*")
            .eq("order_id", id)
            .order("created_at", { ascending: false })
            .limit(100),
        ),
      };
    if (parts[2] === "messages" && method === "POST") {
      const input = z
        .object({ body: z.string().trim().min(1).max(2000) })
        .strict()
        .parse(await body(request));
      data(
        await db
          .from("cc_messages")
          .insert({ ...input, order_id: id, author_id: user.id }),
      );
      return { ok: true };
    }
  }
  if (path === "review-eligibility" && method === "GET") {
    const auth = await identity();
    if (!auth || !isStudent(auth.profile)) return { eligible: false };
    if (auth.profile.blocked) return { eligible: false };
    const business = data(await auth.db.from("cc_businesses").select("owner_id,status").eq("id", uuid.parse(url.searchParams.get("business"))).maybeSingle());
    return { eligible: !!business && business.status === "approved" && business.owner_id !== auth.user.id };
  }
  if (path === "reports" && method === "POST") {
    const { db, user } = await requireIdentity();
    const input = z
      .object({
        business_id: uuid,
        reason: z.enum([
          "payment",
          "identity",
          "quality",
          "harassment",
          "other",
        ]),
        details: z.string().trim().min(10).max(2000),
      })
      .strict()
      .parse(await body(request));
    data(
      await db.from("cc_reports").insert({ ...input, reporter_id: user.id }),
    );
    return { ok: true };
  }
  if (path === "admin/trust" && method === "GET") {
    const { db } = await requireIdentity("admin");
    return {
      reports: data(
        await db
          .from("cc_reports")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(100),
      ),
      verifications: data(await db.from("cc_verifications").select("*")),
    };
  }
  if (
    parts[0] === "admin" &&
    parts[1] === "verification" &&
    parts[2] &&
    method === "PATCH"
  ) {
    const { db } = await requireIdentity("admin");
    const input = z
      .object({
        id_checked: z.boolean(),
        phone_checked: z.boolean(),
        reason: z.string().trim().min(10).max(1000),
      })
      .strict()
      .parse(await body(request));
    data(
      await db.rpc("cc_record_verification", {
        business: uuid.parse(parts[2]),
        ...input,
      }),
    );
    return { ok: true };
  }
  if (
    parts[0] === "admin" &&
    parts[1] === "reports" &&
    parts[2] &&
    method === "PATCH"
  ) {
    const { db } = await requireIdentity("admin");
    const input = z
      .object({ status: z.enum(["reviewing", "resolved", "dismissed"]) })
      .strict()
      .parse(await body(request));
    const changed = data(
      await db
        .from("cc_reports")
        .update(input)
        .eq("id", uuid.parse(parts[2]))
        .select("id")
        .maybeSingle(),
    );
    if (!changed) throw new ApiError(404, "Report not found.");
    return { ok: true };
  }
  throw new ApiError(405, "Unsupported trust operation.");
}
