import { notFound } from "next/navigation";
import { MarketplaceBrowse } from "@/components/marketplace";
import { categorySlugs } from "@/lib/categories";
export default async function Category({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const category = categorySlugs[slug];
  if (!category) notFound();
  return <MarketplaceBrowse key={slug} initialCategory={category} />;
}
