import { protectPage } from "@/lib/auth";
export const dynamic = "force-dynamic";
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await protectPage("/admin", "admin");
  return children;
}
