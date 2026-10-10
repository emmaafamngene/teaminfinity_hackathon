import { AuthForm } from "@/components/auth-form";
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string; registered?: string }>;
}) {
  const { next, error, registered } = await searchParams;
  return (
    <AuthForm
      next={next}
      initialMessage={registered === "1" ? "Account created! Request a login code below to sign in. No code was needed for signup." : ""}
      initialError={
        error === "confirmation"
          ? "This email link expired or was opened in a different browser. Sign in if already confirmed, or request a new confirmation link below and open it in this browser."
          : ""
      }
    />
  );
}
