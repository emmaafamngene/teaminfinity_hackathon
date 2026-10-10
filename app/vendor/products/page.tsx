import { VendorDashboard } from "@/components/vendor";
import { protectVendorPage } from "@/lib/vendor-page";
export default async function Products() {
  await protectVendorPage("/vendor/products");
  return <VendorDashboard view="products" />;
}
