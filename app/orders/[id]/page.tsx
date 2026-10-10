import { OrderDetails } from "@/components/orders";
import { protectPage } from "@/lib/auth";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await protectPage(`/orders/${id}`);
  return <OrderDetails id={id} />;
}
