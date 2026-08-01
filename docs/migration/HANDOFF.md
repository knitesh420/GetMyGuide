# Next.js Migration — Handoff

**Read this first when picking the migration up in a new session.**

Branch: `feature/nextjs-migration` (pushed, in sync with origin)
Repo: `knitesh420/GetMyGuide`
`main`: untouched at `fe3c2b2` — production still deploys from it
Last updated: 2026-08-01 (Phase 3.10 + first real run)

---

## 1. What this migration actually is

The original brief assumed `frontend/` was a plain React app. **It was already
Next.js 16 (App Router).** So this was never a React→Next port. The real job was:

- fold the Express API into the Next.js app that already existed
- make the result run on serverless

Do not "create a Next.js project" — it exists, at the repo root.

## 2. Current state

| Metric | Value |
| --- | --- |
| Endpoints native | **167 of 178** |
| Endpoints on the Express adapter | 11 (all working, all BLOCKED on B1b) |
| Tests | **864 passing, 57 suites** |
| Typechecks | `tsc -p tsconfig.server.json` and `tsc` both clean |
| Build | `next build` succeeds, 155 native route files |
| Runtime | **Smoke-tested for real** — see §9b |

**Every unblocked module is now native.** What remains on the adapter is only
`blog` and `advertisement`, both waiting on the disk-media decision in §6 B1b.

### Repo layout (post-merge)

```
/                    ← the Next.js app (was frontend/)
  app/api/           ← native Route Handlers
    [...path]/       ← the Express adapter catch-all (shrinks as modules peel)
    cron/tick/       ← replaces the setInterval notification watcher
  server/            ← was backend/src
    http/            ← Next-native primitives (see §4)
    modules/         ← Express routes/controllers/validators + new *.schema.ts
    services/        ← 28 business-logic services, UNCHANGED and untouched
    mongo/           ← 27 models, unchanged
  tests/             ← was backend/tests
  tsconfig.json      ← the Next app (bundler, esnext)
  tsconfig.server.json ← server + tests (commonjs, node) — jest uses this
```

**Why two tsconfigs:** ts-jest merges inline options into the *nearest*
tsconfig.json, which after the merge is the Next app's — and Next's global types
declare `process.env.NODE_ENV` readonly, which broke all 41 suites on
`jest.setup.ts`. Keeping the server's compile context Next-free is the fix. Do
not merge them back.

## 3. The strategy — adapter first, then peel

`app/api/[...path]/route.ts` runs the **entire existing Express app** inside one
Route Handler. Everything not yet ported natively is served by it, unchanged
from production.

Modules are then peeled off into native handlers one at a time. Next resolves
static/specific segments ahead of the catch-all, so creating
`app/api/foo/route.ts` automatically takes precedence — **no change to the
adapter is needed when peeling.**

When the last module is peeled, delete the catch-all, `server/http/express-app.ts`,
`server/http/express-adapter.ts`, and drop express/cors/cookie-parser/multer/
supertest/node-be-utilities from package.json.

## 4. The primitives — use these, don't reinvent

All in `server/http/`:

| File | Replaces |
| --- | --- |
| `respond.ts` | `Respond()` + node-be-utilities `errorHandler` |
| `session.ts` | `VerifySession` / `VerifyMinLevel` / `VerifyRole` |
| `cookies.ts` | `res.cookie()` / `res.clearCookie()` |
| `rate-limit.ts` + `limiters.ts` | `rateLimit` middleware |
| `id.ts` | `IDValidator` |
| `idempotency.ts` | `idempotency` middleware |
| `multipart.ts` | multer (Web FormData → buffers, no temp files) |
| `documents.ts` | the KYC document streamer |
| `route.ts` | `createHandler`, `parseBody`, `parseQuery`, `readJsonBody`, `validateBody` |

Two of these have subtleties worth knowing before you reach for them:

- **`parseBodyWithFiles()`** (in `multipart.ts`) — use this, not `parseMultipart`,
  wherever the Express route had a multer parser. Those routes sit behind BOTH
  `express.json()` and multer, and whichever matched the Content-Type populated
  `req.body`. A handler that only understands multipart rejects requests the
  Express one accepts.
- **`respondJson()`** (in `respond.ts`) — writes a body verbatim, no envelope.
  Needed wherever a controller answers `{ success: false, message }` directly
  instead of going through `Respond()`, because `respond()` would append
  `success: true` and overwrite the `false` — turning a rejection into an
  apparent success. Two places need it: the whole `package` module, and
  `booking`'s three verify endpoints (`/verify-guest-booking`, `/verify-booking`,
  `/package/verify`), whose "Missing required payment details" reply is what the
  checkout page reads.

`FilePolicy.allowedMimeTypes` is optional. Omit it when the multer parser you
are replacing had no `fileFilter` (location, package) — inventing an allow-list
there rejects uploads that work today.

### The per-module recipe

1. Read `<module>.route.ts` — note the middleware chain and its ORDER.
2. Extract the zod schemas into `server/modules/<module>/<module>.schema.ts`,
   and refactor the Express validator to import them. **One source of truth —
   two copies drift, and a drifted validator surfaces as a rejected request,
   not a test failure.**
3. Write `app/api/<path>/route.ts` per endpoint using the primitives.
4. Write `tests/integration/<module>NativeParity.test.ts` (see §5).
5. Gate: `npx tsc --noEmit -p tsconfig.server.json && npx tsc --noEmit && npx jest`
6. Commit, push.

## 5. Parity testing — the safety mechanism

`tests/helpers/parity.ts` provides `expectParity(path, spec, nativeHandler)`.
It sends the **same request through both the native handler and the Express
adapter** and requires them to agree on status, body and cookie attributes.

Production code is the reference, so a passing parity test means the port is
behaviour-preserving *by construction* rather than by someone's reading of it.

**Gotcha that cost time:** do NOT use the `reseed`/`reset` hooks together with a
bearer token. Re-seeding mints a new account `_id`, invalidating the token, and
the second half fails with "Account not available" — which looks exactly like a
real parity failure. Generated ids are masked by `maskVolatile()` instead, so
most cases need neither hook.

For a `[id]` route, wrap the handler so it still takes a single `Request` and
`expectParity` can drive both sides — the Express half derives its own params
from the URL:

```ts
await expectParity(`/api/package/${id}`, { token }, (request) =>
  GET(request, { params: Promise.resolve({ id }) } as never)
);
```

Calling the handler directly with that second argument (and no `expectParity`)
is still fine when you are asserting something Express cannot be compared on —
a successful write, say, which would run twice and conflict.

## 6. Open blockers — READ BEFORE PORTING UPLOADS

### 🔴 B1. Vercel's 4.5 MB request body limit
Full write-up: `docs/migration/UPLOAD-SIZE-BLOCKER.md`

Platform limit, Hobby *and* Pro. Every upload path in the app exceeds it (guide
KYC 10 MB, `/upload-media` 25 MB, advertisement video 500 MB). Applies equally
to the adapter and to native handlers.

**Fix:** direct-to-Cloudinary signed uploads (browser gets a signature, uploads
straight to Cloudinary, posts back the URL). Touches ~6 frontend forms, so it
needs a decision — the brief asks to keep the UI identical unless necessary.

Phase 3.6 did NOT unblock this. It ported the two upload modules whose multer
parsers already used `memoryStorage` and pushed bytes to Cloudinary
(`location`, `package`); their 4.5 MB ceiling is unchanged, because the limit is
the platform's and applies to the adapter and to native handlers alike.

### 🔴 B1b. Media on server-local disk — `advertisement` AND `blog`

**Correction to the earlier note here:** advertisement is *not* the only module
storing media on server-local disk. `blog` does too, and it is worse, because it
never reaches Cloudinary at all:

- `blog.middleware.ts` uses `multer.diskStorage`, and `blog.controller.ts` stores
  the generated **filename** (`imageFilename`), not a URL.
- The frontend renders it as `${API_URL}/media/blogs/${blog.imageFilename}`,
  served by `GET /media/:path/:filename` in `server/modules/index.ts`, which
  `fs.createReadStream`s off local disk.
- On serverless the write lands in a per-invocation `/tmp` and the read is a
  different invocation, so **blog images are already lost today** through the
  adapter. Same for `POST /upload-media`.

So `blog` (4 endpoints) and `advertisement` (7) are one bucket, not two, and
neither is ported. Porting either means choosing the Cloudinary fix above and
changing `imageFilename` to a URL — a frontend change in
`app/(website)/blogs/page.tsx` and `app/(website)/blogs/[id]/page.tsx`. Porting
them *without* that would faithfully reproduce a broken feature, which is worse
than leaving them visibly unported.

### 🟠 B2. Hosting / commercial use
Vercel Hobby forbids commercial use. Decision was **Hobby as staging only**;
Hostinger stays production. Upgrade to Pro before cutover.

### 🟠 B3. The notification watcher
`setInterval` cannot run serverless. Replaced by `POST /api/cron/tick`, driven
by an **external cron pinger** (decided) every 5 min, authenticated by
`CRON_SECRET`. **This must actually be configured and monitored** —
`reconcileOrphanedBookingPayments()` is what turns a captured payment into a
booking. Without it a customer can pay and receive nothing.

### ✅ R5 — MEASURED (2026-08-01), no longer a concern
Invoice PDF ~**27 ms** warm (280 ms cold), CSV export ~**12 ms**, measured
against a built app on a throwaway in-memory Mongo. Both routes carry
`maxDuration = 60`, so the margin is ~3 orders of magnitude. Timings are local,
so Vercel will differ — but not by 60 seconds.

Note the "Excel export" is really **CSV** (`text/csv`, `invoices.csv`). There is
no xlsx generator to worry about.

## 7. Deliberate divergences (do NOT "fix" these)

1. **Unrecognised errors return JSON, not HTML.** Express's default handler
   answers an unrecognised error (e.g. Mongoose `CastError`) with an HTML page
   carrying a stack trace and absolute server paths. The native handler returns
   the JSON error envelope with a generic message. Pinned by a test in
   `paymentNativeParity.test.ts`.

   A malformed JSON body is in this family and was measured during Phase 3.8:
   both sides answer **400**, so only the format differs — Express emits the
   HTML-and-stack-trace page, the native handler a JSON body. The status code is
   unchanged, which is why this is one divergence and not two.

2. **`clearCookie` emits no `Max-Age`** — only `Expires` at the epoch, matching
   Express. `Max-Age` takes precedence in browsers, so adding it would be a real
   behavioural change.

3. **Uploads to `location` / `package` cap at 10 MB.** Their multer parsers set
   no `limits`, so Express accepted any size; `parseMultipart` applies its 10 MB
   default. Unobservable on the migration target — Vercel rejects bodies over
   4.5 MB before the function runs — and the alternative is an unbounded
   in-memory buffer in a serverless function. Left as-is deliberately.

4. **`> 10` files on `POST /package` is a 400, not a 500.** multer's
   `LIMIT_UNEXPECTED_FILE` is a `MulterError`, which the Express error handler
   does not recognise, so it produced the HTML-and-stack-trace 500 described in
   divergence 1. The native handler answers `400 Too many files for field
   images`. Same class of fix as divergence 1.

## 8. Preserved oddities (also do NOT "fix")

These are inconsistent but are the contract the frontend receives:

- `lead` reports only `issues[0].message`, no field prefix; every other module
  joins all issues as `"field: message"`.
- `payment`'s webhook validator joins bare messages with no prefix.
- `lead`'s 404/400 replies go through `Respond()`, so they carry
  `success: true` alongside the error status.
- `Respond()` **spreads** its payload onto the response root. The frontend's
  `lib/service/api.ts` `unwrap()` reverse-engineers exactly this. A "cleaner"
  envelope would not throw — it would silently resolve fields to `undefined`.
  Bare arrays must be wrapped as `{ data: [...] }`.

## 9. Remaining work (11 endpoints — all blocked)

| Module | Endpoints | Notes |
| --- | --- | --- |
| advertisement | 7 | **BLOCKED** — disk-backed media, see §6 B1b |
| blog | 4 | **BLOCKED** — disk-backed media, see §6 B1b |

**There is no unblocked work left.** The next step is not a port — it is the
B1b product decision (direct-to-Cloudinary). Until that is made, these two
modules stay on the adapter, and the adapter, `server/http/express-app.ts`,
`server/http/express-adapter.ts` and the express/cors/cookie-parser/multer/
supertest/node-be-utilities dependencies must all stay too. Porting either
module first would faithfully reproduce a feature that is already broken on
serverless.

Plus `/upload-media` and `GET /media/:path/:filename` in `server/modules/index.ts`,
which are the disk-backed pair the two blocked modules depend on.

Done so far in Phase 3: session/auth, tourist, guide, dashboard, report, lead,
assignment, payment, refund, cashPayment, earning, invoice, location, package,
notification, message, booking, trip, review, user, guideAvailability, tourguide.

### What Phase 3.8 (booking) established — read before porting tourguide

booking had four routes whose middleware ORDER changes the status code, and each
is now pinned by a case in `bookingNativeParity.test.ts`. Expect the same class
of thing in tourguide:

- `DELETE /booking/:id` checks admin **before** the id; `GET /booking/:id` has no
  role gate at all. The same tourist sending the same malformed id gets 403 from
  one and 400 from the other. That difference is contract.
- `/customised-booking` and `/package/create-order` validate **before** reserving
  the idempotency key, so a client retrying after fixing a typo isn't told its key
  was already used with a different body.
- `/:id/balance/create-order` validates the id **before** demanding the key, and
  has no role gate — ownership, not rank, decides who may settle a balance
  (`BalancePaymentService.assertOwner`). A guide is *not* refused at the door here.
- `/:id/balance/verify` checks the id **before** the payload.

Two module-local files came out of it, both worth reusing rather than re-deriving:
`server/modules/booking/booking.payload.ts` (the shared falsy-based check behind
the three verify endpoints, used by the Express controller *and* the native
handlers) and `server/modules/tourguide/tourguide.schema.ts`, which currently
holds only `paymentVerifySchema` because booking borrows it — the rest of
tourguide's validators are still inline and should move there when it is ported.

Order-creation SUCCESS paths are deliberately not parity-tested: they mint a real
Razorpay order, and a parity run executes the handler twice, so the second call
lands in the idempotency replay branch instead of the code under test. Those
paths stay covered against Express in `booking.test.ts`.

### What Phase 3.9 (trip, review, user, guideAvailability) established

These four are ordinary CRUD, so the risk moved from ordering to **which gate
sits on which route**. Several pairs are one word apart and gated differently;
all are pinned in `crudNativeParity.test.ts`:

- `/trip/my` is the GUIDE's trips, `/trip/mine` the TOURIST's.
- `/review/my` is what a tourist WROTE, `/review/mine/guide` what a guide
  RECEIVED, `/review/guide/:guideId` the PUBLIC list.
- `POST /review` and `GET /review` share a path and NOT a gate — tourist writes,
  admin reads.
- `/trip/:id/start` and `/complete` are guide-level; `/cancel` is admin-only,
  because cancelling triggers the refund path. Do not harmonise the three.
- `/guide-availability/calendar/me` is the guide's own, `/calendar/:id` admin-only.

**`user` has no zod validators and must not be given any.** Its controller reads
pagination as `parseInt(x) || default`, which means `?limit=0` and `?limit=abc`
fall back silently and `?limit=12abc` parses as 12. A schema would 400 the last
two and accept the 0. The idiom is shared with the native handlers through
`server/modules/user/user.query.ts`; three parity cases pin it.

`user` is also mounted at BOTH `/user` and `/users`, like `location`/`locations`.
The `/users` tree is six re-export files — Next reads `runtime`/`dynamic` off the
route module itself, so the segment config is redeclared per file but the
handlers are not duplicated.

### What Phase 3.10 (tourguide) established

tourguide is the direct-booking flow and did have booking's shape, plus one
split of its own. All 11 endpoints are pinned in `tourguideNativeParity.test.ts`
(57 cases). The remaining inline validators moved into `tourguide.schema.ts`
alongside `paymentVerifySchema`, and `tourguide.validator.ts` is now wrappers.

Three orderings are contract:

- `/create-order` gates role → validate → idempotency. The role gate is the
  EXACT `VerifyRole('tourist','admin')`, not min-level: a guide outranks a
  tourist, and min-level would let one guide open bookings against another.
- `/:id/create-final-order` validates the id BEFORE demanding the key, so a
  malformed id says "Invalid ID" rather than naming the missing header.
- `PATCH /:id/status` and `PATCH /:id/reassign-guide` check admin BEFORE the id;
  `GET /:id`, `/:id/cancel`, `/:id/create-final-order` and
  `/:id/verify-final-payment` have **no role gate at all**. The same non-admin
  sending the same malformed id gets 403 from the first pair and 400 from the
  rest. Three different services do the authorising instead
  (`BalancePaymentService.assertOwner`, `RefundService.assertCanRequest`,
  `TourGuideService.assertVisible`), and each admits a set a door-level role
  check would lock out.

Two more worth carrying forward:

- `GET /tourguide/:id` answers **403** for a booking that exists but is not
  yours, where `GET /booking/:id` answers **404**. booking scopes its lookup by
  owner; tourguide finds the booking first and authorises after. Both are
  pinned; do not harmonise them.
- `/:id/cancel` does NOT cancel. It opens a request an admin decides on, even
  when an admin calls it, so that every refund amount is set in one place. It
  answers 201.

`verify-and-create` requires `booking_data` (the base64 terms blob) where the
balance-payment verify does not, which is why `verifyAndCreateSchema` and
`paymentVerifySchema` are separate and must stay so.

**🐛 Found here, FIXED in the follow-up commit — the allocated guide could not
read their own direct booking.** `TourGuideService.assertVisible` meant to admit
them and didn't: `getById` runs `.populate('allocated_guide', …).lean()` before
the check, so `booking.allocated_guide` was a document by then and `.toString()`
yielded `'[object Object]'`, which never equals a user id. `linked_to` is not
populated, which is why only the guide half broke.

It **predated the migration** — both parity halves agreed on 403, so it was live
behaviour, not a port defect. That is why it was pinned first and fixed second,
in its own commit: a port whose guarantee is "nothing changed" must not also
change something.

The fix is `server/utils/refId.ts` (`refId` / `refEquals`), which reads the id
off a reference whether or not it is populated. **Reach for it instead of
`.toString()` in any guard that compares a ref**, because the guard cannot know
how its caller fetched the document — that distance is what created the bug.
An audit of the other 10 ref comparisons in `server/services/` found no second
instance: they all run on un-populated `findById` results, and `trip.ts:301`
already uses the correct `._id.toString()` for its populated `guide`. Those were
left alone rather than churned.

Note the failure mode. The guard read "admit if equal", so the slip denied
everyone; had it read "deny if equal", the same slip would have admitted
everyone, silently. Nothing errored either way.

**Next up: nothing unblocked.** The B1b decision (§6) gates everything that is
left. Once it is made: port blog + advertisement, then retire the adapter and
drop the Express dependencies.

## 9b. The first real run (2026-08-01) — READ THIS BEFORE DEPLOYING

Until this point **nothing had ever run outside Jest.** The app was built with
`next build` and started with `next start` against a *throwaway in-memory Mongo*
(never the production cluster), and driven over real HTTP with curl.

It found a **deploy blocker that 864 green tests and a clean build all missed**:

> `GET /api/invoice/:id/download` 500'd on every request.
> `ENOENT … pdfkit/js/data/Helvetica.afm`, resolved under a placeholder root.
> pdfkit reads its font metrics off disk at runtime via its own `__dirname`, and
> bundling rewrites `__dirname`. Fixed in `next.config.mjs` with
> `serverExternalPackages: ["pdfkit"]` **plus** an `outputFileTracingIncludes`
> entry — external alone fixes the path, tracing alone ships the files, and both
> are needed. Under Jest the same code reads real `node_modules` and passes,
> which is exactly why no test caught it.

**The lesson generalises: any dependency that touches the filesystem at runtime
is invisible to this test suite.** If a future module reaches for one, run the
built app before believing it works.

What was verified working end-to-end over real HTTP:

| Area | Result |
| --- | --- |
| Native routes, public + authed | 200/400/401/403 all correct, envelope intact |
| Login → cookie → authed request → refresh → logout | full round trip |
| `clearCookie` on logout | `Expires` at epoch, **no `Max-Age`** — §7 divergence 2 confirmed on the wire |
| Cookie attributes | `HttpOnly; Secure; SameSite=Lax; Path=/` |
| Role gates | tourist hitting `/tourguide/all` → 403 |
| SSR pages (`/`, `/guides`, `/blogs`, `/signin`, `/dashboard/user`) | all 200 |
| Express adapter (`/api/blog`, `/api/advertisement`) | still 200 through the catch-all |
| `POST /api/cron/tick` | 401 without `CRON_SECRET`, 200 with it |
| Invoice PDF + CSV export | see R5 above |

**How to re-run it** (never point this at production):

```bash
# 1. throwaway mongo on 47017 (mongodb-memory-server), NOT Atlas
# 2. cp .env.example .env.local, fill in fake secrets
# 3. npx next build
# 4. DATABASE_URL="mongodb://127.0.0.1:47017/smoketest" npx next start -p 3123
# 5. curl away; rm -f .env.local afterwards
```

Two gotchas that cost time and will again:

- **Jest does not read `.env.local`.** A token minted in a Jest process is
  signed with the *dev default* `JWT_ACCESS_SECRET` and the running server
  rejects it as invalid. Pass the same `JWT_ACCESS_SECRET` to both, or log in
  over HTTP instead of minting a token.
- **A fake `RESEND_API_KEY` makes `register/send-otp` 500**, so the signup flow
  cannot be walked end-to-end without a real key. Seed the account directly
  instead. The 500 is a clean JSON envelope, not an HTML stack trace, which is
  itself worth knowing.

### ⚠️ Stale production credentials on disk

`backend/.env` and `frontend/.env` survive from the pre-merge layout, and
`backend/.env` still holds a **live `mongodb+srv://` Atlas string**.

Checked: both are gitignored and untracked, so **they were never committed** —
the exposure is local-only. Next also reads env files only from the repo root,
so they are inert for this app. Nothing is leaking. But they are live production
credentials sitting in a working tree for directories that no longer exist, and
the safe move is to delete them once you are sure nothing local still needs
them. Left in place rather than deleted unilaterally.

## 10. Environment notes

- `.env` points at the **LIVE production Atlas cluster**. There is no staging DB.
  Ask before running anything against it; a read-only audit was approved once,
  explicitly.
- `NEXT_PUBLIC_API_URL=/api` — this is what makes client calls same-origin. It
  must not be empty (that would collide with Next page routes) and must not be
  the Vercel URL.
- `pnpm lint` is unusable repo-wide (CRLF vs `endOfLine:lf`, ~29k errors).
  **`tsc` and `jest` are the real gates.**
- `jest` prints "A worker process has failed to exit gracefully" on every full
  run. It is **pre-existing and not a failure** — it reproduces at the 798-test
  Phase 3.9 baseline with any newer test files excluded. Almost certainly
  mongodb-memory-server teardown. Don't chase it as if a recent change caused it.
- `mongoose` is pinned to exactly `9.1.3` — production's version. Re-resolving
  to 9.9.0 broke a suite via tightened `create()` typing. Don't bump it as a
  side effect.
- The VS Code Jest extension may still point at `backend/`, which no longer
  exists; repoint it at the root.

## 11. Verification commands

```bash
npx tsc --noEmit -p tsconfig.server.json   # server + tests
npx tsc --noEmit                            # Next app
npx jest --silent                           # 864 tests, 57 suites
cp .env.example .env.local && npx next build && rm -f .env.local
```

## 12. Rollback

Nothing here touches production. To abandon entirely:

```bash
git checkout main                  # untouched at fe3c2b2
git push origin --delete feature/nextjs-migration   # optional
```

To roll back one module: revert its commit. The adapter picks the routes back up
automatically, because it only ever served what no specific route claimed.
