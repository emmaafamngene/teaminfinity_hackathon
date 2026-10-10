import { protectPage } from "@/lib/auth";
export const dynamic = "force-dynamic";
export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await protectPage("/account");
  return children;
}
