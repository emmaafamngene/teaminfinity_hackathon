import { ProductEditor } from "@/components/vendor";
import { protectVendorPage } from "@/lib/vendor-page";
export default async function NewProduct() {
  await protectVendorPage("/vendor/products/new");
  return <ProductEditor />;
}
