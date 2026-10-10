import { ProductDetails } from "@/components/marketplace";
export default async function Product({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ProductDetails id={id} />;
}
