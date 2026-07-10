# GetMyGuide (Tour) — Platform Documentation

A tour-guide discovery and booking platform. Tourists find and book local guides; guides register,
build a public profile, and pay a recurring membership fee to stay listed. Built as a MERN-style
stack: **Next.js (App Router)** frontend, **Express + TypeScript + Mongoose** backend, **MongoDB
Atlas**, **JWT-in-httpOnly-cookie** authentication, **Razorpay** payments, **Resend** transactional
email.

> This document describes the system as it exists today. Guide onboarding is **account-first**:
> a single auth-gated form at `register-guide` handles both registration and later edits, and
> takes the first 30-day membership payment. Tourist onboarding still has two generations that
> coexist: the original **anonymous, no-account** `register-tourist` flow and the newer
> **account-based, OTP-verified** flow (`/signup` → `/verify-otp` → profile onboarding). Both are
> explained in full below — that coexistence is the current, intentional state of the app.

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Monorepo Layout](#monorepo-layout)
3. [Environment Variables](#environment-variables)
4. [Running the Project](#running-the-project)
5. [Authentication & Authorization](#authentication--authorization)
6. [Tourist Registration — In Depth](#tourist-registration--in-depth)
7. [Guide Registration — In Depth](#guide-registration--in-depth)
8. [Guide Membership Lifecycle](#guide-membership-lifecycle)
9. [Login, Logout, Forgot Password](#login-logout-forgot-password)
10. [Database Models](#database-models)
11. [API Reference](#api-reference)
12. [Frontend Route Map](#frontend-route-map)
13. [Payments (Razorpay)](#payments-razorpay)
14. [Email (Resend)](#email-resend)
15. [Migration Scripts](#migration-scripts)
16. [Known Legacy / Dead Code](#known-legacy--dead-code)
17. [Travel Operations — Assignment, Trip, Notification, Review, Reports (Phase 2)](#travel-operations--assignment-trip-notification-review-reports-phase-2)
18. [Guide Availability & Booking Conflict System (Phase 3)](#guide-availability--booking-conflict-system-phase-3)
19. [Testing](#testing)
20. [Production Readiness Hardening (July 2026)](#production-readiness-hardening-july-2026)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend framework | Next.js 16 (App Router), React, TypeScript |
| State management | Redux Toolkit (`createSlice`, `createAsyncThunk`) |
| HTTP client | Axios (`lib/service/api.ts`), cookie-based, single-flight 401→refresh→retry |
| UI components | shadcn/ui (Radix primitives) + Tailwind CSS |
| Backend framework | Express 5 + TypeScript |
| Database | MongoDB Atlas via Mongoose |
| Auth | JWT (access + refresh) in **httpOnly cookies** — never localStorage |
| Password hashing | bcrypt |
| Payments | Razorpay (orders, webhooks, refunds) |
| Email | Resend (transactional templates, plain HTML strings) |
| File uploads | Multer (disk storage) + Cloudinary (some assets) |
| Validation | Zod (backend request validators) |
| Testing | Jest + mongodb-memory-server (unit/integration) |
| Charts | Recharts, via the shadcn/ui `chart.tsx` wrapper — Phase 2 Reports & Analytics only |

---

## Monorepo Layout

```
Tour/
├── backend/          Express + TS API (path aliases: @config @mongo @services @provider @utils)
│   └── src/
│       ├── config/       env-derived constants (cookie names, TTLs, fees, Razorpay keys)
│       ├── middleware/    VerifySession (JWT+RBAC), rateLimiter, idempotency, idValidator
│       ├── modules/       one folder per feature: controller + route + validator (+ middleware)
│       ├── mongo/         repo/ (Mongoose models) + types/ (matching .d.ts interfaces)
│       ├── provider/      email (Resend) + razorpay API clients
│       ├── scripts/       one-off/migration scripts (seedAdmin, backfillEmailVerified, ...)
│       ├── services/      business logic, called by controllers
│       └── server.ts / server-config.ts
└── frontend/          Next.js App Router
    └── (routes under app/, state under lib/redux/, shared UI under components/)
```

Backend modules are **not** mounted under `/api` — every route lives at the root
(`http://localhost:8000/session/...`, `/guide/...`, `/tourist/...`, etc.). The `/guide` router is
also mounted at `/guides` (alias, same router instance) — some frontend code calls one, some the
other; both resolve identically.

---

## Environment Variables

Backend (`backend/.env`):

| Variable | Purpose |
|---|---|
| `NODE_ENV`, `PORT`, `OS` | Runtime config |
| `DATABASE_URL` | MongoDB Atlas connection string |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` (falls back to `JWT_SECRET`) | Token signing |
| `JWT_ACCESS_EXPIRE` / `JWT_REFRESH_EXPIRE` | Token lifetimes (default `1d` / `3d`) |
| `RESEND_API_KEY` | Transactional email |
| `RAZORPAY_API_KEY` / `RAZORPAY_API_SECRET` / `RAZORPAY_WEBHOOK_SECRET` | Payments |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | Media hosting |
| `COMPANY_*` (`NAME`/`ADDRESS`/`LOGO_URL`/`SUPPORT_EMAIL`/`SUPPORT_PHONE`/`WEBSITE`) | Branding shown in emails/invoices |
| `ADMIN_NAME` / `ADMIN_EMAIL` / `ADMIN_PHONE` / `ADMIN_PASSWORD` | Used only by `scripts/seedAdmin.ts` (password ≥ 12 chars) |
| `NOTIFICATION_WATCHER_INTERVAL_MS` | Phase 2 notification-watcher poll interval (default 5 min) |
| `GUIDE_PAYMENT_LINK_BASE_URL` | Legacy, unused email template reference |

Frontend (`frontend/.env`):

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_API_URL` | Backend base URL (`http://localhost:8000` in dev) |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Razorpay public key for the checkout widget |
| `NEXT_PUBLIC_SITE_URL` | Canonical site URL (metadata, sitemap, OG tags) |

Both apps ship a committed **`.env.example`** template (`backend/.env.example`, `frontend/.env.example`)
— copy it to `.env` and fill in real values. In production the backend runs `assertProductionEnv()`
(`config/const.ts`) at boot and **refuses to start** if `DATABASE_URL`, the JWT secrets, or the
Razorpay secrets are missing or still set to their insecure development defaults.

**⚠️ Production note**: as configured on this machine, `backend/.env` points at the **live
production** MongoDB Atlas cluster (`NODE_ENV=production`). There is no separate staging database.
Running the backend dev server or any script here acts on real data and can send real emails.

---

## Running the Project

```bash
# Backend
cd backend
pnpm install
pnpm dev              # nodemon + ts-node, watches src/**, http://localhost:8000

# Frontend
cd frontend
pnpm install
pnpm dev              # next dev, http://localhost:3000
```

Backend production build: `pnpm build` (tsc + tsc-alias to `build/`), then `node build/src/server.js`
— or just `pnpm start`, which does both. **Note**: `pnpm dev` (nodemon) watches `src/**/*.{ts,js}`
and hot-reloads; a process started via `pnpm start`/`node build/...` will **not** pick up source
changes without a manual rebuild + restart.

---

## Authentication & Authorization

### Core mechanism

- **JWT access + refresh tokens**, stored in **httpOnly, secure (in prod) cookies** —
  `auth-cookie` and `refresh-cookie` (`backend/src/config/const.ts`'s `Cookie` enum). Never in
  localStorage or a JS-readable cookie.
- `backend/src/services/jwt.ts` — `generateAccessToken` / `generateRefreshToken` /
  `verifyAccessToken` / `verifyRefreshToken`. Access token payload: `{ userId, role, email, name,
  tokenVersion }`.
- `backend/src/middleware/VerifySession.ts` — the single source of truth for "who is this
  request." Reads the cookie (falls back to `Authorization: Bearer` for non-browser clients),
  verifies the JWT, then **re-checks `tokenVersion` against the DB** so that logout / password
  reset instantly invalidate every previously-issued token without needing a blacklist.
  - `VerifySessionOptional` — same, but doesn't reject if there's no session (soft-auth routes).
  - `VerifyMinLevel(role)` — RBAC gate. Role hierarchy: `tourist: 1, guide: 5, admin: 10`. It's a
    **minimum-level** check (`admin` can pass a `guide`-gated route), not an exact-role check —
    routes that must be exactly one role rely on the service layer's own `role: 'x'` query filter
    as a second check.
- On the frontend, `lib/service/api.ts`'s axios client (`apiClient`, `withCredentials: true`) has a
  response interceptor that does a single-flight `POST /session/refresh` on any 401 and retries the
  original request once.

### Roles

`Account.role` is one of `tourist`, `guide`, `admin`. Set at registration and **immutable by the
user** — only an admin can change it (via direct DB/admin tooling; there is no self-service role
change endpoint).

### The `Account` model — fields relevant to auth

```
name, email (unique), phone, countryCode,
password (bcrypt-hashed, select:false),
role: 'tourist' | 'guide' | 'admin',
isActive: boolean,
status: 'non_verified' | 'verified',   // legacy field — also (still) the visibility gate for
                                        // the old anonymous guide-enroll flow; NOT reused for
                                        // email verification, see emailVerified below
emailVerified: boolean,                // true once OTP-registration or a password reset succeeds
paymentStatus: 'pending' | 'success' | 'failed' | 'na',
unavailableDates: Date[],
tokenVersion: number,                  // bumped on logout/password-reset to invalidate old tokens
```

`emailVerified` gates password login (`AuthService.login` throws `UnauthorizedError` if false).
Every pre-existing account was backfilled to `true` before this gate shipped (see
[Migration Scripts](#migration-scripts)) — new accounts only get `emailVerified: true` via:
completing OTP registration, a completed password reset, admin creation (`createAdmin`), or the
legacy guide KYC-payment flow (all four are "proven control of the email/identity" moments).

### Admin login (separate, untouched)

Admins log in via **OTP only**, at `/login` (frontend) → `POST /session/login/send-otp` →
`POST /session/login/verify-otp`. Password-only login (`POST /session/login`) explicitly rejects
`role === 'admin'`. This flow predates and is unrelated to the tourist/guide OTP-registration flow
described below — don't confuse the two "OTP" mechanisms.

---

## Tourist Registration — In Depth

There are **two, unrelated** things named "tourist registration" in this codebase. Read carefully.

### 1. The real, account-based Tourist registration (current, self-service)

This is what a tourist uses to create a real login-capable account with a saved profile.

**Frontend flow:**

1. **`/signup`** (`frontend/app/(auth)/signup/page.tsx`) — the tourist selects account type
   "Tourist" (radio button) and fills: Full Name, Email, Phone + Country Code (dropdown, defaults
   `+91`), Password, Confirm Password. Client-side validation: email format, password strength
   (≥8 chars, upper+lower+digit), phone digits-only, passwords match. On submit, the exact payload
   (including the plaintext password) is stashed in `sessionStorage` under `pendingRegistration`
   (never in a URL — needed later purely so the OTP-verify page can resend without re-asking for
   the password) and `POST /session/register/send-otp` is called.
2. **`/verify-otp?email=...`** (`frontend/app/(auth)/verify-otp/page.tsx`) — 6-digit OTP input
   (reuses the shared `InputOTP` component), auto-submits at 6 digits, 60-second resend cooldown
   timer synced with the backend's own cooldown enforcement. "Resend" re-reads the stashed
   `sessionStorage` payload and calls send-otp again (this *is* the resend mechanism — it's just
   another send-otp call, which overwrites the previous code). On success,
   `POST /session/register/verify-otp` creates the real `Account`, sets the auth cookies, and
   redirects based on role.
3. **`/tourist/onboarding`** (`frontend/app/(website)/tourist/onboarding/page.tsx`) — after first
   login, `dashboard/user/page.tsx` checks the fetched `Tourist` profile's `registrationCompleted`
   flag and **hard-redirects** here if it's `false` (a brand-new tourist always lands here first).
   The form collects:
   - **Nationality** (free text)
   - **Preferred Languages** (multi-select, sourced from the admin-managed language list)
   - **Travel Interests** (comma-separated free text — e.g. "History, Food, Adventure")
   - **Budget** (one of: Budget / Mid-range / Luxury — button-select)
   - **Travel Dates** (optional start/end date pickers — a single upcoming-trip window, not a
     recurring preference)
   - **Number of Travelers** (numeric input)
   - **About** (free-text textarea, required)

   Submitting calls `PUT /tourist/profile`, which **upserts** the `Tourist` document and sets
   `registrationCompleted: true`. There is **no payment step** for tourists — registration is
   free by design. On success, the user is redirected to `/dashboard/user`.

**Backend (`backend/src/modules/tourist/`, `backend/src/services/tourist.ts`):**

```
GET  /tourist/profile   VerifySession + VerifyMinLevel('tourist')  → merged Account + Tourist doc
PUT  /tourist/profile   VerifySession + VerifyMinLevel('tourist')  → upsert Tourist doc
```

**`Tourist` collection** (`backend/src/mongo/repo/Tourist.ts`):

```
accountId (ref Account, unique), nationality, preferredLanguages[], travelInterests[],
budget, travelDates: { startDate, endDate }, numberOfTravelers, about,
paymentStatus: 'pending'|'success'|'failed'|'na' (default 'na', present for schema
  parity only — never read for gating, since tourist registration is free),
registrationCompleted: boolean
```

**Registration OTP mechanics** (shared plumbing, also used by guide OTP registration — see below):

- `PendingRegistration` collection stores the *unverified* signup attempt: name, email, phone,
  countryCode, **bcrypt-hashed** password, accountType, **bcrypt-hashed** OTP, `otpExpiresAt`
  (10 min), `attempts` (max 5, then the pending record is deleted and a new send-otp is required),
  `lastSentAt` (enforces the 60s resend cooldown server-side, in addition to a per-email rate
  limiter), and a TTL `expireAt` (30 min — abandoned attempts self-delete, no cron needed).
- Uniqueness (email **or** phone) is checked against `AccountDB` only — a `PendingRegistration`
  never blocks a retry, since it's provisional. It's re-checked again at verify-time (race guard
  for the window between send and verify).
- On successful OTP verification: the real `Account` is created with the **already-hashed**
  password copied over from `PendingRegistration` (a `$locals.skipPasswordHash` flag on the new
  `Account` document tells `Account.ts`'s `pre('save')` hook to skip re-hashing — otherwise the
  password would be bcrypt'd twice and login would never work), `emailVerified: true`,
  `status: 'verified'`, `role` = whatever `accountType` was chosen. The `PendingRegistration` doc
  is deleted, auth cookies are set, and the response includes the new user.

### 2. The unrelated, anonymous "register-tourist" page

`frontend/app/(website)/register-tourist/page.tsx` is **not** related to any of the above despite
the URL. It's `CombinedGuideBookingForm` — a guest, no-account, pay-per-booking form: fill in trip
details → Razorpay checkout → `POST /booking/guest-booking` → `POST /booking/verify-guest-booking`.
No `Account` or `Tourist` document is ever created; it's a one-off booking with contact info
embedded directly in a `Booking` document. This page is intentionally left as-is — it serves
walk-up visitors who don't want to create an account, and coexists with the real registration flow
above. If you're looking for "why doesn't this page create a login," this is why.

---

## Guide Registration — In Depth

Same situation as tourists: **two generations** of guide onboarding coexist. The distinction
matters a lot here because the two have genuinely different monetization models.

### 1. The current, account-based Guide registration + 30-day membership

**Frontend flow (steps 1–2 identical to tourist registration, above)** — `/signup` (account type =
"Guide") → `/verify-otp` → real `Account` created with `role: 'guide'`. From here it diverges:

3. **`/dashboard/guide/profile`** (`frontend/app/(website)/dashboard/guide/profile/page.tsx`) — a
   brand-new guide is nudged here (a non-blocking banner on `/dashboard/guide`, not a hard
   redirect — see note on migration below) to fill in their public profile:
   - **Languages** (multi-select, admin-managed list)
   - **Experience** (free text, e.g. "5 years")
   - **City / State / Country** (each a separate required text field — not a multi-location list)
   - **Price per day** (₹, numeric)
   - **About / Bio** (textarea)
   - **Specialization** (comma-separated free text, e.g. "History, Adventure, Food Tours")
   - **Available Days** (multi-select: Monday–Sunday)
   - **Available Time** (free text, e.g. "9 AM – 6 PM")
   - **Profile Photo** — single image upload, **required on first submission only**
   - **Identity Proof(s)** — one or more PDF/image uploads (KYC documents), **required on first
     submission only**
   - **Gallery Images** — optional, multiple images

   Submitting sends a `multipart/form-data` `PUT /guide/profile`. On the *first* successful
   submission this creates the `Guide` document and sets `registrationCompleted: true`
   (permanently — later edits can omit the file fields to keep whatever's already on record).
   This step does **not** touch payment or visibility — a guide can have a fully complete profile
   and still be invisible to the public until they pay.

4. **`/dashboard/guide/buy-subscription`**
   (`frontend/app/(website)/dashboard/guide/buy-subscription/page.tsx`) — the membership payment
   screen. Requires `registrationCompleted: true` on the `Guide` doc (button is disabled
   otherwise, with an explanatory note). Clicking "Pay Membership Fee" (or "Renew Membership" /
   "Renew Early" if already active):
   - `POST /guide/membership/create-order` (idempotency-key protected) creates a Razorpay order.
   - Opens the Razorpay checkout widget in-browser.
   - On success, `POST /guide/membership/confirm-payment` verifies the Razorpay signature and
     finalizes the membership (see [Guide Membership Lifecycle](#guide-membership-lifecycle)
     below for the exact extension math and idempotency guarantees).

5. Once paid, the guide's `Guide` document has `isVisible: true` and an unexpired
   `membershipExpiryDate` — they now appear in the public guide listing
   (`GET /guide/all`, consumed by `find-guides`, `guides`, etc.) and in `GET /guide/:id`.

**Backend (`backend/src/modules/guide/`, `backend/src/services/guide.ts`):**

```
GET  /guide/profile                          VerifySession                  → merged Account+Guide+enrollment view
PUT  /guide/profile                          VerifySession, guide-only      → upsert Guide profile (multipart)
POST /guide/membership/create-order          VerifySession, guide-only, idempotency-protected
POST /guide/membership/confirm-payment       VerifySession, guide-only      → finalize (see below)
GET  /guide/all                              public                         → GuideDB-first query, isVisible + unexpired
GET  /guide/:id                              public                         → single guide, NOT visibility-gated (bookings/history need it regardless)
```

**`Guide` collection** (`backend/src/mongo/repo/Guide.ts`):

```
accountId (ref Account, unique),
languages[], experience, city, state, country, price, about, specialization[],
availableDays[], availableTime, profileImage, identityProofs[], galleryImages[],
registrationCompleted: boolean,
paymentStatus: 'pending' | 'success' | 'failed',
isVisible: boolean,
membershipStartDate: Date | null,
membershipExpiryDate: Date | null
```

Indexed on `{ isVisible: 1, membershipExpiryDate: 1 }` — the exact filter the public listing runs
on every request, so a membership lapsing removes the guide from search results automatically, on
the very next read, with **no cron job**.

### 2. `/register-guide` — the single, account-first guide registration form

`frontend/app/(website)/register-guide/page.tsx` (component `BecomeGuidePage`) is now the **only**
guide registration form. It is **auth-gated**: a logged-out visitor is redirected to `/signin`.

1. A logged-in guide fills: Phone, City, Guide Type (normal/escort), PAN (escort only), Languages,
   plus uploads: Photo, Licence, Aadhaar. Name and email come from the `Account` and are read-only.
2. `PUT /guide/profile` — writes those fields onto the guide's own `Guide` document and flips
   `registrationCompleted`. The profile is persisted **before** checkout opens, so a guide who
   abandons payment keeps their registration and can pay later from the dashboard.
3. The page then opens Razorpay for the **first 30-day membership** via the existing
   `POST /guide/membership/create-order` + `/membership/confirm-payment` pair. There is exactly one
   payment concept in the system: membership.

The same page doubles as the **edit** form. A guide with `registrationCompleted: true` sees it
prefilled, with the file inputs and the payment step gone, and saving issues a
`PATCH /guide/profile` limited to the four mutable fields (phone, city, type, languages).

**The old anonymous KYC-and-pay flow has been removed.** `POST /guide/enroll` and
`POST /guide/confirm-payment` are gone, along with the anonymous account-creation path (and with it
the historical bug where the auto-generated password was never emailed — `sendGuideCredentialsEmail`
was defined but never called). Guides who came through that flow can still get in via the OTP
**Forgot Password** flow (`/forgot-password`), which is role-agnostic and sets `emailVerified: true`
as a side effect of a successful reset. That remains their migration path.

`GuideEnrollment` is **retained read-only**, not dropped. `getGuideProfile` still falls back to the
enrollment's `type` for guides whose `Guide` record predates that field — deleting the model would
silently downgrade legacy escort guides to `normal`, and `isCertified` keys off it. Admins still
read these records via `GET /guide/list-all` and `GET /guide/enroll-status/:id` (both admin-only;
the latter used to be unauthenticated while the public flow polled it).

The old flow had **no membership concept** — it was a flat one-time ₹500 fee, and a guide who paid
through it stayed permanently `status: 'verified'` with no expiry, using the *old* visibility
definition (`Account.status === 'verified'`). A one-time migration script
(`migrateGuideMembership.ts`, already run — see below) backfilled a `Guide` document for every
guide who came through this path, granting them `isVisible: true` and a **fresh 30-day membership
window starting from the day the migration ran** (a goodwill grace period, since they'd already
paid once under the old model), with `registrationCompleted: true` so they're never forced through
the registration form as a blocking gate.

`GuideEnrollment` (the KYC document record from this flow) is kept as a permanent historical/audit
record — it is not deleted or repurposed by the newer `Guide` collection.

---

## Guide Membership Lifecycle

The membership payment endpoints serve **both** the very first payment and every future renewal —
there's no separate "renew" endpoint.

**Finalization math** (`GuideService.finalizeMembershipPaymentByGuideId`):

```
base = (membershipExpiryDate exists AND is in the future) ? membershipExpiryDate : now
newExpiry = base + 30 days
```

This means renewing *early* (while still active) extends from the **current expiry**, not from
"now" — a guide never loses already-paid-for days by renewing ahead of expiry. `isVisible` is set
`true` and `membershipStartDate` is set only if it was previously unset (first payment only).

**Two independent paths can trigger finalization**, and both converge safely on the same guarded
method:

1. **Synchronous**: the browser calls `POST /guide/membership/confirm-payment` right after
   Razorpay's checkout succeeds.
2. **Asynchronous**: Razorpay's webhook (`POST /payment/webhook` → `PaymentService
   .handleWebhookEvent` → `handlePaymentCaptured` → `updateRegistrationStatus`) independently
   confirms the same payment, and routes membership payments (`reference_type ===
  'guide_membership'`) to the same `finalizeMembershipPaymentByGuideId` method — this branch was
   specifically added because the *existing* webhook code only knew how to update the *old*
  `GuideEnrollment` collection; without it, a webhook-driven membership confirmation would
   silently no-op against the wrong collection.

Both paths check the `Transaction`'s status **before** finalizing — whichever one observes the
transaction still `pending` first is the only one that flips it and extends the membership; the
other sees it already finalized and just reports the current (already-updated) state. This
prevents a renewal from accidentally being applied twice (e.g. +60 days instead of +30) if both
paths fire for the same payment.

**Dashboard status** (`/dashboard/guide`): reads `GET /guide/profile`'s computed
`membershipExpired` boolean and shows either a green "Membership Active — expires on {date}" card
or a "Membership Expired — Renew Membership" card linking to `/dashboard/guide/buy-subscription`.

---

## Login, Logout, Forgot Password

**Login** — `POST /session/login` (email + password). Checks, in order: account exists → password
matches → `isActive` → not an admin (admins must use OTP login) → `emailVerified`. Returns the user
and sets both cookies.

**Logout** — `POST /session/logout` (requires session). Bumps `tokenVersion` server-side, which
instantly invalidates every access/refresh token issued before this moment (not just the current
one) — then clears both cookies.

**Forgot password** (OTP-based, not link-based):

1. `frontend/app/(auth)/forgot-password/page.tsx` — step 1: enter email →
   `POST /session/forgot-password`. Always responds identically whether or not the email exists
   (no account enumeration). If it does exist, a 6-digit OTP is generated, bcrypt-hashed, and
   stored in the generic `Storage` TTL collection under key `pwreset-otp:<email>` (10-minute
   expiry, max 5 wrong attempts before the record is deleted).
2. Step 2: enter the OTP + new password (with confirm) →
   `POST /session/reset-password` (`{ email, otp, newPassword }`). On success: password is
   updated (hashed normally by `Account`'s `pre('save')` hook), `emailVerified` is set `true`,
   `tokenVersion` is bumped (forces re-login everywhere else), the OTP record is deleted, and the
   user is logged in immediately with fresh cookies.

This is a genuine *replacement* of the original reset mechanism (which emailed a link containing a
random token). That change was intentional and confirmed — see the note in
[Known Legacy / Dead Code](#known-legacy--dead-code).

---

## Database Models

| Collection | Purpose |
|---|---|
| `Account` | Every user — tourist, guide, or admin. See [Authentication](#authentication--authorization) for fields. |
| `PendingRegistration` | Transient, OTP-gated signup-in-progress (30-min TTL). |
| `Guide` | New account-based guide profile + 30-day membership state. |
| `GuideEnrollment` | Legacy anonymous KYC submission record (permanent historical record). |
| `Tourist` | New account-based tourist travel-preference profile. |
| `Booking` | Tour-guide bookings (both guest and authenticated-tourist). |
| `Transaction` | Generic, polymorphic Razorpay payment ledger — shared by guide enrollment, guide membership, and bookings (`reference_type`/`type` distinguish the purpose). |
| `Storage` | Generic TTL key-value store — used for admin-OTP, password-reset-OTP, and rate-limiter counters. |
| `WebhookEvent` | Razorpay webhook dedup log. |
| `IdempotencyKey` | Request-replay protection for payment-adjacent POSTs. |
| `Package`, `Blog`, `Advertisement`, `ContactInquiry` | Content/marketing collections, unrelated to auth. |
| `Assignment` | Phase 2 — admin→guide proposal for a `Booking`, plus its accept/decline/reassign history. |
| `Trip` | Phase 2 — on-the-ground trip execution, created only once a guide accepts an `Assignment`. |
| `Review` | Phase 2 — tourist rating/feedback for a guide, allowed only after the `Trip` is `completed`. |
| `Notification` | Phase 2 — in-app notification inbox; idempotent via a unique `dedupeKey` index. |
| `ActivityLog` | Phase 2 — shared audit trail written by Assignment/Trip/Review actions and the notification watcher. |
| `GuideLeave` | Phase 3 — a guide's self-declared vacation/emergency leave period (date range + reason). |

---

## API Reference

All routes are mounted at the root (no `/api` prefix). `VerifySession` = must be logged in.
`VerifyMinLevel(role)` = must be logged in **and** at least that role level (tourist < guide <
admin).

### `/session` — auth

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/session/register/send-otp` | public, rate-limited | Tourist/guide OTP-gated signup, step 1 |
| POST | `/session/register/verify-otp` | public, rate-limited | Step 2 — creates Account, logs in |
| POST | `/session/login` | public, rate-limited | Password login (blocks admin) |
| POST | `/session/login/send-otp` | public, rate-limited | Admin OTP login, step 1 |
| POST | `/session/login/verify-otp` | public, rate-limited | Admin OTP login, step 2 |
| POST | `/session/forgot-password` | public, rate-limited | OTP-based reset, step 1 |
| POST | `/session/reset-password` | public, rate-limited | OTP-based reset, step 2 |
| POST | `/session/refresh` | public (needs refresh cookie) | Rotates tokens |
| GET | `/session/validate-auth` | VerifySession | "Who am I" — source of truth for client auth state |
| POST | `/session/logout` | VerifySession | Bumps tokenVersion, clears cookies |
| POST | `/session/signup` | public | **Legacy**, unlinked from any frontend page |

### `/guide` (aliased at `/guides`)

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/guide/enroll` | public | Legacy anonymous KYC submission |
| POST | `/guide/confirm-payment` | public | Legacy — creates GuideEnrollment + Account |
| GET | `/guide/profile` | VerifySession | Own profile, merged Account+Guide+legacy enrollment |
| PUT | `/guide/profile` | VerifyMinLevel('guide') | Create/update profile (multipart) |
| PUT | `/guide/availability` | VerifySession | Unavailable dates |
| POST | `/guide/membership/create-order` | VerifyMinLevel('guide'), idempotency | Membership Razorpay order |
| POST | `/guide/membership/confirm-payment` | VerifyMinLevel('guide') | Finalize membership |
| GET | `/guide/all` | public | Public listing — Guide-first, isVisible + unexpired |
| GET | `/guide/:id` | public | Single guide profile, not visibility-gated |
| GET | `/guide/me` | VerifySession | Own legacy GuideEnrollment record |
| GET | `/guide/list-all` | VerifyMinLevel('admin') | All enrollments (PII + KYC refs) |
| DELETE | `/guide/enrollment/:id` | VerifyMinLevel('admin') | Delete an enrollment |
| DELETE | `/guide/:id` | VerifyMinLevel('admin') | Deactivate a guide account |

### `/tourist`

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/tourist/profile` | VerifyMinLevel('tourist') | Own profile |
| PUT | `/tourist/profile` | VerifyMinLevel('tourist') | Create/update (free, no payment) |

### `/booking`

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/booking/key` | public | Get Razorpay public key for checkout widget |
| POST | `/booking/guest-booking` | public, rate-limited, idempotency | Guest booking creation (step 1) |
| POST | `/booking/verify-guest-booking` | public, rate-limited | Verify Razorpay payment and finalize guest booking (step 2) |
| POST | `/booking/customised-booking` | VerifyMinLevel('tourist'), idempotency | Authenticated tourist booking creation (step 1) |
| POST | `/booking/verify-booking` | VerifyMinLevel('tourist') | Verify Razorpay payment and finalize tourist booking (step 2) |
| GET | `/booking/my-bookings` | VerifyMinLevel('tourist') | Get own bookings (logged-in tourist) |
| GET | `/booking/my-reservations` | VerifyMinLevel('guide') | Get own assigned reservations (logged-in guide) |
| GET | `/booking/:id` | VerifySession | Get booking detail by ID (tourist owns booking, guide owns reservation, admin any) |
| GET | `/booking/:id/transaction-status` | VerifySession | Get transaction status for a booking |
| GET | `/booking` | VerifyMinLevel('admin') | Get all bookings (admin only) |
| POST | `/booking/:id/allocate-guide` | VerifyMinLevel('admin') | Allocate a guide to a booking |
| DELETE | `/booking/:id` | VerifyMinLevel('admin') | Delete a booking |

### `/lead`

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/lead/contact` | public | Create a contact inquiry / custom tour request |
| GET | `/lead/contact` | VerifyMinLevel('admin') | Get all contact inquiries / custom tour requests |
| GET | `/lead/contact/:id` | VerifyMinLevel('admin') | Get details of a specific contact inquiry by ID |
| PATCH | `/lead/contact/:id/status` | VerifyMinLevel('admin') | Update status, quote amount, or add admin comment for an inquiry |
| DELETE | `/lead/contact/:id` | VerifyMinLevel('admin') | Delete a contact inquiry |

### `/payment`, `/package`, `/blog`, `/advertisement`, `/user`

Unrelated to this document's focus — see their respective `*.route.ts` files. `/payment/webhook`
is the single Razorpay webhook receiver for **all** payment types (enrollment, membership,
bookings), dispatched internally by `reference_type`.

### `/assignment` — Phase 2

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/assignment` | VerifyMinLevel('admin') | Propose a guide for a booking — reuses `BookingService.allocateGuide`. Blocked by a Phase 3 availability conflict unless `{ override: true, overrideReason }` is sent (see [Phase 3](#guide-availability--booking-conflict-system-phase-3)) |
| GET | `/assignment` | VerifyMinLevel('admin') | Paginated list, filter by `status`/`guideId`/`bookingId` |
| GET | `/assignment/guides` | VerifyMinLevel('admin') | Assignable-guide picker (Account + Guide profile merged) |
| GET | `/assignment/my` | VerifyMinLevel('guide') | The calling guide's own assignments |
| GET | `/assignment/:id` | VerifyMinLevel('guide') | Admin or the assigned guide only (service-layer check) |
| PATCH | `/assignment/:id/respond` | VerifyMinLevel('guide') | `{ action: 'accept'\|'decline', declineReason? }` — accept auto-creates a `Trip` |
| POST | `/assignment/:id/reassign` | VerifyMinLevel('admin') | Swap to a new guide; blocked once the current assignment is `accepted`. Same Phase 3 override gate as create |

### `/trip` — Phase 2

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/trip` | VerifyMinLevel('admin') | Paginated list, filter by `status`/`guideId` |
| GET | `/trip/my` | VerifyMinLevel('guide') | The calling guide's own trips |
| GET | `/trip/mine` | VerifyMinLevel('tourist') | The calling tourist's own trips (via their bookings) |
| GET | `/trip/:id` | VerifyMinLevel('tourist') | Admin, the trip's guide, or the booking's tourist (service-layer check) |
| PATCH | `/trip/:id/start` | VerifyMinLevel('guide') | Owning guide only; `not-started` → `in-progress` |
| PATCH | `/trip/:id/complete` | VerifyMinLevel('guide') | Owning guide only; `in-progress` → `completed`, also flips `Booking.status` to `completed` |
| PATCH | `/trip/:id/cancel` | VerifyMinLevel('admin') | Any non-terminal status → `cancelled` |

### `/review` — Phase 2

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/review` | VerifyMinLevel('tourist') | Only on a `completed` booking they own; one review per booking |
| GET | `/review/guide/:guideId` | public | `{ reviews, average, total }` — computed live, never stored on `Guide` |
| GET | `/review/my` | VerifyMinLevel('tourist') | Own submitted reviews |
| GET | `/review/mine/guide` | VerifyMinLevel('guide') | Reviews received + rating summary |
| GET | `/review` | VerifyMinLevel('admin') | Paginated, filter by `guideId`/`minRating`/`isHidden` |
| PATCH | `/review/:id/hide` | VerifyMinLevel('admin') | Moderation — hide/unhide |
| DELETE | `/review/:id` | VerifyMinLevel('admin') | Moderation — delete |

### `/notification` — Phase 2

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/notification/my` | VerifySession | Own inbox, paginated, `unreadOnly` filter |
| GET | `/notification/my/unread-count` | VerifySession | `{ count }` |
| PATCH | `/notification/:id/read` | VerifySession | Must own the notification |
| PATCH | `/notification/read-all` | VerifySession | Marks every unread notification read |
| GET | `/notification` | VerifyMinLevel('admin') | Oversight, filter by `type`/`recipient` |

### `/report` — Phase 2 (admin only, read-only aggregation)

| Method | Path | Notes |
|---|---|---|
| GET | `/report/overview` | Revenue, active guides/tourists, pending assignments, trip counts, membership renewals, avg rating |
| GET | `/report/bookings-trend?range=7d\|30d\|90d` | Daily booking count + revenue series |
| GET | `/report/guide-performance` | Per-guide assignments/trips-completed/rating, ranked |
| GET | `/report/activity-log` | Wraps `ActivityLogService.getAll` |

### `/guide-availability` — Phase 3

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/guide-availability/leave` | VerifyMinLevel('guide') | Create a vacation/emergency leave period |
| GET | `/guide-availability/leave/my` | VerifyMinLevel('guide') | The calling guide's own leave history |
| DELETE | `/guide-availability/leave/:id` | VerifyMinLevel('guide') | Cancel a leave (flips `status` to `cancelled`; not deleted) |
| GET | `/guide-availability/calendar/me` | VerifyMinLevel('guide') | Own merged calendar: unavailable dates + active leaves + booked ranges |
| GET | `/guide-availability/guides?startDate&endDate?` | VerifyMinLevel('admin') | Assignable guides annotated `isAvailable` + conflict reasons for a date (range) |
| GET | `/guide-availability/calendar/:id` | VerifyMinLevel('admin') | Merged calendar for any guide |

---

## Frontend Route Map

```
/(auth)/
  login             admin-only OTP login (untouched, unrelated to the below)
  signup            tourist/guide account creation, step 1
  verify-otp         OTP entry, step 2
  signin             plain email+password login (tourist/guide)
  forgot-password    OTP-based password reset

/(website)/
  register-guide            Guide registration + edit (auth-gated; registers, then takes membership)
  register-tourist          LEGACY anonymous guest tour-guide booking (no account)
  tourist/onboarding        NEW tourist profile form (post-signup, first login)
  dashboard/
    layout.tsx              auth guard (cookie-based; redirects to /signin if unauthenticated)
    notifications/          Phase 2 — shared inbox page, same route for every role
    user/                   tourist dashboard (hard-redirects to onboarding if incomplete)
      trips/                Phase 2 — read-only trip timeline
      reviews/               Phase 2 — leave a review once a trip is completed
    guide/
      page.tsx              guide dashboard — profile-completion + membership status
      profile/              guide profile form (post-signup, or ongoing edits)
      buy-subscription/     membership payment / renewal
      availability/          Blocked Dates (unchanged) + Phase 3 tabs: Vacation & Emergency Leave, Working Schedule
      all-bookings/, tourguide-booking/, upcomming-tours/   (booking-related, unrelated to auth)
      assignments/           Phase 2 — accept/decline proposed bookings
      trips/, trips/[tripId]/  Phase 2 — start/complete trips
      reviews/               Phase 2 — reviews received + rating
    admin/                   Phase 2 — NEW travel-ops section (own client-side role guard, since
                             dashboard/layout.tsx has no role gating). Distinct from the legacy
                             app/(website)/admin/page.tsx monolith below, which is untouched.
      page.tsx               KPI overview + booking/revenue trend chart
      assignments/, trips/, reviews/, reports/, activity-log/
      guide-calendar/        Phase 3 — available/unavailable guides today, conflict alerts, per-guide merged calendar
  admin/                    LEGACY standalone admin dashboard (raw fetch, tab-based) — pre-dates
                            the cookie-auth migration, left running as-is; not to be confused with
                            dashboard/admin/ above
  find-guides/, guides/     public guide discovery, consumes GET /guide/all
```

---

## Payments (Razorpay)

`TransactionService` (`backend/src/services/transaction.ts`) is the shared order-creation/lookup
layer: creates a Razorpay customer + order, stores a `Transaction` document with a random
`transaction_id`, and returns the checkout options the frontend needs to open Razorpay's widget.
Every payment-producing flow (guide enrollment, guide membership, tourist bookings) uses this same
service, distinguished only by `reference_id` / `reference_type` / `type` on the `Transaction`
document. Signature verification (`verifyRazorpaySignature`, HMAC-SHA256 over
`order_id|payment_id`) happens both on the synchronous confirm endpoints and independently via the
webhook (`RAZORPAY_WEBHOOK_SECRET`-verified) — this dual-path design is intentional (see
[Guide Membership Lifecycle](#guide-membership-lifecycle)).

---

## Email (Resend)

All templates are plain functions returning an HTML string (`backend/src/provider/email/templates/`),
sent via `resend.emails.send(...)` from `backend/src/provider/email/index.ts`. No SMTP/Nodemailer
is used, by explicit choice — Resend was already wired up and working for admin-OTP and payment
confirmation emails, so the OTP-registration and OTP-password-reset emails reuse the same provider
and visual style (`AdminOtpTemplate`'s big-centered-code layout) rather than introducing a second
mail transport.

---

## Migration Scripts

Located in `backend/src/scripts/`, run via
`pnpm exec ts-node -r tsconfig-paths/register src/scripts/<name>.ts [--dry-run]`.

- **`backfillEmailVerified.ts`** — one-time, additive: sets `emailVerified: true` on every
  pre-existing `Account` that lacked the field. **Already run** against production. Must always
  run before the `emailVerified` login gate is active against any given database (Mongoose schema
  defaults don't retroactively apply to existing documents).
- **`migrateGuideMembership.ts`** — one-time: backfills a `Guide` document (with a fresh 30-day
  grace-period membership) for every pre-existing `Account{role:'guide', status:'verified',
  isActive:true}`, sourcing profile fields from their old `GuideEnrollment` record where one
  exists. **Already run** against production. Idempotent — safe to re-run (skips guides that
  already have a `Guide` doc).
- **`seedAdmin.ts`** — the *only* supported way to create an admin account (reads
  `ADMIN_NAME/EMAIL/PHONE/PASSWORD` from env). Public signup can never create an admin.

---

## Known Legacy / Dead Code

Documented here so it isn't mistaken for something broken or in-scope for future auth work:

- `register-tourist` is intentionally anonymous/account-less — see its section above. Don't "fix"
  it to require login; that would remove functionality walk-up users rely on. (`register-guide`
  **is** now auth-gated — that was a deliberate change, see its section above.)
- `GuideEnrollment` documents are retained read-only. Do not drop the model: `getGuideProfile`
  falls back to `enrollment.type` for `Guide` records written before that field existed, and
  `isCertified` keys off it, so removing it silently downgrades legacy escort guides to `normal`.
- Guides who came through the removed anonymous flow have an auto-generated password that was
  never emailed to them. The OTP forgot-password flow is the accepted remediation path.
- `sendPaymentLinkEmail` / `PaymentLinkTemplate`, `sendGuideCredentialsEmail` /
  `GuideCredentialsTemplate`, and `sendGuidePaymentConfirmationEmail` are defined but never called
  — remnants of the abandoned "admin reviews KYC, then emails a payment link" design and of the
  removed anonymous enrolment flow.
- `payment.ts`'s webhook still routes `type: 'guide' | 'enrollment'` transactions to
  `GuideEnrollmentDB`. Nothing creates those transactions any more; the branch is kept so any
  in-flight Razorpay webhook from the old flow still settles.
- `POST /session/signup` (plain, non-OTP signup) still exists and works, but no frontend page
  calls it — superseded by the OTP-registration flow. Left mounted rather than deleted, in case
  anything external still depends on it.
- Several frontend thunks call backend routes that **don't exist** — whole unimplemented domains,
  not just stray endpoints: `/tourguide/*` (direct guide-booking + final-payment flow),
  `/languages` + `/locations` (admin-managed location/language group-pricing the find-guides →
  book → checkout flow depends on), `/subscriptions/*` (subscription-plan CRUD), and
  `/guides/:id/pricing-details`, `/guides/all-guides`, `/guides/:id/approve`, `/guides/my-bookings`.
  Building these out is feature work, out of scope for a bug-fix pass. As of the July 2026 hardening
  pass, `fetchGuidesForTour` was repointed from the non-existent `/guides/for-tour` to the real
  `/guides/all` (no server-side date-range availability filtering), and `upcomming-tours` still
  renders local mock data rather than the API. See the [Production Readiness Hardening](#production-readiness-hardening-july-2026)
  section for the full list.
- Forgot-password was **changed** from an emailed reset-link+token to OTP-based (confirmed correct
  by the project owner) — if you see references to a `pwreset:<token>` `Storage` key pattern in
  old notes/history, that's the retired mechanism; the current one uses `pwreset-otp:<email>`.

---

## Travel Operations — Assignment, Trip, Notification, Review, Reports (Phase 2)

Everything above ends at "a guide is bookable and a tourist can pay for a booking." This phase adds
the **operational layer** on top: turning a paid `Booking` into a tracked trip with guide
acceptance, completion, and a review/rating loop, plus admin visibility over all of it.

```
Tourist → Booking → Admin assigns a guide → Guide accepts/declines → Trip starts → Trip completes → Review
```

**Hard constraint this phase was built under**: Auth, JWT, RBAC, OTP, Payment, Membership, Guide
Profile, Tourist Profile, Booking, and the shared Dashboard layout were **never modified** — only
five new collections were added (`Assignment`, `Trip`, `Notification`, `Review`, `ActivityLog`), and
everything else is reused strictly through its existing exported service methods (e.g.
`BookingService.allocateGuide`) or read directly, never by editing those files.

### The state machine

```
Booking.status:  payment-pending → successful/confirmed → allocated ─────────→ completed
                                          │                    ▲                    ▲
Assignment.status:                        └── admin "assign guide" ──┘                    │
                    creates Assignment(pending), calls the existing                       │
                    BookingService.allocateGuide() (unmodified)                           │
                                                                                            │
                    pending → accepted  ──→ auto-creates a Trip ───────────────────────────┤
                    pending → declined  ──→ Booking reverted directly to 'successful'      │
                                             (no existing Booking method covers this, so    │
                                             Assignment writes BookingDB directly — the      │
                                             one transition with no reuse precedent)         │
                    reassign-while-pending → new Assignment created; if the booking is       │
                                             already 'allocated', BookingDB.allocated_guide  │
                                             is updated directly (allocateGuide() would      │
                                             reject a booking already 'allocated')            │
                                                                                            │
Trip.status:        not-started → in-progress → completed ────────────────────────────────┘
                                                  (this is the first code path anywhere that
                                                   ever sets Booking.status = 'completed')
```

Reassignment is blocked once an `Assignment` reaches `accepted` (its `Trip` already exists) —
reassigning an in-flight trip is out of scope.

### Assignment (`backend/src/services/assignment.ts`)

```
Assignment { booking, guide, assignedBy, status: 'pending'|'accepted'|'declined'|'reassigned',
             adminNotes?, declineReason?, respondedAt?, previousAssignment? }
```

A partial-unique index on `{ booking }` (only for `status in [pending, accepted]`) guarantees at
the database level that a booking never has two live assignments at once. `createAssignment` calls
the existing `BookingService.allocateGuide()` — meaning it inherits that method's own guard (the
booking must already be `successful`/`confirmed`); a decline reverts the booking with a direct
write since no existing method models "un-allocate."

### Trip (`backend/src/services/trip.ts`)

```
Trip { booking (unique), assignment, guide, status: 'not-started'|'in-progress'|'completed'|'cancelled',
       startedAt?, completedAt?, startNotes?, completionNotes? }
```

`TripService.createFromAssignment()` has no HTTP route of its own — it's called internally by
`AssignmentService` the moment a guide accepts. `complete()` is the first code path in the whole
codebase to ever write `Booking.status = 'completed'`.

### Review (`backend/src/services/review.ts`)

```
Review { booking (unique), guide, tourist, rating (1-5), comment?, isHidden, moderatedBy?, moderatedAt? }
```

A review can only be created on a `completed` booking with an `allocated_guide`, and only by that
booking's tourist — one review per booking, enforced by a unique index. **A guide's average
rating/total review count is computed live via a Mongo aggregation every time it's requested — it
is never written onto the `Guide` document.** This was a deliberate choice: the `Guide` model is on
the do-not-modify list, and this phase's public-facing surface is intentionally scoped to the new
dashboard pages only (existing public guide pages don't show ratings yet).

### Notification (`backend/src/services/notification.ts` + `notificationWatcher.ts`)

```
Notification { recipient, type, title, message, relatedEntity?, dedupeKey (unique), isRead, readAt? }
```

Most notification types (`guide_assigned`, `guide_accepted`, `guide_declined`, `trip_started`,
`trip_completed`, `booking_updated`, `review_received`) are created directly by the
Assignment/Trip/Review services at the moment the underlying event happens. Two types —
`payment_successful` and `membership_expiring` — originate from events inside `services/payment.ts`
and `Guide.membershipExpiryDate`, both files this phase must not touch. Instead,
**`notificationWatcher.ts` runs a plain `setInterval` (started from `server.ts`, default every 5
minutes, no cron dependency added) that read-only polls `Transaction` and `Guide`** and creates the
corresponding notifications itself. Every notification — direct or watcher-created — goes through
`NotificationService.create()`, which relies entirely on the unique `dedupeKey` index (e.g.
`payment_successful:<transactionId>`, `membership_expiring:<guideId>:<7|3|1>`) for idempotency: a
duplicate write is silently swallowed (Mongo error 11000 → returns `null`), so re-scanning the same
data on every tick is harmless.

### Reports & Analytics (`backend/src/services/report.ts`)

No new collection — pure read-only Mongo aggregation over `Assignment`/`Trip`/`Review`/
`ActivityLog` plus the existing `Booking`/`Transaction`/`Guide`/`Tourist` collections. Powers the
new `dashboard/admin` KPI overview, the trend chart, and the "top guides" table.

### ActivityLog (`backend/src/services/activityLog.ts`)

Shared audit trail written by every service above (`action` strings like `assignment.created`,
`trip.completed`, `review.created`, `notification.payment_successful`). `ActivityLogService.log()`
is wrapped in a try/catch and **never throws** — a logging failure must never break the caller's
actual business transaction.

### Frontend surface

New Redux slice + thunk pair per domain (`assignmentSlice`, `tripSlice`, `reviewSlice`,
`notificationSlice`, `reportSlice`), all calling the existing `apiService` axios client — no new
HTTP client was introduced. New pages live under `dashboard/admin/**` (a fresh section reusing the
existing `DashboardLayout`/`Sidebar`/`Header`), `dashboard/guide/**`, and `dashboard/user/**`, plus
one shared `dashboard/notifications` page used by all three roles. `dashboard/admin/**` pages each
carry their own client-side `role !== 'admin'` guard, since the shared `dashboard/layout.tsx` only
checks *authentication*, not role — see [Frontend Route Map](#frontend-route-map).

The pre-existing `Sidebar.tsx` nav arrays gained new entries for all of the above (Assignments,
Trips, Reviews, Reports, Activity Log, Notifications) — additive only; no existing entry was
changed, including the legacy `Dashboard → /admin` link.

---

## Guide Availability & Booking Conflict System (Phase 3)

**Objective**: stop a guide from being assigned to two overlapping trips, and give admins
visibility into a guide's calendar (bookings, leave, blocked dates) before they assign one.

**Hard constraint this phase was built under**, same discipline as Phase 2: Auth, RBAC, OTP,
Payment, Membership, Guide Profile, Booking, and Trip were **not rewritten**. Exactly one existing
collection's shape changed (`ActivityLogTargetType` gained a `'GuideLeave'` member, additive), and
the only behavioral change to existing code is that `AssignmentService.createAssignment` /
`reassignGuide` now run a conflict check before assigning — everything else is new, additive
code that only *reads* from `Booking`/`Assignment`/`Trip`.

### The data-model reality that shapes this feature

`Booking.travel_details` carries a single `date` — there is no time-of-day field anywhere in
Booking or Trip. So conflict detection here is necessarily **day-level, not hour-level**: a
booking's occupied range is computed as `date` → `date + booking_configuration.outstation
.over_night_stay` nights (same single day for ordinary half/full-day bookings). `Guide.availableDays`
/ `availableTime` (the pre-existing weekly-schedule fields) are surfaced read-only in the new UI but
are not part of the conflict check — building true hour-level slot conflicts would require adding
time fields to `Booking`, which is out of scope here.

### GuideLeave (`backend/src/mongo/repo/GuideLeave.ts`)

```
GuideLeave { guide (ref Account), type: 'vacation'|'emergency', startDate, endDate,
             reason?, status: 'active'|'cancelled' }
```

A guide's existing single-day `Account.unavailableDates` (pre-existing, unchanged — still edited
from the "Blocked Dates" tab) continues to cover ad-hoc individual days. `GuideLeave` is new and
covers multi-day **periods** with a type and reason — vacation or emergency leave. Cancelling a
leave flips `status` to `cancelled` rather than deleting the row, so it stays visible in history.

### Conflict detection (`backend/src/services/guideAvailability.ts`)

`GuideAvailabilityService.checkGuideConflict(guideId, range)` checks a candidate date range against
three sources for that guide:

1. **Other active assignments** (`status in [pending, accepted]`), excluding any whose `Trip` has
   since been cancelled — `Trip.cancel()` doesn't revert the assignment's status, so the `Trip` is
   the source of truth for "does this still hold the guide's calendar."
2. **Active `GuideLeave` periods.**
3. **`Account.unavailableDates`** (the pre-existing field, read as-is).

`getGuidesAvailability(range)` runs the same check across every guide, annotating each with
`isAvailable` + a list of conflict reasons — this is what feeds the admin "Available/Unavailable
Guides" panel and the Assign-Guide modal's per-guide conflict badges.

### Admin override

`AssignmentService.createAssignment` / `reassignGuide` both call the conflict check before
assigning. If there's a conflict and the caller didn't pass `{ override: true, overrideReason }`,
the request is rejected with a `ConflictError` listing the reasons. If the admin *does* override, the
assignment proceeds and an `assignment.conflict_overridden` entry is written to the existing
`ActivityLog` (actor, conflicts, and the reason), so every forced double-booking is auditable.

### API surface

New module mounted at `/guide-availability` — see the [API Reference](#guide-availability--phase-3)
table above. Nothing was added to `/guide`, `/booking`, or `/trip`; `/assignment`'s create/reassign
bodies gained two optional fields (`override`, `overrideReason`), additive and backward-compatible
(omitting them behaves exactly as it did before this phase, as long as there's no conflict).

### Frontend surface

- The guide's existing **"My Schedule"** page (`dashboard/guide/availability`) gained tabs: the
  original Blocked Dates calendar is untouched; **Vacation & Emergency Leave** is a new date-range
  form + list (`GuideLeaveForm`, `GuideLeaveList`); **Working Schedule** is a read-only view of
  `availableDays`/`availableTime` linking to the existing Edit Profile page rather than duplicating
  that form.
- `AssignGuideModal` (used by `dashboard/admin/assignments`) now accepts an optional `availability`
  prop — when present, it flags conflicted guides in the picker and reveals an Override checkbox +
  required reason field before allowing submission through a conflict.
- New page `dashboard/admin/guide-calendar` — available/unavailable guides today, conflict alerts,
  and a per-guide merged calendar (`GuideCalendarView`, shared with the guide's own calendar
  rendering), added to the admin sidebar nav.
- New thunks/state were added to the **existing** `guideSlice`/`assignmentSlice` — no new Redux
  slices were introduced.

---

## Testing

Backend tests live in `backend/tests/`, run via Jest (`pnpm test` / `pnpm test:unit` /
`pnpm test:integration` / `pnpm test:coverage`).

```
tests/
├── unit/          one function/class at a time, external deps mocked (email, Razorpay, ...)
│   ├── services/       business-logic tests — e.g. assignment.test.ts, trip.test.ts, review.test.ts,
│   │                   notification.test.ts, activityLog.test.ts, report.test.ts (Phase 2)
│   ├── modules/        controller + validator tests, per feature folder
│   ├── middleware/, mongo/, utils/
├── integration/   full HTTP-route tests through Express (blog, booking, guide, session, package, media)
├── setup/         db.setup.ts (mongodb-memory-server connect/clear/disconnect), jest.setup.ts, mocks.ts
└── helpers/       shared fixtures (testUser/testGuide/testAdmin) and mock req/res/next builders
```

**Why an in-memory database matters here specifically**: `backend/.env` on this machine points at
the **live production** MongoDB cluster (see [Environment Variables](#environment-variables)).
`tests/setup/db.setup.ts` spins up a throwaway `mongodb-memory-server` instance for every test run
instead — this is the only way to exercise real Mongoose/service behavior without touching
production data. Never point a test at `DATABASE_URL` directly.

Phase 2 service tests (`assignment.test.ts`, `trip.test.ts`, `review.test.ts`,
`notification.test.ts`, `activityLog.test.ts`, `report.test.ts`) follow the same pattern as the
pre-existing `booking.test.ts`/`guide.test.ts`: real fixture documents created via the actual
Mongoose models, `jest.mock('@provider/email', ...)` to stub outgoing email, and assertions against
both the returned value and the resulting DB state. `notification.test.ts` specifically exercises
the `dedupeKey` idempotency guarantee (a duplicate `create()` call returns `null` and does not
insert a second row) since that's the correctness property the notification watcher depends on.

---

## Production Readiness Hardening (July 2026)

A bug-fix-and-stabilization pass focused on making the app production-ready **without** adding
features, redesigning architecture, or touching the auth/RBAC/payment/membership business logic.
Both codebases now typecheck clean (`tsc --noEmit` → 0 errors on each) and a full
`next build` succeeds with type-checking **enabled**.

### Correctness fixes

- **Booking-verification crash** — `tourGuideBookingSlice` wrote to a non-existent `state.bookings`,
  throwing in the reducer on every successful final-payment verification. Removed.
- **API response-envelope mismatch** — the backend's `Respond({ data: X })` (node-be-utilities)
  **spreads** `X` onto the top level of the body (`{ ...X, success }`), so it is **not** nested under
  `data`. Thunks that read `response.data` against these endpoints got `undefined`. Fixed the guide
  dashboard / guide-detail / membership / availability / admin-availability thunks to read the
  spread payload correctly. Bare arrays passed to `Respond({ data: arr })` are destroyed by the
  spread (numeric-keyed object) — the guide-availability list endpoints (`getMyLeaves`,
  `getGuidesAvailability`) now wrap them as `Respond({ data: { data: arr } })`. Modules that build
  their response with raw `res.json({ data: X })` (package, blog) were already correct.
- **Unguarded union access** — pages read `.title` / `.name` / `.photo` on `string | Populated…`
  unions without a populated-check (booking-success, tour-guide booking pages, guide detail); these
  could crash on unpopulated bookings and are now guarded.
- **Type errors were being shipped** — `next.config.mjs` had `typescript.ignoreBuildErrors: true`,
  masking ~45 real type errors. All fixed; the flag is now `false` so type regressions fail the
  build.

### Stability & UX

- Added the missing `public/placeholder.svg` (referenced as the image fallback across the app).
- Added `app/not-found.tsx`, `app/error.tsx`, and `app/global-error.tsx` (there were no custom
  error/404 pages).
- `dashboard/layout.tsx` now enforces a **role guard** per section (admin/guide/user) in addition to
  the existing authentication check — the backend already enforced RBAC; this stops users landing on
  a shell they can't use.

### Backend hardening

- Baseline security headers (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`,
  `X-DNS-Prefetch-Control`, plus HSTS in production), `x-powered-by` disabled, and the JSON/urlencoded
  body limit reduced from **2 GB → 25 MB** (file uploads use multer/multipart, unaffected).
- `assertProductionEnv()` fails fast at boot if production secrets are missing/insecure.
- Committed `backend/.env.example` (previously absent).
- Removed the duplicate `/media/:path/:filename` route from `server-config.ts` (it was shadowed by
  the one in `modules/index.ts`).

### Known limitations left in place (deliberately, as out-of-scope for a bug-fix pass)

- The `/tourguide/*`, `/languages`, `/locations`, `/subscriptions`, and `/guides/:id/pricing-details`
  domains have **no backend implementation** — the find-guides → book → checkout and direct
  tour-guide-booking flows depend on them. Building them out is feature work.
- `dashboard/guide/upcomming-tours` renders local mock data, not the API.
- A possible pricing double-count in `utils/priceCalculator.ts` (excursion allowance added to two
  buckets) is flagged but untouched pending product confirmation.
