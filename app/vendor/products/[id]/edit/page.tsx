import { ProductEditor } from "@/components/vendor";
import { protectVendorPage } from "@/lib/vendor-page";
export default async function EditProduct({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await protectVendorPage(`/vendor/products/${id}/edit`);
  return <ProductEditor id={id} />;
}
