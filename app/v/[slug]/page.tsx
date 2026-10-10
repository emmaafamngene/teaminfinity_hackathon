import { BusinessStorefront } from "@/components/marketplace";
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return <BusinessStorefront slug={(await params).slug} />;
}
