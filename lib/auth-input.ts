import { z } from "zod";

export const accountType = z.enum(["student", "vendor"]);
export const emailInput = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email().max(254));
export const loginInput = z
  .object({
    email: emailInput,
    password: z.string().min(1, "Enter your password.").max(128),
  })
  .strict();
export const registrationInput = loginInput.extend({
  password: z
    .string()
    .min(8, "Use at least 8 characters for your password.")
    .max(128),
  full_name: z.string().trim().min(2, "Enter your full name.").max(80),
  account_type: accountType.default("student"),
});
export const verificationInput = z
  .object({
    email: emailInput,
    token: z
      .string()
      .trim()
      .regex(
        /^\d{6,10}$/,
        "Enter the numeric verification code from your email.",
      ),
  })
  .strict();

export function authFailure(error: {
  code?: string;
  message: string;
  status?: number;
}): {
  status: number;
  code: string;
  message: string;
  retryAfterSeconds?: number;
} {
  switch (error.code) {
    case "otp_expired":
      return {
        status: 400,
        code: error.code,
        message:
          "This code is invalid, expired or already used. Enter the latest code or request a new one.",
      };
    case "email_not_confirmed":
      return {
        status: 403,
        code: error.code,
        message:
          "Confirm your email before signing in. Use Resend confirmation email below if you need a new link.",
      };
    case "invalid_credentials":
      return {
        status: 401,
        code: error.code,
        message:
          "The email or password does not match. Check your details or reset your password.",
      };
    case "user_already_exists":
    case "email_exists":
      return {
        status: 409,
        code: "account_exists",
        message:
          "An account already exists with this email. Sign in or reset your password.",
      };
    case "over_email_send_rate_limit": {
      const seconds = error.message.match(/after\s+(\d+)\s+seconds?/i)?.[1];
      return seconds
        ? {
            status: 429,
            code: error.code,
            retryAfterSeconds: Number(seconds),
            message: `An email was requested recently. Wait ${seconds} seconds before requesting another link.`,
          }
        : {
            status: 429,
            code: "email_delivery_quota",
            retryAfterSeconds: 3600,
            message:
              "The project's email sending quota has been reached. No email was sent. Repeated requests will not fix this; try after the hourly quota resets or ask the team to configure an email provider.",
          };
    }
    case "over_request_rate_limit":
      return {
        status: 429,
        code: error.code,
        retryAfterSeconds: 60,
        message: "Too many attempts. Please wait a minute before trying again.",
      };
    case "email_address_not_authorized":
    case "email_address_invalid":
      return {
        status: 400,
        code: error.code,
        message:
          "The email provider could not send to this address. Check the address; the project may need a configured SMTP provider.",
      };
    default:
      return {
        status: error.status && error.status >= 500 ? 503 : 400,
        code: error.code || "auth_failed",
        message:
          error.message || "Authentication is unavailable. Please try again.",
      };
  }
}

// Signup intent controls onboarding only. Publishing permissions come from cc_profiles and business approval.
export function accountDestination(role: string, intent: unknown) {
  if (role === "admin") return "/admin";
  if (role === "vendor") return "/vendor/dashboard";
  return intent === "vendor" ? "/vendor/apply" : "/account";
}
