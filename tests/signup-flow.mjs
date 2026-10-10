import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
process.loadEnvFile(".env.local");
const base = process.env.TEST_BASE_URL || "http://localhost:3001";
const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVER_SECRET_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
for (const kind of ["student", "vendor"]) {
  const email = `signup-test-${randomUUID()}@example.com`;
  let id,
    cookies = "";
  try {
    const response = await fetch(base + "/api/auth/register", {
      method: "POST",
      headers: { Origin: base, "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password: randomUUID() + "!Aa9",
        full_name: "Signup flow fixture",
        account_type: kind,
      }),
    });
    const body = await response.json();
    assert.equal(response.status, 200, body.error);
    assert.equal(body.confirmationRequired, false);
    assert.equal(body.redirectTo, "/login?registered=1");
    assert.equal(
      response.headers.getSetCookie().length,
      0,
      "signup must not create a login session",
    );
    const { data, error } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email,
    });
    assert.equal(error, null);
    id = data.user.id;
    const created = await admin.auth.admin.getUserById(id);
    assert.ok(
      !created.data.user.email_confirmed_at,
      "signup must leave email unverified until login",
    );
    const verify = await fetch(base + "/api/auth/verify", {
      method: "POST",
      headers: { Origin: base, "Content-Type": "application/json" },
      body: JSON.stringify({ email, token: data.properties.email_otp }),
    });
    const result = await verify.json();
    assert.equal(verify.status, 200, result.error);
    cookies = verify.headers
      .getSetCookie()
      .map((c) => c.split(";")[0])
      .join("; ");
    assert.ok(cookies, "code login sets session cookies");
    const market = await fetch(base + "/api/market", {
      headers: { Cookie: cookies },
    }).then((r) => r.json());
    assert.equal(market.user.account_kind, kind);
    const confirmed = await admin.auth.admin.getUserById(id);
    assert.ok(
      confirmed.data.user.email_confirmed_at,
      "login code verifies ownership",
    );
    console.log(
      `PASS ${kind}: signup without email code/session, first code login verifies email and routes correct account`,
    );
  } finally {
    if (cookies)
      await fetch(base + "/api/auth/logout", {
        method: "POST",
        headers: { Origin: base, Cookie: cookies },
      });
    if (id) {
      const r = await admin.auth.admin.deleteUser(id);
      assert.equal(r.error, null, "fixture cleanup");
    }
  }
}
