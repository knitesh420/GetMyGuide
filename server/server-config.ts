import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { Express, NextFunction, Request, Response } from 'express';
import fs from 'fs';
import routes from './modules';

import path from 'path';
import { createLoggerContext, errorHandler } from 'node-be-utilities';
import { IS_PRODUCTION, Path } from './config/const';

// Origins permitted to make credentialed cross-origin requests. Overridable via
// CORS_ORIGINS (comma-separated) so a new frontend host doesn't need a code
// change; the defaults below are what production has always used.
const allowlist = (
	process.env.CORS_ORIGINS ??
	'http://localhost:5173,http://localhost:3000,https://getmyguide.in,https://www.getmyguide.in'
)
	.split(',')
	.map((origin) => origin.trim())
	.filter(Boolean);

const corsOptionsDelegate = (req: any, callback: any) => {
	let corsOptions;
	const isDomainAllowed = allowlist.indexOf(req.header('Origin')) !== -1;

	if (isDomainAllowed) {
		// Enable CORS for this request
		corsOptions = {
			origin: true,
			credentials: true,
			exposedHeaders: ['Content-Disposition'],
			methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
			optionsSuccessStatus: 204,
		};
	} else {
		// Disable CORS for this request
		corsOptions = { origin: false };
	}
	callback(null, corsOptions);
};

export default function (app: Express) {
	//Defines all global variables and constants
	// __dirname is either:
	//   dev (ts-node):  backend/src
	//   prod (compiled): backend/build/src
	// Strip one level to get the immediate parent, then strip again if that parent
	// is 'build' (compiled mode).
	//
	// This used to pick the separator from an IS_WINDOWS flag that was never true
	// (Windows sets OS=Windows_NT, not WINDOWS), so on Windows it searched for '/'
	// in a '\'-separated path, found nothing, and slice(0, -1) lopped off a single
	// character instead of a path segment — which is where the stray `backend/s`
	// and `backend/sr` upload directories came from. path.dirname handles both
	// separators correctly on every platform.
	let basedir = path.dirname(__dirname);
	if (path.basename(basedir) === 'build') {
		basedir = path.dirname(basedir);
	}
	global.__basedir = basedir;

	// Don't advertise the framework.
	app.disable('x-powered-by');

	// Behind nginx in production: trust exactly one proxy hop so req.ip resolves
	// to the real client (the left-most X-Forwarded-For entry nginx sets) instead
	// of nginx's loopback address — otherwise every request shares one rate-limit
	// bucket. Deliberately left off in dev, where there is no proxy and a client
	// could otherwise spoof X-Forwarded-For to forge req.ip and dodge limits.
	if (IS_PRODUCTION) {
		app.set('trust proxy', 1);
	}

	// Baseline security headers (kept dependency-free; no CSP to avoid breaking
	// existing pages/embeds). HSTS is only meaningful over HTTPS, so it's gated
	// to production.
	app.use((_req: Request, res: Response, next: NextFunction) => {
		res.setHeader('X-Content-Type-Options', 'nosniff');
		res.setHeader('X-Frame-Options', 'DENY');
		res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
		res.setHeader('X-DNS-Prefetch-Control', 'off');
		// This process serves a JSON API and user-uploaded media — never HTML that
		// should run script. Locking the API's own origin down costs nothing here
		// and contains anything that manages to get reflected or stored. The
		// frontend's CSP is a separate concern and is set by Next.
		res.setHeader(
			'Content-Security-Policy',
			"default-src 'none'; img-src 'self' data:; media-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"
		);
		if (process.env.NODE_ENV === 'production') {
			res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
		}
		next();
	});

	//Initialize all the middleware
	app.use(cookieParser());
	// Body-size limits: file/media uploads go through multer (multipart), not
	// this parser, so a generous-but-bounded JSON limit is safe and removes the
	// previous 2GB DoS surface.
	//
	// NOTE: there is deliberately no express.urlencoded() here. Auth rides on
	// cookies, and a urlencoded body is a "simple request" — a cross-origin HTML
	// form can POST one with the victim's cookies attached and no CORS preflight
	// to stop it, which is a working CSRF against every state-changing endpoint.
	// JSON bodies always trigger a preflight, which the allowlist above rejects,
	// so accepting JSON only is what makes cookie auth safe here. Nothing in this
	// API consumes form-encoded bodies; multipart uploads are unaffected (multer
	// parses those itself).
	app.use(
		express.json({
			limit: '25mb',
			verify: (req: any, _res, buf) => {
				// Capture raw body for webhook signature verification
				req.rawBody = buf;
			},
		})
	);
	app.use(cors(corsOptionsDelegate));
	// path.join, not string concatenation — `__basedir + 'static'` produced
	// '/…/backendstatic', a directory that has never existed, silently disabling
	// this middleware. (Media is really served by the /media route in
	// modules/index.ts, which is why nobody noticed.)
	app.use(express.static(path.join(__basedir, 'static')));

	app.route('/api-status').get((req, res) => {
		res.status(200).json({
			success: true,
		});
	});

	// Add logging context middleware
	app.use(
		createLoggerContext(() => ({}), {
			ignoredPaths: ['/api-status'],
		}) as any
	);

	app.use((req: Request, res: Response, next: NextFunction) => {
		req.locals = {
			...req.locals,
		};
		res.locals = {
			...res.locals,
		};
		next();
	});

	app.use('/', routes);

	// NOTE: the /media/:path/:filename streaming route is defined once, inside
	// modules/index.ts (mounted above at '/'). It used to be duplicated here as
	// well, but that copy was shadowed by the router and has been removed.

	// Use node-be-utilities error handler
	app.use(errorHandler);

	createDir();
}

function createDir() {
	fs.mkdirSync(__basedir + Path.Misc, { recursive: true });
	fs.mkdirSync(__basedir + Path.Blogs, { recursive: true });
	fs.mkdirSync(__basedir + Path.Packages, { recursive: true });
	fs.mkdirSync(__basedir + '/static/advertisements', { recursive: true });
}
