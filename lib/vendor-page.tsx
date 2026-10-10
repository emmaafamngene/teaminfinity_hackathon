import { redirect } from "next/navigation";
import { protectPage } from "@/lib/auth";
export async function protectVendorPage(path: string) {
  const { db, user, profile } = await protectPage(path);
  if (!["vendor", "admin"].includes(profile.role))
    redirect("/vendor/application-status");
  const { data } = await db
    .from("cc_businesses")
    .select("id")
    .eq("owner_id", user.id)
    .eq("status", "approved")
    .maybeSingle();
  if (!data) redirect("/vendor/application-status");
}
