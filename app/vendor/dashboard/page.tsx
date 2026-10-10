import { VendorDashboard } from "@/components/vendor";
import { protectVendorPage } from "@/lib/vendor-page";
export default async function Dashboard() {
  await protectVendorPage("/vendor/dashboard");
  return <VendorDashboard />;
}
