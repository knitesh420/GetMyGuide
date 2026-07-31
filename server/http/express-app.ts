import cookieParser from 'cookie-parser';
import express, { Express, NextFunction, Request, Response } from 'express';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { errorHandler } from 'node-be-utilities';

import routes from '../modules';

/**
 * Builds the Express application for the serverless runtime.
 *
 * This deliberately mirrors `server/server-config.ts` rather than importing it.
 * That file is still the entry point for the long-lived Hostinger process and
 * for the nine supertest integration suites, so it must stay exactly as it is;
 * copying the parts that apply here keeps both runtimes honest and makes the
 * differences reviewable in one place. The differences are all consequences of
 * serverless, and each is commented below.
 *
 * The app is built once per container and cached on globalThis — rebuilding the
 * router on every invocation would add real latency to every cold path.
 */

declare global {
	// eslint-disable-next-line no-var
	var __expressApp: Express | undefined;
	// eslint-disable-next-line no-var
	var __basedir: string;
}

function buildApp(): Express {
	// DIFFERENCE 1 — __basedir points at the OS temp dir, not the repo.
	//
	// server-config.ts derives this from __dirname to locate `static/`. On
	// serverless the deployment bundle is read-only and there is no persistent
	// disk, so the only writable location is the temp dir. Nothing should be
	// writing here any more (uploads go straight to Cloudinary), but the media
	// route still reads the global and would throw on undefined.
	global.__basedir = path.join(os.tmpdir(), 'getmyguide');

	// The upload staging directories MUST exist before any request arrives.
	//
	// Every multer diskStorage in the app writes to `<__basedir>/static/misc`
	// (blog and advertisement middlewares use their own subdirectories), then
	// pushes the bytes to Cloudinary and unlinks the temp file. server-config.ts
	// creates these at boot via createDir(); this app deliberately skips that
	// because the deployment bundle is read-only — but /tmp is writable, and
	// without these directories multer fails with ENOENT and every upload
	// returns a 500 "File upload failed". Verified: uploads were broken until
	// this was added.
	//
	// Still needed after Phase 3.6. Peeling location and package removed two
	// consumers, but they were the memoryStorage ones; the remaining diskStorage
	// parsers (blog, advertisement, utils/files/FileUpload, and the guide
	// middleware the adapter still uses) are exactly the ones blocked on the
	// direct-to-Cloudinary decision. This goes away when they do.
	for (const dir of ['static/misc', 'static/blogs', 'static/packages', 'static/advertisements']) {
		try {
			fs.mkdirSync(path.join(global.__basedir, dir), { recursive: true });
		} catch (err) {
			// Never let this stop the app booting: if the filesystem really is
			// read-only, uploads fail loudly per-request, which is far better than
			// the whole API failing to start.
			// eslint-disable-next-line no-console
			console.error(`Could not create upload staging directory ${dir}`, err);
		}
	}

	const app = express();

	app.disable('x-powered-by');

	// DIFFERENCE 2 — trust proxy is always on.
	//
	// server-config.ts gates this behind IS_PRODUCTION because in dev there is no
	// proxy and a client could forge X-Forwarded-For to dodge rate limits. On
	// Vercel there is always exactly one proxy hop in front of the function, in
	// every environment including preview deployments, so req.ip must come from
	// the forwarded header or the DB-backed rate limiter buckets every caller
	// together.
	app.set('trust proxy', 1);

	// Identical to server-config.ts.
	app.use((_req: Request, res: Response, next: NextFunction) => {
		res.setHeader('X-Content-Type-Options', 'nosniff');
		res.setHeader('X-Frame-Options', 'DENY');
		res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
		res.setHeader('X-DNS-Prefetch-Control', 'off');
		res.setHeader(
			'Content-Security-Policy',
			"default-src 'none'; img-src 'self' data:; media-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"
		);
		if (process.env.NODE_ENV === 'production') {
			res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
		}
		next();
	});

	app.use(cookieParser());

	// Identical to server-config.ts, including the rawBody capture that Razorpay
	// webhook signature verification depends on. Still no express.urlencoded():
	// a urlencoded body is a "simple request" that a cross-origin form can POST
	// with the victim's cookies and no preflight, which is a working CSRF against
	// every state-changing endpoint. Accepting JSON only is what keeps cookie
	// auth safe. Multipart uploads are unaffected.
	app.use(
		express.json({
			limit: '25mb',
			verify: (req: express.Request & { rawBody?: Buffer }, _res, buf) => {
				req.rawBody = buf;
			},
		})
	);

	// DIFFERENCE 3 — no CORS middleware.
	//
	// The whole point of the merge is that the browser and the API now share one
	// origin, so there is no cross-origin request to permit. Leaving the old
	// allowlist in would be dead code at best and, if CORS_ORIGINS were ever set
	// wrongly, a way to re-open cross-origin credentialed access.

	// DIFFERENCE 4 — no express.static() and no createDir().
	//
	// The bundle is read-only, so fs.mkdirSync would throw at startup. Static
	// assets are served by Next from public/ and by Cloudinary; the production
	// audit confirmed only one row (a single advertisement video) still depends
	// on server-local disk.

	app.route('/api-status').get((_req, res) => {
		res.status(200).json({ success: true });
	});

	// DIFFERENCE 5 — no createLoggerContext().
	//
	// It relies on AsyncLocalStorage bound to a long-lived process and writes to
	// a rotating file sink under logs/, which is neither writable nor durable
	// here. Vercel captures stdout/stderr per invocation instead.

	app.use((req: Request, res: Response, next: NextFunction) => {
		req.locals = { ...req.locals };
		res.locals = { ...res.locals };
		next();
	});

	app.use('/', routes);

	app.use(errorHandler);

	return app;
}

export function getExpressApp(): Express {
	if (!globalThis.__expressApp) {
		globalThis.__expressApp = buildApp();
	}
	return globalThis.__expressApp;
}

export default getExpressApp;
