import { MarketplaceBrowse } from "@/components/marketplace";
export default async function Marketplace({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const s = await searchParams;
  const value = (key: string) =>
    typeof s[key] === "string" ? (s[key] as string) : undefined;
  return (
    <MarketplaceBrowse
      key={JSON.stringify(s)}
      initialQuery={value("q")}
      initialCategory={value("category")}
      initialNeed={value("need")}
      initialSort={value("sort")}
      initialSaved={value("saved") === "1"}
    />
  );
}
