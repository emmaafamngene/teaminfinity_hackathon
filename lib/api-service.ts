import "server-only";
import { createHash } from "node:crypto";
import { registrationAdmin } from "@/lib/supabase/admin";
import { reviewCommentsApi } from "@/lib/review-comments-api";
import { requireStudentIdentity } from "@/lib/auth";
import { isVendorAccount } from "@/lib/permissions";

import { trustApi } from "@/lib/trust-api";
import { verificationInput } from "@/lib/auth-input";
import {
  registrationInput,
  emailInput,
  accountType,
  authFailure,
  accountDestination,
} from "@/lib/auth-input";
import { prepareImage } from "@/lib/image-processing";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { ApiError, identity, requireIdentity } from "@/lib/auth";
import { businessInput, productInput, reviewInput } from "@/lib/validation";
import { validateUploadMeta, ownsImage, safeReturnPath } from "@/lib/security";
const uuid = z.uuid();
function checked<
  R extends {
    data?: unknown;
    error: { message: string; code?: string } | null;
  },
>(result: R): R["data"] {
  if (result.error)
    throw new ApiError(
      result.error.code === "42501"
        ? 403
        : result.error.code === "23505"
          ? 409
          : 400,
      result.error.code === "23505"
        ? "This record already exists. Edit your existing entry instead."
        : result.error.message,
    );
  return result.data;
}
async function json(request: Request) {
  const length = Number(request.headers.get("content-length") || 0);
  if (length > 100000) throw new ApiError(413, "Request is too large.");
  return request.json();
}
export async function approvedOwner(id?: string) {
  const auth = await requireIdentity();
  if (!["vendor", "admin"].includes(auth.profile.role))
    throw new ApiError(403, "Approved vendor role required.");
  const query = auth.db
    .from("cc_businesses")
    .select("*")
    .eq("owner_id", auth.user.id)
    .eq("status", "approved");
  const row = checked(await (id ? query.eq("id", id) : query).maybeSingle());
  if (!row)
    throw new ApiError(403, "An approved business owned by you is required.");
  return { ...auth, business: row };
}
export async function getMarket() {
  const db = await createClient();
  const auth = await identity();
  if (auth?.profile.blocked)
    throw new ApiError(403, "Your account is restricted.");
  const [
    businessResult,
    productResult,
    reviewResult,
    savedResult,
    historyResult,
    applicationResult,
  ] = await Promise.all([
    db
      .from("cc_businesses")
      .select("*")
      .order("submitted_at", { ascending: false }),
    db
      .from("cc_products")
      .select("*")
      .order("created_at", { ascending: false }),
    db.from("cc_product_ratings").select("*"),
    auth
      ? db.from("cc_saved").select("product_id").eq("user_id", auth.user.id)
      : Promise.resolve({ data: [], error: null }),
    auth
      ? db
          .from("cc_audit_log")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(100)
      : Promise.resolve({ data: [], error: null }),
    auth
      ? db.from("cc_applications").select("*")
      : Promise.resolve({ data: [], error: null }),
  ]);
  const businesses = checked(businessResult) || [];
  const sellerRatings = checked(await db.from("cc_business_ratings").select("*")) || [];
  const reviews = checked(reviewResult) || [];
  const applications = checked(applicationResult) || [];
  const products = await Promise.all(
    (checked(productResult) || []).map(async (p) => {
      const ownReviews = reviews.filter((r) => r.product_id === p.id);
      const signed = p.image_paths?.length
        ? checked(
            await db.storage
              .from("cc-products")
              .createSignedUrls(p.image_paths, 600),
          )
        : [];
      return {
        id: p.id,
        businessId: p.business_id,
        name: p.name,
        description: p.description,
        price: Number(p.price),
        available: p.available,
        active: p.active,
        category: p.category,
        imagePaths: p.image_paths,
        images: signed?.map((s) => s.signedUrl).filter(Boolean) || [],
        emoji: "",
        color: "#edf0e5",
        rating: ownReviews.length ? Number(ownReviews[0].average) : undefined,
        reviewCount: ownReviews[0]?.count || 0,
        createdAt: p.created_at,
      };
    }),
  );
  return {
    state: {
      vendors: businesses.map((b) => {
        const application = applications.find((a) => a.business_id === b.id);
        return {
          id: b.id,
          slug: b.slug,
          ownerId: b.owner_id,
          name: b.name,
          owner: b.owner_name,
          category: b.category,
          description: b.description,
          phone: b.phone,
          location: b.location,
          hours: b.hours,
          status: b.status,
          sample: false,
          emoji: "",
          color: "#dce6b9",
          tags: b.description.toLowerCase().split(/\W+/),
          submittedAt: b.submitted_at,
          evidence: application?.evidence_paths || [],
          logoName: application?.logo_path,
          rating: sellerRatings.find((r) => r.business_id === b.id)?.average == null ? undefined : Number(sellerRatings.find((r) => r.business_id === b.id)?.average),
        reviewCount: sellerRatings.find((r) => r.business_id === b.id)?.count || 0,
        };
      }),
      products,
      saved: checked(savedResult)?.map((s) => s.product_id) || [],
      history:
        checked(historyResult)?.map((h) => ({
          id: h.id,
          businessId: h.business_id,
          status: h.action,
          note: h.note,
          at: h.created_at,
          reviewer: h.actor_id,
        })) || [],
    },
    user: auth ? { email: auth.user.email, ...auth.profile } : null,
  };
}
export async function handleApi(request: Request, parts: string[]) {
  const method = request.method;
  const path = parts.join("/");
  if (method !== "GET") {
    const origin = request.headers.get("origin");
    if (origin !== new URL(request.url).origin)
      throw new ApiError(403, "Cross-origin requests are not allowed.");
  }
  if (path === "market" && method === "GET") return getMarket();
  if (parts[0] === "review-comments") return reviewCommentsApi(request, parts);
  if (
    [
      "trust",
      "verify-vendor",
      "orders",
      "review-eligibility",
      "reports",
    ].includes(parts[0]) ||
    (parts[0] === "admin" &&
      ["trust", "verification", "reports"].includes(parts[1]))
  )
    return trustApi(request, parts);
  if (path.startsWith("auth/")) {
    const db = await createClient();
    if (path === "auth/logout" && method === "POST") {
      checked(await db.auth.signOut());
      return { ok: true };
    }
    if (method !== "POST") throw new ApiError(405, "Method not allowed.");
    const fail = (error: {
      code?: string;
      message: string;
      status?: number;
    }) => {
      const failure = authFailure(error);
      throw new ApiError(
        failure.status,
        failure.message,
        failure.code,
        failure.retryAfterSeconds,
      );
    };
    if (path === "auth/verify") {
      const input = verificationInput.parse(await json(request));
      const result = await db.auth.verifyOtp({
        email: input.email,
        token: input.token,
        type: "email",
      });
      if (result.error) fail(result.error);
      const auth = await requireIdentity();
      return {
        ok: true,
        redirectTo: accountDestination(
          auth.profile.role,
          auth.profile.account_kind,
        ),
      };
    }
    if (path === "auth/send-code") {
      const input = z
        .object({ email: emailInput })
        .strict()
        .parse(await json(request));
      const result = await db.auth.signInWithOtp({
        email: input.email,
        options: { shouldCreateUser: false },
      });
      if (result.error) fail(result.error);
      return { ok: true };
    }
    if (path === "auth/resend" || path === "auth/reset-password") {
      const input = z
        .object({
          email: emailInput,
          account_type: accountType.default("student"),
        })
        .strict()
        .parse(await json(request));
      const callback = new URL("/auth/callback", request.url);
      callback.searchParams.set(
        "next",
        path === "auth/reset-password"
          ? "/reset-password"
          : accountDestination("student", input.account_type),
      );
      const result =
        path === "auth/resend"
          ? await db.auth.resend({
              type: "signup",
              email: input.email,
              options: { emailRedirectTo: callback.href },
            })
          : await db.auth.resetPasswordForEmail(input.email, {
              redirectTo: callback.href,
            });
      if (result.error) fail(result.error);
      return { ok: true };
    }
    if (path === "auth/update-password") {
      await requireIdentity();
      const input = z
        .object({ password: z.string().min(8).max(128) })
        .strict()
        .parse(await json(request));
      const result = await db.auth.updateUser(input);
      if (result.error) fail(result.error);
      return { ok: true };
    }
    if (path === "auth/change-password") {
      await requireIdentity();
      const input = z
        .object({
          password: z.string().min(8).max(128),
          currentPassword: z.string().min(1).max(128),
        })
        .strict()
        .parse(await json(request));
      const result = await db.auth.updateUser(input);
      if (result.error) fail(result.error);
      return { ok: true };
    }
    if (path === "auth/login") {
      throw new ApiError(405, "Use an email sign-in code to log in.");
    }
    if (path === "auth/register") {
      const input = registrationInput.parse(await json(request));
      const admin = registrationAdmin();
      const address = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
      const bucket = createHash("sha256").update(address).digest("hex");
      const slot = await admin.rpc("cc_signup_slot", { bucket });
      if (slot.error) throw new ApiError(503, "Account creation is temporarily unavailable.");
      if (!slot.data) throw new ApiError(429, "Too many account creation attempts. Try again in an hour.");
      const { error } = await admin.auth.admin.createUser({
        email: input.email,
        password: input.password,
        email_confirm: false,
        user_metadata: {
            full_name: input.full_name,
            account_type: input.account_type,
        },
      });
      if (error) fail(error);
      return { ok: true, confirmationRequired: false, redirectTo: "/login?registered=1" };
    }
    throw new ApiError(404, "Not found.");
  }
  if (path === "profile" && method === "PATCH") {
    const { db, user } = await requireIdentity();
    const input = z
      .object({ full_name: z.string().trim().min(2).max(80) })
      .strict()
      .parse(await json(request));
    checked(await db.from("cc_profiles").update(input).eq("id", user.id));
    return { ok: true };
  }
  if (path === "applications" && method === "POST") {
    const { db, user } = await requireIdentity();
    const profile = (await requireIdentity()).profile;
    if (!isVendorAccount(profile))
      throw new ApiError(
        403,
        "Vendor signup is required to submit a business application.",
      );
    const input = businessInput.parse(await json(request));
    const existing = checked(
      await db
        .from("cc_businesses")
        .select("id,status")
        .eq("owner_id", user.id)
        .maybeSingle(),
    );
    if (
      existing &&
      !["rejected", "needs_information"].includes(existing.status)
    )
      throw new ApiError(
        409,
        "Your application already exists. Check its status.",
      );
    const row = checked(
      await (
        existing
          ? db
              .from("cc_businesses")
              .update({
                ...input,
                status: "pending",
                submitted_at: new Date().toISOString(),
              })
              .eq("id", existing.id)
          : db.from("cc_businesses").insert({ ...input, owner_id: user.id })
      )
        .select("id")
        .single(),
    );
    return { id: row!.id };
  }
  if (parts[0] === "applications" && parts[1] && method === "PATCH") {
    const { db, user } = await requireIdentity();
    const id = uuid.parse(parts[1]);
    const business = checked(
      await db
        .from("cc_businesses")
        .select("owner_id,status")
        .eq("id", id)
        .single(),
    );
    if (
      business?.owner_id !== user.id ||
      !["pending", "rejected", "needs_information"].includes(business.status)
    )
      throw new ApiError(403, "Application cannot be edited.");
    const input = z
      .object({
        evidence_paths: z.array(z.string().max(250)).min(1).max(4),
        logo_path: z.string().max(250),
      })
      .strict()
      .parse(await json(request));
    checked(
      await db.from("cc_applications").upsert({ ...input, business_id: id }),
    );
    return { ok: true };
  }
  if (path === "vendor/business" && method === "PATCH") {
    const { db, business } = await approvedOwner();
    const input = z
      .object({
        description: z.string().trim().min(10).max(1000),
        phone: z.string().regex(/^\d{10,15}$/),
        location: z.string().trim().min(2).max(120),
        hours: z.string().trim().min(2).max(80),
      })
      .strict()
      .parse(await json(request));
    checked(await db.from("cc_businesses").update(input).eq("id", business.id));
    return { ok: true };
  }
  if (parts[0] === "vendor" && parts[1] === "products") {
    const { db, business, user } = await approvedOwner();
    if (method === "POST" && parts.length === 2) {
      const input = productInput.parse(await json(request));
      if (input.image_paths?.length)
        throw new ApiError(400, "Create the draft, then upload images.");
      const p = checked(
        await db
          .from("cc_products")
          .insert({ ...input, business_id: business.id, active: false })
          .select("*")
          .single(),
      );
      return { id: p!.id };
    }
    const id = uuid.parse(parts[2]);
    const existing = checked(
      await db
        .from("cc_products")
        .select("*")
        .eq("id", id)
        .eq("business_id", business.id)
        .maybeSingle(),
    );
    if (!existing) throw new ApiError(404, "Product not found.");
    if (method === "DELETE") {
      checked(
        await db
          .from("cc_products")
          .delete()
          .eq("id", id)
          .eq("business_id", business.id),
      );
      return { ok: true };
    }
    if (method === "PATCH") {
      const input = productInput.partial().parse(await json(request));
      if (input.image_paths?.some((p) => !ownsImage(p, user.id, id)))
        throw new ApiError(
          403,
          "Images must belong to this product and vendor.",
        );
      checked(
        await db
          .from("cc_products")
          .update(input)
          .eq("id", id)
          .eq("business_id", business.id),
      );
      return { ok: true };
    }
  }
  if (path === "saved" && method === "POST") {
    const { db, user } = await requireStudentIdentity();
    const input = z
      .object({ product_id: uuid, saved: z.boolean() })
      .strict()
      .parse(await json(request));
    if (input.saved)
      checked(
        await db
          .from("cc_saved")
          .upsert({ user_id: user.id, product_id: input.product_id }),
      );
    else
      checked(
        await db
          .from("cc_saved")
          .delete()
          .eq("user_id", user.id)
          .eq("product_id", input.product_id),
      );
    return { ok: true };
  }
  if (path === "uploads" && method === "POST") {
    const auth = await requireIdentity();
    if (Number(request.headers.get("content-length") || 0) > 6 * 1024 * 1024)
      throw new ApiError(413, "Upload is too large.");
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new ApiError(400, "Select a file.");
    const kind = String(form.get("kind"));
    const entity = uuid.parse(form.get("entity_id"));
    const evidence = kind === "evidence" || kind === "logo";
    if (!evidence && kind !== "product")
      throw new ApiError(400, "Invalid upload kind.");
    if (evidence) {
      const b = checked(
        await auth.db
          .from("cc_businesses")
          .select("owner_id,status")
          .eq("id", entity)
          .single(),
      );
      if (
        b?.owner_id !== auth.user.id ||
        !["pending", "rejected", "needs_information"].includes(b.status)
      )
        throw new ApiError(
          403,
          "You cannot upload evidence for this application.",
        );
    } else {
      const p = checked(
        await auth.db
          .from("cc_products")
          .select("business_id")
          .eq("id", entity)
          .single(),
      );
      await approvedOwner(p?.business_id);
    }
    let buffer = Buffer.from(await file.arrayBuffer());
    let type = "image/webp",
      extension = "webp";
    if (kind === "evidence" && file.type === "application/pdf") {
      if (
        file.size <= 0 ||
        file.size > 5 * 1024 * 1024 ||
        buffer.subarray(0, 5).toString() !== "%PDF-"
      )
        throw new ApiError(400, "Invalid PDF or file exceeds 5 MB.");
      type = "application/pdf";
      extension = "pdf";
    } else {
      validateUploadMeta(file.size, file.type);
      try {
        buffer = Buffer.from(await prepareImage(buffer, file.size, file.type));
      } catch {
        throw new ApiError(400, "This file is not a valid supported image.");
      }
    }
    const path = `${auth.user.id}/${entity}/${crypto.randomUUID()}.${extension}`;
    checked(
      await auth.db.storage
        .from(evidence ? "cc-verification" : "cc-products")
        .upload(path, buffer, { contentType: type, upsert: false }),
    );
    return { path };
  }
  if (path === "uploads" && method === "DELETE") {
    const { db, user } = await requireIdentity();
    const input = z
      .object({ paths: z.array(z.string().max(250)).max(6) })
      .strict()
      .parse(await json(request));
    if (input.paths.some((p) => !p.startsWith(`${user.id}/`)))
      throw new ApiError(403, "You may remove only your own unused images.");
    checked(await db.storage.from("cc-products").remove(input.paths));
    return { ok: true };
  }
  if (path === "cleanup" && method === "POST") {
    const { db } = await requireIdentity();
    const jobs = checked(await db.from("cc_cleanup").select("*").limit(20));
    for (const job of jobs || []) {
      const { error } = await db.storage.from("cc-products").remove(job.paths);
      if (!error)
        checked(await db.from("cc_cleanup").delete().eq("id", job.id));
    }
    return { ok: true };
  }
  if (path === "evidence" && method === "GET") {
    const { db } = await requireIdentity("admin");
    const id = uuid.parse(new URL(request.url).searchParams.get("business"));
    const app = checked(
      await db
        .from("cc_applications")
        .select("*")
        .eq("business_id", id)
        .single(),
    );
    const paths = [
      ...(app?.evidence_paths || []),
      ...(app?.logo_path ? [app.logo_path] : []),
    ];
    return {
      files: paths.length
        ? checked(
            await db.storage
              .from("cc-verification")
              .createSignedUrls(paths, 60),
          )
        : [],
    };
  }
  if (path === "reviews" && method === "GET") {
    const db = await createClient();
    const url = new URL(request.url);
    const page = Math.max(
      1,
      Math.min(1000, Number(url.searchParams.get("page")) || 1),
    );
    let query = db
      .from("cc_reviews")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });
    if (url.searchParams.get("mine") === "1") {
      const { user } = await requireIdentity();
      query = query.eq("user_id", user.id);
    } else {
      query = query.eq("hidden", false);
      if (url.searchParams.get("product"))
        query = query.eq(
          "product_id",
          uuid.parse(url.searchParams.get("product")),
        );
      else if (url.searchParams.get("business"))
        query = query.eq(
          "business_id",
          uuid.parse(url.searchParams.get("business")),
        );
    }
    const result = await query.range((page - 1) * 10, page * 10 - 1);
    const rows = checked(result) || [];
    const summary = url.searchParams.get("product")
      ? checked(
          await db
            .from("cc_product_ratings")
            .select("average,count")
            .eq("product_id", url.searchParams.get("product")!)
            .maybeSingle(),
        )
      : url.searchParams.get("business")
        ? checked(
            await db
              .from("cc_business_ratings")
              .select("average,count")
              .eq("business_id", url.searchParams.get("business")!)
              .maybeSingle(),
          )
        : null;
    return { reviews: rows, count: result.count || 0, page, summary };
  }
  if (path === "reviews" && method === "POST") {
    const { db, user } = await requireStudentIdentity();
    const input = reviewInput.parse(await json(request));
    if (input.product_id) {
      const p = checked(
        await db
          .from("cc_products")
          .select("business_id,active")
          .eq("id", input.product_id)
          .single(),
      );
      if (!p?.active || p.business_id !== input.business_id)
        throw new ApiError(400, "Invalid review target.");
    }
    checked(await db.from("cc_reviews").insert({ ...input, user_id: user.id }));
    return { ok: true };
  }
  if (parts[0] === "reviews" && parts[1]) {
    const { db, user } = await requireIdentity();
    const id = uuid.parse(parts[1]);
    if (method === "PATCH") {
      const input = z
        .object({
          rating: z.number().int().min(1).max(5),
          body: z.string().trim().min(10).max(1500),
        })
        .strict()
        .parse(await json(request));
      const row = checked(
        await db
          .from("cc_reviews")
          .update(input)
          .eq("id", id)
          .eq("user_id", user.id)
          .select("id")
          .maybeSingle(),
      );
      if (!row) throw new ApiError(404, "Your review was not found.");
      return { ok: true };
    }
    if (method === "DELETE") {
      const row = checked(
        await db
          .from("cc_reviews")
          .delete()
          .eq("id", id)
          .eq("user_id", user.id)
          .select("id")
          .maybeSingle(),
      );
      if (!row) throw new ApiError(404, "Your review was not found.");
      return { ok: true };
    }
  }
  if (parts[0] === "admin") {
    const { db } = await requireIdentity("admin");
    if (path === "admin/users" && method === "GET")
      return {
        users: checked(
          await db
            .from("cc_profiles")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(200),
        ),
      };
    if (path === "admin/reviews" && method === "GET")
      return {
        reviews: checked(
          await db
            .from("cc_reviews")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(200),
        ),
      };
    if (parts[1] === "applications" && method === "PATCH") {
      const id = uuid.parse(parts[2]);
      const input = z
        .object({
          decision: z.enum([
            "approved",
            "rejected",
            "needs_information",
            "suspended",
          ]),
          reason: z.string().trim().max(1000),
        })
        .strict()
        .parse(await json(request));
      checked(
        await db.rpc("cc_review_business", {
          business: id,
          decision: input.decision,
          reason: input.reason,
        }),
      );
      return { ok: true };
    }
    if (parts[1] === "users" && method === "PATCH") {
      const id = uuid.parse(parts[2]);
      const input = z
        .object({ role: z.enum(["student", "vendor"]), blocked: z.boolean() })
        .strict()
        .parse(await json(request));
      checked(
        await db.rpc("cc_manage_user", {
          target: id,
          new_role: input.role,
          is_blocked: input.blocked,
        }),
      );
      return { ok: true };
    }
    if (parts[1] === "products" && method === "PATCH") {
      const id = uuid.parse(parts[2]);
      const input = z
        .object({ active: z.boolean() })
        .strict()
        .parse(await json(request));
      checked(await db.from("cc_products").update(input).eq("id", id));
      return { ok: true };
    }
    if (parts[1] === "reviews" && method === "PATCH") {
      const id = uuid.parse(parts[2]);
      const input = z
        .object({ hidden: z.boolean() })
        .strict()
        .parse(await json(request));
      checked(await db.from("cc_reviews").update(input).eq("id", id));
      return { ok: true };
    }
  }
  throw new ApiError(404, "Endpoint not found.");
}
