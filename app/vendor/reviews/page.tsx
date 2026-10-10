import { VendorDashboard } from "@/components/vendor";
import { protectVendorPage } from "@/lib/vendor-page";
export default async function Reviews() {
  await protectVendorPage("/vendor/reviews");
  return <VendorDashboard view="reviews" />;
}
