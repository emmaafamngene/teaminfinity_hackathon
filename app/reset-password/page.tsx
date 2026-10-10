import { AuthForm } from "@/components/auth-form";
import { protectPage } from "@/lib/auth";
export default async function ResetPassword() {
  await protectPage("/reset-password");
  return <AuthForm reset />;
}
