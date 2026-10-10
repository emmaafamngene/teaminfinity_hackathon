import { protectVendorAccount } from "@/lib/auth";
export const dynamic = "force-dynamic";
export default async function VendorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await protectVendorAccount("/vendor/application-status");
  return children;
}
