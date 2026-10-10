import { OrdersPage } from "@/components/orders";
import { protectStudentPage } from "@/lib/auth";
export default async function Page() {
  await protectStudentPage("/account/orders");
  return <OrdersPage />;
}
