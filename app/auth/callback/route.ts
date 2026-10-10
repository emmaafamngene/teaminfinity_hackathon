import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeReturnPath } from "@/lib/security";
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  if (code) {
    const db = await createClient();
    const { error } = await db.auth.exchangeCodeForSession(code);
    if (!error)
      return NextResponse.redirect(
        new URL(safeReturnPath(url.searchParams.get("next")), url.origin),
      );
  }
  return NextResponse.redirect(
    new URL("/login?error=confirmation", url.origin),
  );
}
