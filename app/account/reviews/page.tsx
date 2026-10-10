import { AccountPage } from "@/components/account";
import { protectStudentPage } from "@/lib/auth";
export default async function AccountReviews() {
  await protectStudentPage("/account/reviews");
  return <AccountPage reviews />;
}
