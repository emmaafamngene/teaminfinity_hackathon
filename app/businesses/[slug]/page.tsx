import { BusinessStorefront } from "@/components/marketplace";
export default async function Business({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <BusinessStorefront slug={slug} />;
}
