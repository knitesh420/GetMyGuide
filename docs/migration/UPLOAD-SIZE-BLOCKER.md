# BLOCKER — Vercel's 4.5 MB request body limit breaks every upload

**Found:** 2026-07-31, while porting the advertisement module (Phase 3.4b)
**Status:** needs a decision before Phase 3.6 (Uploads) can proceed
**Severity:** high — affects every upload path in the application

---

## The problem

Vercel Serverless Functions cap the **request body at 4.5 MB**. This is a
platform limit, not a plan tier: it applies on Hobby and on Pro, and it cannot
be raised by configuration.

Every upload limit in this codebase is above it:

| Path | Current limit | vs 4.5 MB |
| --- | --- | --- |
| `POST /advertisement` (video) | 500 MB | **111× over** |
| `POST /upload-media` | 25 MB | 5.5× over |
| `express.json()` bodies | 25 MB | 5.5× over |
| `PUT /guide/profile` (photo + 5 KYC proofs) | 10 MB each | 2.2× over |
| `PUT /guide/profile/photo` | 10 MB | 2.2× over |
| `PUT /guide/profile/documents/:type` | 10 MB | 2.2× over |
| `POST /blog` (cover image) | 10 MB | 2.2× over |

A phone photo is routinely 3–8 MB, so this is not a theoretical edge: guide KYC
uploads and blog cover images would fail in ordinary use. Advertisement video
uploads could not work at all.

## Why this is not fixed by anything already done

It is **independent of the adapter-vs-native decision**. The limit applies to
the function's incoming request, so it bites identically whether the request is
served by the Express adapter or by a native Route Handler. Nothing in Phases
1–3 makes it better or worse.

It is also not fixed by the multipart rewrite in Phase 3.3. Switching multer's
diskStorage for in-memory buffers removed the `/tmp` dependency — a real and
necessary fix — but the bytes still arrive through the function, so the cap
still applies.

**Consequence for work already merged:** the native guide upload routes
(`/guide/profile`, `/guide/profile/photo`, `/guide/profile/documents/:type`)
are correct and fully tested, but on Vercel they will reject files over 4.5 MB.
They are not wrong; the transport underneath them is inadequate.

## Why advertisement is worse than the rest

Advertisement is the only module that still stores media on **server-local
disk**: `Advertisement.videoFilename` holds a bare filename, and the file lives
at `static/advertisements/<filename>`, served by the `/media/:path/:filename`
route.

Serverless cannot do this at all, regardless of file size. Upload and playback
are separate invocations on separate containers, and `/tmp` does not persist
between them. So advertisement needs BOTH a transport fix and a storage move to
Cloudinary.

The production audit (Phase 1, B3) found exactly **one** advertisement row, so
the data migration itself is trivial. The code and frontend changes are not.

## The standard fix: direct-to-Cloudinary signed uploads

The bytes must not travel through the function at all.

1. Browser asks the API for a short-lived upload signature
   (`POST /api/upload/signature`, session-gated, returns
   `{ signature, timestamp, apiKey, cloudName, folder }`).
2. Browser uploads the file **straight to Cloudinary**, which has no 4.5 MB
   limit and handles large media natively.
3. Browser sends the resulting `secure_url` / `public_id` back to the API,
   which validates and stores it.

This is how Cloudinary is designed to be used from a serverless frontend, and it
is strictly better than the current arrangement even ignoring Vercel: uploads
stop consuming function execution time and memory, and large files stop being
buffered in RAM.

### What it costs

It changes the **frontend**, which the brief asks to keep identical unless
absolutely necessary. I consider it necessary — the feature cannot work
otherwise — but it is your call, so I have not started it.

Touched:

| Area | Change |
| --- | --- |
| `server/http/upload-signature.ts` | new — mint a scoped, expiring signature |
| `app/api/upload/signature/route.ts` | new endpoint |
| Guide profile form | upload direct, submit URLs |
| Guide photo / KYC document forms | same |
| Admin advertisement form | same, plus video |
| Blog create form | same |
| Package images form | same |
| `advertisement` model usage | `videoFilename` starts holding a Cloudinary URL |
| `FloatingVideoAd.tsx`, admin ads page | pass absolute URLs through unchanged |

The `videoFilename` field can keep its name and type — storing a URL in it needs
no schema migration, and a `startsWith('http')` check in the two frontend
consumers keeps the single legacy row working until it is moved.

Server-side validation must be re-established after the change: with the file no
longer passing through the API, MIME-type and size enforcement move to the
Cloudinary upload preset plus a check on the returned metadata. Skipping that
step would turn "signed upload" into "authenticated users can put arbitrary
files in our Cloudinary account".

## Options

1. **Implement direct-to-Cloudinary uploads.** The only option that makes
   uploads actually work on Vercel. Roughly a day of work across server and
   frontend, and it needs real-browser testing, which nothing so far has had.

2. **Keep uploads on Hostinger.** Route only the upload endpoints to the old
   backend and let everything else move to Vercel. A hybrid, but it works today
   and needs no frontend change. Reasonable as an interim step.

3. **Deploy to Vercel with uploads knowingly broken above 4.5 MB.** Acceptable
   only for a staging deploy whose purpose is measuring something else (R5).
   Not acceptable for cutover.

**Recommendation:** option 2 now so the migration keeps moving, option 1 before
cutover. That keeps the remaining 100+ endpoints progressing while the upload
rework is scoped properly, rather than blocking everything behind it.

## What I did in the meantime

- Ported `assignment` (7 endpoints) natively — unaffected, no uploads.
- Did **not** port `advertisement`. Porting it would mean writing code whose
  upload path cannot work on the target platform and whose storage model has to
  change anyway. It stays on the Express adapter, exactly as it is in production
  today, until this is decided.
