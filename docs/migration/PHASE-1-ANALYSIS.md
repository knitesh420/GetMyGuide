# Phase 1 — Codebase Analysis & Migration Plan

**Branch:** `feature/nextjs-migration`
**Base commit:** `fe3c2b2` (main)
**Date:** 2026-07-30
**Status:** Analysis complete. Awaiting decisions on 3 blockers before Phase 2 writes code.

---

## 0. Headline finding — the brief's premise is out of date

The brief describes `frontend/` as "React + TypeScript". It is not.

**`frontend/` is already a Next.js 16.1.3 App Router application** — 80+ route
directories under `app/`, route groups (`(auth)`, `(website)`), `next.config.mjs`,
server components, `generateMetadata` SEO, Tailwind 4, Redux Toolkit.

This changes the migration completely, and in your favour:

| The brief assumed | Reality |
| --- | --- |
| Build a new Next.js project | Already exists — do not recreate |
| Port React Router → App Router | Nothing to port |
| Rebuild all UI | Zero UI changes needed |
| Re-do SEO | Already implemented in `lib/seo/` |

**The actual job is narrower:** fold the Express API into the Next.js app that
already exists, and make the result run on serverless.

The single-repo "merge" is therefore mostly a *deletion* of the network hop
between two apps that already share a domain model.

---

## 1. Inventory

### 1.1 Backend (`backend/`)

| Metric | Value |
| --- | --- |
| TypeScript source files | 217 |
| HTTP endpoints | **178** across 24 route modules |
| Mongoose models | 27 (`src/mongo/repo/`) |
| Service-layer modules | 28 (`src/services/`) |
| Jest tests | 41 files / ~514 tests (9 are Express integration tests via supertest) |
| Runtime | Express 5.2, Node, CommonJS, `tsc` + `tsc-alias` build |

Endpoint distribution — this is the migration's unit of work:

```
 32  guide            11  session          7  advertisement    5  invoice
 15  booking          11  tourguide        7  assignment       5  lead
                                           7  earning          5  message
                       7  location         7  refund           5  notification
                       7  trip             7  review           4  blog
                       6  cashPayment      6  guideAvailability 4  report
                       6  package          6  user             4  tourist
                                                                1  dashboard
```

### 1.2 Architecture (consistent, and that is what makes this tractable)

Every module follows the same shape:

```
modules/<name>/
  <name>.route.ts       Express router + rate limiters + middleware chain
  <name>.controller.ts  reads req.locals.{user,data} → calls service → Respond()
  <name>.validator.ts   zod schema → handleValidation() → req.locals.data
  <name>.middleware.ts  (7 modules only) multer multipart parsing
```

Business logic lives in `src/services/` and is **almost entirely
framework-agnostic** — it takes plain arguments and returns plain data. Express
appears only in the route/controller/validator/middleware shell.

**This is the key structural fact of the whole migration:** the part that is hard
to get right (business logic, 28 services, pricing, payments, ledger) does not
touch Express. The part that touches Express is thin and mechanical.

### 1.3 Frontend → backend coupling

The frontend talks to the API through **absolute URLs** built from
`NEXT_PUBLIC_API_URL` (default `http://localhost:8000`), in ~29 files, funnelled
through `lib/service/api.ts` (axios, `withCredentials: true`, single-flight 401
refresh) plus a handful of direct `fetch()` calls.

**Consequence:** setting `NEXT_PUBLIC_API_URL=""` makes every one of those calls
same-origin and relative. If the Next.js app serves the same paths, the frontend
needs *no code change at all*. That is the migration's cheapest, highest-leverage
lever.

Note `lib/service/api.ts:125` `unwrap()` — it compensates for the backend's
`Respond()` spreading its payload onto the response root. **Response shape must be
preserved byte-for-byte** or this unwrapping breaks in ways that fail silently
(fields resolve to `undefined` rather than throwing).

---

## 2. Recommended strategy — adapter first, then peel

### 2.1 Why not the obvious approach

The brief says "Convert Express APIs into Next.js Route Handlers", i.e. hand-port
178 endpoints. I recommend against doing that as the *first* step:

- 178 independent chances to alter behaviour in a payment system handling real money.
- It invalidates the 9 supertest integration suites on day one, so you lose your
  safety net exactly when you need it.
- Nothing is deployable until a large fraction is done — that violates
  "incremental and reversible".

### 2.2 What I recommend instead

**Phase 2 — mount the existing Express app inside Next.js.**

One catch-all Route Handler, `app/api/[...path]/route.ts`, adapts Web `Request` →
Node `IncomingMessage`, hands it to the existing Express app, and adapts the
response back.

- Business logic, middleware, auth, validation, routing: **unchanged**, still the
  code that has been running in production.
- All 514 tests keep passing, unmodified.
- The entire API is deployable on Vercel in one reviewable step.
- Rollback = delete one file.

**Phase 3 — peel modules off natively, one at a time, in your stated order.**

Each module gets real Route Handlers; the catch-all keeps serving everything not
yet peeled. Auth → Tourist → Guide → Admin → Payments → Uploads → Notifications →
remainder. After each: full test suite + manual verification. Never proceed on red.

This gives you a working, deployable Vercel app at the end of **Phase 2**, and
each Phase 3 module is independently revertible.

### 2.3 Honest caveat on the adapter

Running Express inside a serverless function is a well-worn pattern, but it is a
*compatibility shim*, not the destination:

- Slightly higher cold start (Express + its middleware stack per cold invocation).
- Streaming responses need care (invoice PDF/Excel download routes — 5 endpoints).
- It is explicitly a stepping stone. If Phase 3 stalls, you are left running
  Express-on-Vercel, which works but forfeits Next.js's per-route optimisation.

I judge the risk reduction worth it. If you would rather go straight to native
handlers module-by-module and accept a longer window before anything is
deployable, say so and I will re-plan Phase 2 accordingly.

---

## 3. BLOCKERS — decisions needed before Phase 2

### 🔴 B1. Vercel Hobby (free tier) forbids commercial use

Vercel's Hobby plan is licensed for non-commercial use. GetMyGuide is a
commercial platform taking live Razorpay payments, with paid guide memberships
and a payout ledger. Deploying it to Hobby is a terms-of-service violation, and
enforcement means the deployment is disabled — on the production booking flow.

There is no technical workaround. Options:

1. **Vercel Pro — $20/month.** Removes this, and also relaxes B2. Recommended.
2. **Hobby for a non-production staging deploy only**, real production stays on
   Hostinger. Legitimate, and a good way to validate the migration.
3. **Different host** — Railway / Render / Fly.io run the Next.js app *and* a
   persistent process (which also solves B2 outright).

**This is a business decision, not a technical one. I need your call.**

### 🔴 B2. `startNotificationWatcher` cannot run on serverless

`src/services/notificationWatcher.ts` is a `setInterval` loop, every 5 minutes,
started by `server.ts`. It is not cosmetic — per tick it:

| Function | What breaks without it |
| --- | --- |
| `reconcileOrphanedBookingPayments()` | **Captured payments never become bookings.** Customer pays, gets nothing. |
| `promoteMaturedEarnings()` | Guide earnings never become payable; payout queue stays empty. |
| `scanPaymentSuccesses()` | No payment-success notifications. |
| `scanMembershipExpiring()` | No renewal reminders (7/3/1-day). |
| `remindOutstandingBalances()` | Unpaid balances never chased. |

Serverless has no persistent process. Vercel Cron on **Hobby is capped at once
per day** — a captured-but-unfulfilled payment could sit broken for 24 hours.
That is not acceptable for the first item in that table.

Options:

1. **External cron pinger** (cron-job.org, GitHub Actions) hitting a secret-protected
   `POST /api/cron/tick` every 5 min. Free, keeps current cadence. **Recommended.**
2. **Vercel Cron on Pro** — every-minute schedules allowed.
3. **Leave the watcher on Hostinger** during migration — hybrid, but two things
   write to one DB; the tick is already idempotent so this is safe.

Whichever you choose, the tick endpoint must be idempotent (it already is — dedupe
is enforced by the `dedupeKey` unique index) and authenticated by a shared secret.

### 🟠 B3. Local-disk media — needs a production DB audit

Serverless filesystems are ephemeral and read-only outside `/tmp`. Affected:

- `express.static('static/')` and `GET /media/:path/:filename` (`modules/index.ts:96`)
- multer `diskStorage` in 7 upload middlewares
- `createDir()` in `server-config.ts:161`

Good news: `backend/static/` is **8 KB** — effectively empty. Everything real
already lives on Cloudinary, and uploads are already disk-temp → Cloudinary →
`fs.unlink` (`utils/cloudinaryUpload.ts:55`). So the disk path is vestigial.

**But** older DB rows may still hold `/media/...` paths — `lib/data.ts:329`
explicitly documents "NOT a Cloudinary URL, prefix with `NEXT_PUBLIC_API_URL`",
and `next.config.mjs:19` whitelists `api.getmyguide.in` as an image host. If any
live blog/advertisement row still points at `/media/...`, those images 404 after
cutover.

**Required before cutover — a read-only count against production:**

```
Blog.countDocuments({ image: /^\/media\// })
Advertisement.countDocuments({ url: /^\/media\// })
Package.countDocuments({ images: /^\/media\// })
```

Per your standing instruction, I will ask before running anything against the
production database — including this read. It is read-only, but I am not
assuming.

If the counts are non-zero: back-fill those rows to Cloudinary first (there is
already a script, `src/scripts/uploadPublicImages.ts`), or keep Hostinger serving
`/media/*` until they are migrated.

---

## 4. Risk register (non-blocking, handled in-plan)

| # | Risk | Impact | Mitigation |
| --- | --- | --- | --- |
| R1 | **Mongoose connection exhaustion.** Each cold serverless invocation opens a new pool; Atlas caps connections. `mongo/index.ts:30` has no caching. | API 500s under load | `globalThis`-cached connection promise + `maxPoolSize: 10`. Standard, well-understood. |
| R2 | **Razorpay webhook signature.** Needs the *raw* body; `server-config.ts:113` captures it via `express.json({ verify })`. | Webhooks rejected → payments unfulfilled | Native handler reads `await req.text()` before any parse. Verify against a real webhook in staging before cutover. |
| R3 | **Response shape drift.** `Respond()` spreads payload to root; frontend `unwrap()` depends on that exact behaviour. | Silent `undefined` fields | Keep `utils/respond.ts` semantics byte-for-byte. Contract-test a sample of endpoints old vs new. |
| R4 | **Auth cookies.** `COOKIE_SAMESITE=lax`, host-only on `api.getmyguide.in`. Same-origin merge changes cookie scope. | Session loss / lockout | Same-origin is *strictly better* (lax now genuinely works). Per prior incident: **never gate Next middleware on the session cookie.** Auth code otherwise untouched. |
| R5 | **Function duration.** Invoice PDF (pdfkit + QR + Cloudinary) and Excel export. Hobby caps at 60s; cold start adds to it. | Timeouts on invoice download | Measure in staging. If tight, move generation to a background job or pre-generate on booking. |
| R6 | **Bundle size.** pdfkit, exceljs, cloudinary, razorpay, mongoose in one function; 250 MB uncompressed cap. | Deploy failure | Native per-route handlers naturally split this. Adapter phase bundles everything into one — measure early. |
| R7 | **Rate limiter is DB-backed** (`middleware/rateLimiter.ts`), not in-memory. | None — this is *good* | Works across serverless instances as-is. No change needed. |
| R8 | **Test suite is Express-coupled** (9 supertest suites). | Coverage loss as modules go native | Adapter keeps them green. Per peeled module, port its suite to call the Route Handler directly. Never peel a module before its replacement suite is green. |
| R9 | **`node-be-utilities`** provides `Respond`, error classes, `errorHandler`, `createLoggerContext` — Express-coupled, third-party. | Blocks native peeling | Error *classes* are portable. Need a small Next-native `errorHandler` equivalent mapping those classes → `NextResponse`. ~40 lines, written once in Phase 2. |
| R10 | **`global.__basedir`** set in `server-config.ts:56` from `__dirname`. | Undefined in Next bundle | Disappears with the disk paths (B3). Guard during the adapter phase. |
| R11 | **Path aliases differ.** Backend `@services/*`, `@mongo`; frontend `@/*`. | Import resolution failure | Merge both alias sets into the unified `tsconfig.json`. Mechanical. |
| R12 | **Dual `zod` majors** — backend v4.3.5, frontend v3.25.67. Breaking API differences. | Type/runtime errors on merge | Upgrade frontend to v4 (its usage is form schemas via `@hookform/resolvers`, low surface), **or** keep backend on its own alias. Decide in Phase 2; recommend upgrading frontend and running its typecheck. |
| R13 | **CommonJS vs ESM.** Backend `module: commonjs`, `target: es2016`; Next is ESM/bundler. | Build errors | Next's bundler handles CJS deps. Backend *source* moves to the shared modern tsconfig — mostly transparent, `import`/`export` syntax is already used throughout. |

---

## 5. Dependency reconciliation

**Merge cleanly** (no conflict): mongoose, cloudinary, razorpay, resend,
jsonwebtoken, bcrypt, pdfkit, qrcode, exceljs, moment, axios.

**Conflict / needs a decision:**

| Package | Backend | Frontend | Action |
| --- | --- | --- | --- |
| `zod` | ^4.3.5 | 3.25.67 | R12 — recommend unify on v4 |
| `axios` | ^1.13.2 | ^1.12.2 | Take ^1.13.2 |
| `typescript` | ^5.9.3 | ^5 | Take ^5.9.3 |
| `@types/node` | ^25.0.8 | ^22 | Take ^22 (Next 16 / Vercel Node runtime) |

**Drop after Phase 3** (Express shell only): `express`, `cors`, `cookie-parser`,
`multer`, `multer-storage-cloudinary`, `nodemon`, `tsc-alias`, `tsconfig-paths`,
`mv`, `fs-extra`, `supertest`, `node-be-utilities`.

**Keep through Phase 2** — all of the above are needed while the adapter runs.

---

## 6. Target structure (end state)

```
/                          ← single Next.js app at repo root
  app/
    (auth)/ (website)/     ← unchanged, exactly as today
    api/
      [...path]/route.ts   ← Phase 2 adapter; shrinks as modules peel, deleted at the end
      session/…            ← Phase 3.1
      tourist/…            ← Phase 3.2
      guide/…              ← Phase 3.3
      payment/…            ← Phase 3.5
      cron/tick/route.ts   ← B2 replacement for the watcher
  components/ lib/ public/ ← unchanged
  server/                  ← ex-backend/src, minus the Express shell
    mongo/                 ← 27 models, unchanged
    services/              ← 28 services, unchanged  ★ the valuable part
    config/ utils/ provider/
    http/                  ← new: Next-native auth guard, error handler, validation
  tests/                   ← ex-backend/tests, kept green throughout
  next.config.mjs  tsconfig.json  package.json  vercel.json
```

`backend/` and `frontend/` directories are removed via `git mv`, so history is
preserved per-file (`git log --follow`).

---

## 7. Phase 1 output (as requested)

**Files created**
- `docs/migration/PHASE-1-ANALYSIS.md` (this document)

**Files modified** — none
**Files deleted** — none

**Commands executed**
```bash
git checkout -b feature/nextjs-migration   # done; main untouched at fe3c2b2
```

**Reasoning** — Phase 1 is analysis only. No source file has been touched, so
there is nothing to break and nothing to roll back beyond deleting a branch.

**Risks introduced** — none.

**Rollback**
```bash
git checkout main
git branch -D feature/nextjs-migration
```

---

## 8. Decisions I need from you before Phase 2

1. **B1 — hosting.** Vercel Pro, or Hobby-as-staging-only with Hostinger staying
   production? (I recommend Hobby-as-staging until cutover, then Pro.)
2. **B2 — watcher replacement.** External cron pinger, Vercel Cron on Pro, or
   leave it running on Hostinger during migration?
3. **B3 — permission to run the three read-only `countDocuments` queries against
   production** to size the `/media/` back-fill.
4. **Strategy — do you accept the adapter-first approach (§2.2)**, or do you want
   direct native module-by-module porting despite the longer non-deployable window?

Everything in Phases 2 and 3 is planned and ready to execute. I have not written
migration code, because all four answers change what that code should be.
