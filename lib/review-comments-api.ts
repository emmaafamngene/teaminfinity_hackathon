import "server-only";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireStudentIdentity, requireIdentity, ApiError } from "@/lib/auth";
export async function reviewCommentsApi(request: Request, parts: string[]) {
  const id = z.uuid().parse(parts[1]);
  if (request.method === "GET") {
    const db = await createClient();
    const r = await db
      .from("cc_review_comments")
      .select("*")
      .eq("review_id", id)
      .order("created_at")
      .limit(100);
    if (r.error) throw new ApiError(400, "Could not load comments.");
    return { comments: r.data };
  }
  if (request.method === "POST") {
    const { db, user } = await requireStudentIdentity();
    const input = z
      .object({ body: z.string().trim().min(2).max(1000) })
      .strict()
      .parse(await request.json());
    const r = await db
      .from("cc_review_comments")
      .insert({ review_id: id, user_id: user.id, body: input.body });
    if (r.error)
      throw new ApiError(
        403,
        "You cannot comment on this review. The seller must be approved and the review visible.",
      );
    return { ok: true };
  }
  if (request.method === "DELETE") {
    const { db, user, profile } = await requireIdentity();
    let q = db.from("cc_review_comments").delete().eq("id", id);
    if (profile.role !== "admin") q = q.eq("user_id", user.id);
    const r = await q.select("id").maybeSingle();
    if (r.error || !r.data)
      throw new ApiError(404, "Your comment was not found.");
    return { ok: true };
  }
  throw new ApiError(405, "Method not allowed.");
}
