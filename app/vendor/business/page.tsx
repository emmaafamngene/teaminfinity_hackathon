import { VendorDashboard } from "@/components/vendor";
import { protectVendorPage } from "@/lib/vendor-page";
export default async function Business() {
  await protectVendorPage("/vendor/business");
  return <VendorDashboard view="business" />;
}
