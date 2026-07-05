# GetMyGuide (Tour) — Platform Documentation

A tour-guide discovery and booking platform. Tourists find and book local guides; guides register,
build a public profile, and pay a recurring membership fee to stay listed. Built as a MERN-style
stack: **Next.js (App Router)** frontend, **Express + TypeScript + Mongoose** backend, **MongoDB
Atlas**, **JWT-in-httpOnly-cookie** authentication, **Razorpay** payments, **Resend** transactional
email.

> This document describes the system as it exists today, including two generations of
> guide/tourist onboarding that currently coexist: the original **anonymous, no-account** flows
> (`register-guide`, `register-tourist`) and the newer **account-based, OTP-verified** flows
> (`/signup` → `/verify-otp` → profile onboarding). Both are explained in full below — this is not
> a design choice you need to resolve, it's the current, intentional state of the app.

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
18. [Testing](#testing)

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
| `GUIDE_PAYMENT_LINK_BASE_URL` | Legacy, unused email template reference |

Frontend (`frontend/.env`):

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_API_URL` | Backend base URL (`http://localhost:8000` in dev) |

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

### 2. The legacy, anonymous "Become a Guide" KYC-and-pay flow

`frontend/app/(website)/register-guide/page.tsx` (component `BecomeGuidePage`) is the **original**
guide onboarding, and is **still fully functional and mounted** — deliberately left running in
case of any in-flight Razorpay sessions. It predates any account/login concept:

1. Anonymous visitor fills: Name, Email, Phone, Languages, Guide Type (normal/escort), PAN
   (escort only), City, plus uploads: Licence (PDF), Aadhar (PDF), Photo.
2. `POST /guide/enroll` — validates, uploads files, creates a Razorpay order. **Does not write to
   the database yet** — the form data is base64-encoded and carried through the payment step.
3. Razorpay checkout completes → `POST /guide/confirm-payment` — verifies the signature, **only
   now** creates a `GuideEnrollment` document (`status: 'completed'`), and (this is the important
   part) **immediately creates a login-capable `Account`** with `role: 'guide'`, `status:
  'verified'`, `emailVerified: true`, and a **randomly-generated password**.

**⚠️ Known historical bug, intentionally not "fixed" in the old code path**: that
random password is never emailed to the guide (a `sendGuideCredentialsEmail` function exists but
is never called — a payment-confirmation email is sent instead, which claims credentials were
emailed but they weren't). Any guide who came through this flow **cannot know their password**.
Their only way in is the new OTP-based **Forgot Password** flow (`/forgot-password`), which is
role-agnostic and, as a side effect of a successful reset, also sets `emailVerified: true`. This is
the de facto migration path for these accounts — not a gap to close, a deliberate remediation.

This flow has **no membership concept** — it was a flat one-time ₹500 fee, and a guide who paid
through it stays permanently `status: 'verified'` with no expiry, using the *old* visibility
definition (`Account.status === 'verified'`). A one-time migration script
(`migrateGuideMembership.ts`, already run — see below) backfilled a `Guide` document for every
guide who came through this path, granting them `isVisible: true` and a **fresh 30-day membership
window starting from the day the migration ran** (a goodwill grace period, since they'd already
paid once under the old model), with `registrationCompleted: true` so they're never forced through
the new profile form as a blocking gate — the dashboard just shows a non-blocking nudge to fill in
the newer fields (price, available days/time, gallery) for a better listing.

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

### `/booking`, `/payment`, `/package`, `/blog`, `/advertisement`, `/lead`, `/user`

Unrelated to this document's focus — see their respective `*.route.ts` files. `/payment/webhook`
is the single Razorpay webhook receiver for **all** payment types (enrollment, membership,
bookings), dispatched internally by `reference_type`.

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
  register-guide            LEGACY anonymous KYC-and-pay guide application (no account)
  register-tourist          LEGACY anonymous guest tour-guide booking (no account)
  tourist/onboarding        NEW tourist profile form (post-signup, first login)
  dashboard/
    layout.tsx              auth guard (cookie-based; redirects to /signin if unauthenticated)
    user/                   tourist dashboard (hard-redirects to onboarding if incomplete)
    guide/
      page.tsx              guide dashboard — profile-completion + membership status
      profile/              guide profile form (post-signup, or ongoing edits)
      buy-subscription/     membership payment / renewal
      availability/, all-bookings/, tourguide-booking/, upcomming-tours/   (booking-related, unrelated to auth)
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

- `register-guide` and `register-tourist` pages are intentionally anonymous/account-less — see
  their sections above. Don't "fix" them to require login; that would remove functionality
  walk-up users rely on.
- `GuideEnrollment`'s auto-generated password is never emailed to the guide (confirmed bug in the
  legacy flow). Not patched — the OTP forgot-password flow is the accepted remediation path for
  any guide who came through that flow.
- `sendPaymentLinkEmail` / `PaymentLinkTemplate` and `sendGuideCredentialsEmail` /
  `GuideCredentialsTemplate` are defined but never called — remnants of an earlier, abandoned
  "admin reviews KYC, then emails a payment link" design that was never wired up.
- `POST /session/signup` (plain, non-OTP signup) still exists and works, but no frontend page
  calls it — superseded by the OTP-registration flow. Left mounted rather than deleted, in case
  anything external still depends on it.
- The frontend's `dashboard`/`subscriptions` Redux slices and several `guideThunk.ts` endpoints
  (`/guides/all-guides`, `/guides/:id/approve`, `/guides/:id/pricing-details`,
  `/guides/my-bookings`, `/guides/for-tour`, `/subscriptions/*`) call backend routes that don't
  exist — pre-existing dead code, unrelated to the auth/registration system, not in scope here.
- Forgot-password was **changed** from an emailed reset-link+token to OTP-based (confirmed correct
  by the project owner) — if you see references to a `pwreset:<token>` `Storage` key pattern in
  old notes/history, that's the retired mechanism; the current one uses `pwreset-otp:<email>`.
