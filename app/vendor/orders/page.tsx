import { OrdersPage } from "@/components/orders";
import { protectPage } from "@/lib/auth";
export default async function Page() {
  await protectPage("/vendor/orders", "vendor");
  return <OrdersPage vendor />;
}
