import "server-only";
import { redirect } from "next/navigation";
import { createClient, configured } from "@/lib/supabase/server";
import { allowedRole, type Role } from "@/lib/security";
import { isStudent, isVendorAccount } from "@/lib/permissions";
export type Profile = {
  id: string;
  full_name: string;
  role: Role;
  blocked: boolean;
  created_at?: string;
  account_kind: "student" | "vendor";
};
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
    public retryAfterSeconds?: number,
  ) {
    super(message);
  }
}
export async function identity() {
  if (!configured()) return null;
  const db = await createClient();
  const {
    data: { user },
    error,
  } = await db.auth.getUser();
  if (error || !user) return null;
  const { data: profile, error: profileError } = await db
    .from("cc_profiles")
    .select("id,full_name,role,blocked,created_at,account_kind")
    .eq("id", user.id)
    .single();
  if (profileError || !profile)
    throw new ApiError(
      503,
      "Your account profile is unavailable. Check the database migration.",
    );
  return { db, user, profile: profile as Profile };
}
export async function requireIdentity(role?: Role) {
  const auth = await identity();
  if (!auth) throw new ApiError(401, "Please sign in to continue.");
  if (auth.profile.blocked || !allowedRole(auth.profile.role, role))
    throw new ApiError(403, "You do not have access to this workspace.");
  return auth;
}
export async function protectPage(path: string, role?: Role) {
  const auth = await identity();
  if (!auth) redirect(`/login?next=${encodeURIComponent(path)}`);
  if (auth.profile.blocked || !allowedRole(auth.profile.role, role))
    redirect("/forbidden");
  return auth;
}
export async function requireStudentIdentity() {
  const auth = await requireIdentity();
  if (!isStudent(auth.profile))
    throw new ApiError(403, "This feature is for student buyer accounts.");
  return auth;
}
export async function protectStudentPage(path: string) {
  const auth = await protectPage(path);
  if (!isStudent(auth.profile)) redirect("/forbidden");
  return auth;
}
export async function protectVendorAccount(path: string) {
  const auth = await protectPage(path);
  if (!isVendorAccount(auth.profile) && auth.profile.role !== "admin")
    redirect("/forbidden");
  return auth;
}
