# Next.js Migration — Handoff

**Read this first when picking the migration up in a new session.**

Branch: `feature/nextjs-migration` (pushed, in sync with origin)
Repo: `knitesh420/GetMyGuide`
`main`: untouched at `fe3c2b2` — production still deploys from it
Last updated: 2026-07-31

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
| Endpoints native | **92 of 178** |
| Endpoints on the Express adapter | 86 (all working) |
| Tests | **617 passing, 50 suites** |
| Typechecks | `tsc -p tsconfig.server.json` and `tsc` both clean |
| Build | `next build` succeeds, 81 native route files |

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

For a `[id]` route, call the handler directly with
`{ params: Promise.resolve({ id }) } as never` as the second argument.

## 6. Open blockers — READ BEFORE PORTING UPLOADS

### 🔴 B1. Vercel's 4.5 MB request body limit
Full write-up: `docs/migration/UPLOAD-SIZE-BLOCKER.md`

Platform limit, Hobby *and* Pro. Every upload path in the app exceeds it (guide
KYC 10 MB, `/upload-media` 25 MB, advertisement video 500 MB). Applies equally
to the adapter and to native handlers.

**Fix:** direct-to-Cloudinary signed uploads (browser gets a signature, uploads
straight to Cloudinary, posts back the URL). Touches ~6 frontend forms, so it
needs a decision — the brief asks to keep the UI identical unless necessary.

**`advertisement` (7 endpoints) is deliberately NOT ported** because of this: it
is also the only module still storing media on server-local disk, which
serverless cannot do at any size.

### 🟠 B2. Hosting / commercial use
Vercel Hobby forbids commercial use. Decision was **Hobby as staging only**;
Hostinger stays production. Upgrade to Pro before cutover.

### 🟠 B3. The notification watcher
`setInterval` cannot run serverless. Replaced by `POST /api/cron/tick`, driven
by an **external cron pinger** (decided) every 5 min, authenticated by
`CRON_SECRET`. **This must actually be configured and monitored** —
`reconcileOrphanedBookingPayments()` is what turns a captured payment into a
booking. Without it a customer can pay and receive nothing.

### 🟡 R5 — unmeasured
Invoice PDF (pdfkit + QR) and Excel export duration on Vercel. Both routes carry
`maxDuration = 60`. Needs a staging deploy to measure. **Nothing has ever run on
Vercel or in a browser** — all verification so far is Jest importing handlers
directly.

## 7. Deliberate divergences (do NOT "fix" these)

1. **Unrecognised errors return JSON, not HTML.** Express's default handler
   answers an unrecognised error (e.g. Mongoose `CastError`) with an HTML page
   carrying a stack trace and absolute server paths. The native handler returns
   the JSON error envelope with a generic message. Pinned by a test in
   `paymentNativeParity.test.ts`.

2. **`clearCookie` emits no `Max-Age`** — only `Expires` at the epoch, matching
   Express. `Max-Age` takes precedence in browsers, so adding it would be a real
   behavioural change.

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

## 9. Remaining work (86 endpoints)

| Module | Endpoints | Notes |
| --- | --- | --- |
| booking | 15 | largest remaining; money-adjacent |
| tourguide | 11 | direct booking flow |
| location | 7 | has multer (memoryStorage already) |
| trip | 7 | |
| review | 7 | |
| advertisement | 7 | **BLOCKED** — see §6 B1 |
| package | 6 | has multer (memoryStorage already) |
| user | 6 | |
| guideAvailability | 6 | |
| notification | 5 | |
| message | 5 | |
| blog | 4 | has multer (disk) |

Then: retire the adapter and drop the Express dependencies.

## 10. Environment notes

- `.env` points at the **LIVE production Atlas cluster**. There is no staging DB.
  Ask before running anything against it; a read-only audit was approved once,
  explicitly.
- `NEXT_PUBLIC_API_URL=/api` — this is what makes client calls same-origin. It
  must not be empty (that would collide with Next page routes) and must not be
  the Vercel URL.
- `pnpm lint` is unusable repo-wide (CRLF vs `endOfLine:lf`, ~29k errors).
  **`tsc` and `jest` are the real gates.**
- `mongoose` is pinned to exactly `9.1.3` — production's version. Re-resolving
  to 9.9.0 broke a suite via tightened `create()` typing. Don't bump it as a
  side effect.
- The VS Code Jest extension may still point at `backend/`, which no longer
  exists; repoint it at the root.

## 11. Verification commands

```bash
npx tsc --noEmit -p tsconfig.server.json   # server + tests
npx tsc --noEmit                            # Next app
npx jest --silent                           # 617 tests, 50 suites
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
