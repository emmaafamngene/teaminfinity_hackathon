import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
export function registrationAdmin() {
  const secret = process.env.SUPABASE_SERVER_SECRET_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!secret || !url)
    throw new Error(
      "Account creation is not configured. Please try again later.",
    );
  return createClient<Database>(url, secret, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
