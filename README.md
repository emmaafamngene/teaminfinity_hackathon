# Campus Connect

Campus Connect helps PAU students discover student-owned businesses, services and digital platforms, then contact their owners through WhatsApp.

## Features and stack

Next.js App Router, TypeScript, Tailwind CSS, Radix components and Supabase PostgreSQL/Auth/Storage provide one repository for frontend and server APIs.

- Marketplace search, categories, price/availability filters, sorting and saved favourites.
- Find My Solution: keyword matching against approved listings.
- Business storefronts and multi-image product galleries.
- Signup creates accounts without sending a code. Students, vendors and administrators log in using email codes; first login verifies the email address.
- Separate student and vendor signup paths at `/register/student` and `/register/vendor`. Vendor signup continues to business onboarding; publishing still requires approval.
- Login codes have a resend cooldown and refresh recovery. Verified vendor accounts continue to business onboarding; code login grants no publishing privileges.
- Vendor applications with private evidence, administrator review and resubmission.
- Approved vendors manage their own products and business details.
- Persistent ratings/reviews with customer editing/deletion and admin moderation.
- Buyer follow-up comment threads under reviews; authors can delete their comments. Hidden reviews also hide their comments.
- Compare up to three products by price, seller rating, availability and pickup location; share the shortlist with a public link.
- Buy again from completed order details when the listing is available.
- Protected administrator workspace for applications, businesses, users, listings, reviews and audit history.
- A public introduction page with login/signup and a separate marketplace.
- Rating-focused seller profiles at `/v/[slug]`, shareable links and WhatsApp sharing. Trust scores, verification badges and the checker are removed from the app interface.
- Pay-on-delivery/pickup orders with a Placed → Preparing → Delivered → Confirmed-by-buyer tracker and private order chat.
- Signed-in student buyers can rate approved sellers without completing a platform order. Self-reviews, duplicate reviews, vendor submissions and identity spoofing are blocked by database policies.
- Delivery orders require a campus location; pickup orders save the seller's location and use a Ready for pickup status.
- Account summary, order history, saved favourites and password settings that check the current password.

## Setup

Use Node.js 24. Install dependencies, copy `.env.example` to `.env.local` and set the two public Supabase variables plus `SUPABASE_SERVER_SECRET_KEY` for server-side registration. Never expose that secret to clients. Registration is limited to ten attempts per IP per hour through a service-only database function.

```sh
npm install
npm run dev -- --port 3001
```

Open http://localhost:3001. On Windows PowerShell with scripts disabled, use `npm.cmd`.

The workspace is configured for the authorized StudyBud project. Campus Connect uses separate `cc_` tables and private storage buckets; existing StudyBud tables remain intact. Its migrations are already applied there. For a new project, apply the SQL files in `supabase/migrations/` in timestamp order using the Supabase CLI or SQL editor.

In Supabase Authentication → URL Configuration, allow `http://localhost:3001/auth/callback`. Before deployment, set the production Site URL and allow `https://YOUR-DOMAIN/auth/callback`. Email confirmation follows the project's Auth settings.

Signup sends no email. On login, request a numeric code and enter the latest code in the same browser. Resending replaces older codes and enforces the provider cooldown. Login email delivery uses the configured Gmail SMTP provider. Keep production callback allowlists limited to your own domains.

## Gmail SMTP setup

`scripts/configure-gmail-smtp.ps1` configures the StudyBud project's SMTP fields for `emmanuelcash.x@gmail.com`, using Gmail on port 587. This sender is separate from the administrator login, `emmanuelafamngene@gmail.com`. Create a Google App Password (requires 2-Step Verification) and a Supabase personal access token, then run:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\configure-gmail-smtp.ps1
```

Both secrets use hidden terminal prompts and are kept in memory. The script saves SMTP settings through the Supabase Management API and verifies the non-secret fields; it does not send a test email. Request one confirmation email afterward to test delivery. Revoke the personal access token after setup; keep the Gmail App Password active. Syntax validation passed, but live configuration needs credentials. Supabase Auth settings apply to both Campus Connect and StudyBud because they share a project.

## First administrator

The designated account `emmanuelafamngene@gmail.com` has been registered and granted administrator access through trusted database administration. Confirm its email before signing in. Its generated password is provided privately in the development conversation and is not stored in this repository. For a new project, register the account first and grant its role through the SQL editor:

```sql
update public.cc_profiles
set role = 'admin'
where id = (
  select id from auth.users
  where lower(email) = 'emmanuelafamngene@gmail.com'
);
```

Verify exactly one row changed, then sign in and visit `/admin`. New accounts start as students; business approval grants vendor access. The admin UI cannot create administrators.

## Security

Server pages/APIs verify authenticated users and trusted database roles. Row-level security separately enforces ownership and visibility. Sensitive moderation actions use guarded database functions and write audit records. Mutations enforce same-origin requests.

Product images accept JPEG, PNG or WebP up to 5 MB; Sharp decodes, resizes and re-encodes them as WebP. Private storage uses ownership policies and expiring signed links. Verification evidence supports images or PDF; administrator evidence links expire after one minute. Use test documents for demonstrations.

The server registration handler uses `SUPABASE_SERVER_SECRET_KEY` only to create unverified accounts and enforce signup limits. All marketplace, order, review and comment requests use cookie sessions and RLS. Never commit `.env.local`, passwords or server secrets. Gemini is optional and unused; recommendations currently use keywords.

## Checks

```sh
npm run typecheck
npm test
npm run build
node tests/http-access.mjs
```

HTTP checks expect the app on port 3001. Run `supabase/tests/authorization.sql` through trusted SQL administration against the migrated database. Its role, ownership, approval, review, storage and audit fixtures run inside a transaction and roll back.

Automated checks cover authorization and image validation. Authenticated browser testing requires registered accounts; visual browser QA was unavailable in this environment.

## Demo

1. Register a vendor account and submit an application with test evidence.
2. Sign in as the administrator, inspect evidence and approve it.
3. Return as the vendor and publish a listing with images.
4. Find it through search, its category or Find My Solution.
5. Use a separate customer account to place a pay-on-delivery/pickup order. The vendor moves it through Preparing and Delivered. The buyer checks the order and confirms receipt.
6. Rate the seller as a student buyer, with or without a platform order, and view the rating on their public profile.
7. Share `/v/[slug]` in a WhatsApp group.
8. Demonstrate moderation or suspension and the resulting public visibility changes.

Listings, orders and ratings come from the database. Order chat refreshes every 15 seconds. Payment is on delivery/pickup; online payments and escrow are not implemented. Delivery timing and any delivery charge are agreed in order chat. Analytics and Gemini recommendations remain unimplemented. Catalog filtering runs on the fetched dataset; large catalogs need pagination. Order lists return the latest 100 orders. Historical verification/report records remain protected in the database but are no longer displayed in the interface.

## Deployment

Production: https://campus-connect-pi-self.vercel.app

The Vercel project is `campus-connect`, connected to the existing GitHub repository. Local CLI deployment does not push uncommitted source to GitHub.

Vercel deployment uses `vercel.json` and `.vercelignore`. Configure the two public Supabase variables and the sensitive server registration secret in both Preview and Production. Do not upload `.env.local`, SMTP passwords or management tokens. Keep Supabase's shared project settings and existing callback URLs; append the production site's `/auth/callback**` URL once its domain is known.

`app/` contains pages and APIs; `components/` contains marketplace/vendor/admin interfaces; `lib/` contains validation and database integration; `supabase/` contains migrations and policy tests; `tests/` contains application checks.

`.openai/hosting.json` belongs to an earlier unpublished Sites registration and is not used by Next.js or Vercel.
