import { AuthForm } from "@/components/auth-form";
export default async function Register({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const params = await searchParams;
  return <AuthForm register initialType={params.type === "vendor" ? "vendor" : "student"} />;
}
