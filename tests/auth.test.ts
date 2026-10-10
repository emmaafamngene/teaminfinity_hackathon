import { test } from "node:test";
import assert from "node:assert/strict";
import { api, ClientApiError } from "../lib/api-client.ts";
import { verificationInput } from "../lib/auth-input.ts";

test("verification requires a numeric code and cannot accept a client role", () => {
  const input = { email: "Vendor@Example.com", token: "123456" };
  assert.equal(verificationInput.parse(input).email, "vendor@example.com");
  for (const token of ["123", "abcdef", "12345678901"])
    assert.equal(
      verificationInput.safeParse({ ...input, token }).success,
      false,
    );
  assert.equal(
    verificationInput.safeParse({ ...input, role: "vendor" }).success,
    false,
  );
});
test("expired or reused verification codes explain how to recover", () => {
  const failure = authFailure({
    code: "otp_expired",
    message: "Token has expired",
  });
  assert.equal(failure.status, 400);
  assert.match(failure.message, /latest code/);
});

test("email quota errors do not promise a one-minute reset", () => {
  const quota = authFailure({
    code: "over_email_send_rate_limit",
    message: "email rate limit exceeded",
  });
  assert.equal(quota.code, "email_delivery_quota");
  assert.equal(quota.retryAfterSeconds, 3600);
  assert.match(quota.message, /No email was sent/);
  const short = authFailure({
    code: "over_email_send_rate_limit",
    message:
      "For security purposes, you can only request this after 51 seconds.",
  });
  assert.equal(short.retryAfterSeconds, 51);
});

test("a failed email request is surfaced once without automatic retries", async (t) => {
  let calls = 0;
  t.mock.method(globalThis, "fetch", async () => {
    calls++;
    return Response.json(
      {
        error: "Email quota reached",
        code: "email_delivery_quota",
        retryAfterSeconds: 3600,
      },
      { status: 429 },
    );
  });
  await assert.rejects(
    api("/api/auth/resend", "POST", { email: "student@example.com" }),
    (error: unknown) =>
      error instanceof ClientApiError &&
      error.code === "email_delivery_quota" &&
      error.retryAfterSeconds === 3600,
  );
  assert.equal(calls, 1);
});

test("timed out auth requests stop the spinner with an actionable error", async (t) => {
  t.mock.method(globalThis, "fetch", async () => {
    throw new DOMException("Timeout", "TimeoutError");
  });
  await assert.rejects(
    api("/api/auth/resend", "POST", { email: "student@example.com" }),
    (error: unknown) =>
      error instanceof ClientApiError &&
      error.code === "request_timeout" &&
      error.retryAfterSeconds === 60,
  );
});
import {
  authFailure,
  loginInput,
  registrationInput,
  accountDestination,
} from "../lib/auth-input.ts";

test("login normalizes email but preserves the password exactly", () => {
  const result = loginInput.parse({
    email: "  Student@Example.com ",
    password: " pass ",
  });
  assert.equal(result.email, "student@example.com");
  assert.equal(result.password, " pass ");
});
test("unconfirmed email and provider rate limits are not reported as wrong passwords", () => {
  assert.equal(
    authFailure({ code: "email_not_confirmed", message: "Email not confirmed" })
      .status,
    403,
  );
  assert.match(
    authFailure({ code: "email_not_confirmed", message: "Email not confirmed" })
      .message,
    /Confirm your email/,
  );
  assert.equal(
    authFailure({ code: "over_email_send_rate_limit", message: "rate limited" })
      .status,
    429,
  );
  assert.equal(
    authFailure({ code: "invalid_credentials", message: "invalid" }).status,
    401,
  );
});
test("vendor signup is onboarding intent and cannot request administrator access", () => {
  const input = {
    email: "student@example.com",
    password: "valid-password",
    full_name: "Student Name",
    account_type: "vendor",
  };
  assert.equal(registrationInput.parse(input).account_type, "vendor");
  assert.equal(
    registrationInput.safeParse({ ...input, account_type: "admin" }).success,
    false,
  );
  assert.equal(
    registrationInput.safeParse({ ...input, role: "admin" }).success,
    false,
  );
  assert.equal(accountDestination("student", "vendor"), "/vendor/apply");
  assert.equal(accountDestination("vendor", "student"), "/vendor/dashboard");
  assert.equal(accountDestination("admin", "vendor"), "/admin");
});
