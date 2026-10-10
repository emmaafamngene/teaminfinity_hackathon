import { ComparePage } from "@/components/compare";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string }>;
}) {
  const { ids } = await searchParams;
  return <ComparePage sharedIds={ids} />;
}
