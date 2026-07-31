# Phase 2 — Structure, configuration, and the API adapter

**Branch:** `feature/nextjs-migration`
**Status:** ✅ Complete and verified
**Commits:** `c9605af`, `a9afe51`, `a36cda2`, `784a7f3`

---

## Verification (the gate — all green)

| Check | Result |
| --- | --- |
| `jest` | **522 passed / 522**, 42 suites |
| `tsc --noEmit -p tsconfig.server.json` | clean |
| `tsc --noEmit` (Next app) | clean |
| `next build` | succeeds; 70 static pages, both API routes emitted as functions |

Baseline before migration was 514 tests. The 8 additional are new adapter
contract tests. **No pre-existing test was weakened or skipped.**

---

## Files created

| File | Purpose |
| --- | --- |
| `server/mongo/connection.ts` | `globalThis`-cached mongoose connection for serverless |
| `server/http/express-adapter.ts` | Web `Request` ↔ Node `req`/`res` translation |
| `server/http/express-app.ts` | Serverless Express factory (mirrors `server-config.ts`) |
| `server/http/watcher-tick.ts` | Thin wrapper the cron route calls |
| `app/api/[...path]/route.ts` | Catch-all handler fronting the Express app |
| `app/api/cron/tick/route.ts` | Replaces the `setInterval` notification watcher |
| `tests/integration/nextApiAdapter.test.ts` | 8 adapter contract tests |
| `tsconfig.server.json` | Node/CommonJS compile context, separate from Next's |
| `vercel.json` | Region + function duration |
| `docs/migration/PHASE-1-ANALYSIS.md` | Phase 1 |

## Files moved (history preserved — `git log --follow` works)

| From | To |
| --- | --- |
| `backend/src/**` | `server/**` |
| `backend/tests/**` | `tests/**` |
| `frontend/{app,components,lib,hooks,contexts,public,service,styles,types}` | repo root |
| `frontend/{next.config.mjs,postcss.config.mjs,components.json,eslint.config.mjs}` | repo root |
| `backend/{jest.config.js,.prettierrc.json,.prettierignore,.npmrc}` | repo root |
| `backend/Readme.md`, `frontend/Readme.md` | `docs/` |

## Files modified

| File | Change |
| --- | --- |
| `package.json` | One dependency tree; `mongoose` pinned to `9.1.3` exact |
| `tsconfig.json` | Server aliases → `./server/*`; `@types/*` dropped; `tests` excluded |
| `jest.config.js` | Roots/aliases repointed; names `tsconfig.server.json` |
| `.env.example` | Unified; `NEXT_PUBLIC_API_URL=/api`; `CRON_SECRET` added |
| `.gitignore` | Merged both; restored `logs/` and `static/` |
| `server/services/notificationWatcher.ts` | `runWatcherTick()` extracted (additive) |
| `server/utils/files/FileUpload.ts` | Bare type re-export → `export type` |
| `tests/**` (16 files) | `../src/` → `../server/` |

## Files deleted

`backend/{package.json,tsconfig.json,pnpm-lock.yaml,.gitignore,.env.example,eslint.config.mjs,nodemon.json}`,
`frontend/package-lock.json`, and 16 accidentally-committed `logs/*.json`.

**Untouched on disk:** `backend/node_modules`, `backend/build`, `backend/static`.
Left deliberately — they let you run the old backend locally for side-by-side
comparison during cutover. Delete them once you are confident.

---

## Reasoning — why an adapter rather than 178 hand-ported handlers

The services layer (28 modules: pricing, payments, earnings ledger, refunds)
never imports Express. Express appears only in a thin route/controller/validator
shell. So the code that is expensive to get wrong can move without being
rewritten, and the code that must be rewritten is mechanical.

Porting all 178 endpoints in one step would mean 178 independent chances to alter
behaviour in a live payment system, and it would invalidate the 9 supertest
integration suites on day one — losing the safety net exactly when it is needed.
Mounting the existing app instead keeps every test valid, makes the whole API
deployable now, and reduces rollback to deleting one file.

---

## Bugs found and fixed during Phase 2

1. **Body parsing was silently dead.** A Web `Request` exposes no
   `content-length`, so body-parser's `typeis.hasBody()` returned false and it
   took the "skip empty body" branch without setting `req.body`. Every
   POST/PUT/PATCH would have returned 400 `"expected object, received
   undefined"` — looking exactly like a validation bug, on all ~90 mutating
   endpoints. Caught by the new contract tests; fixed by setting
   `content-length` from the buffered bytes.

2. **`mongoose` drifted 9.1.3 → 9.9.0** when the lockfile was re-resolved.
   Pinned back to what production runs; an ODM upgrade should be a deliberate,
   separately-tested change.

3. **All 41 suites failed on `NODE_ENV`.** ts-jest merges inline options into the
   *nearest* `tsconfig.json`, which after the merge was the Next app's — and Next
   declares `process.env.NODE_ENV` readonly. Fixed by splitting the configs per
   runtime, which is the correct end state anyway.

4. **`logs/` lost its ignore rule** in the gitignore merge; 16 winston audit
   files were committed and have been untracked.

---

## Risks — status

| Risk | Status |
| --- | --- |
| R1 mongoose pooling | ✅ resolved — cached promise, `maxPoolSize: 10` |
| R2 webhook raw body | ✅ preserved; contract test asserts invalid signatures are rejected, not crashed |
| R3 response shape drift | ✅ unchanged — the same `Respond()` runs |
| R4 auth cookies | ✅ same-origin is strictly safer; test asserts repeated `Set-Cookie` |
| R7 rate limiter | ✅ already DB-backed, works across instances |
| R9 `node-be-utilities` | ⏳ still used via the adapter; a Next-native error handler is needed per peeled module |
| R5 function duration | ⚠️ **unmeasured** — invoice PDF/Excel needs a staging timing run |
| R6 bundle size | ⚠️ **unmeasured** — one function currently carries the whole API |
| B3 legacy `/media/` | ⚠️ one advertisement video still on Hostinger disk |

---

## Deployment (staging — Hostinger production untouched)

`main` is unchanged at `fe3c2b2`. The old app keeps running exactly as it is.

1. Import the repo into Vercel, **branch `feature/nextjs-migration`**.
2. Set env vars from `.env.example` — critically:
   - `NEXT_PUBLIC_API_URL=/api`
   - `DATABASE_URL` — **a staging database, not production**, until you have
     verified the deployment. There is currently no staging cluster; creating one
     is strongly recommended before any write traffic reaches this build.
   - `CRON_SECRET` — long random value.
   - `NEXT_PUBLIC_MEDIA_FALLBACK_URL=https://api.getmyguide.in` so the one
     disk-backed advertisement video still resolves.
3. Point an external scheduler at `POST /api/cron/tick` every 5 minutes with
   `Authorization: Bearer $CRON_SECRET`. **Do not skip this** — it is what turns
   captured payments into bookings.
4. Smoke test: login, a booking, a Razorpay payment in test mode, an upload, an
   invoice download.

---

## Rollback

| Scope | Steps |
| --- | --- |
| Everything | `git checkout main` — production was never touched |
| Just the API adapter | Delete `app/api/[...path]/route.ts`, set `NEXT_PUBLIC_API_URL=https://api.getmyguide.in` |
| A single commit | `git revert <sha>` — each phase is independently revertible |
| The Vercel deploy | Delete the project; DNS was never changed |

---

## Phase 3 — next, one module at a time

Order: Auth → Tourist → Guide → Admin → Payments → Uploads → Notifications →
remainder. Per module: native Route Handlers, port its test suite, verify, commit.
The catch-all serves everything not yet peeled, so the app works throughout.

**Before Phase 3 starts, two things need measuring on a real deployment** —
function duration (R5) and bundle size (R6). Both are cheap to check once staging
is up and both could change how the payments and invoice modules get peeled.
