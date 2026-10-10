import { MarketplaceBrowse } from "@/components/marketplace";
export default async function Search({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; need?: string }>;
}) {
  const { q, need } = await searchParams;
  return (
    <MarketplaceBrowse
      key={`${q}-${need}`}
      initialQuery={q}
      initialNeed={need}
    />
  );
}
