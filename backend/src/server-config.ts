import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { Express, NextFunction, Request, Response } from 'express';
import fs from 'fs';
import routes from './modules';

import { createLoggerContext, errorHandler } from 'node-be-utilities';
import { IS_PRODUCTION, IS_WINDOWS, Path } from './config/const';

const allowlist = [
	'http://localhost:5173',
	'http://localhost:3000',
	'https://getmyguide.in',
	'https://www.getmyguide.in',
];

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
	const sep = IS_WINDOWS ? '\\' : '/';
	let basedir = __dirname.slice(0, __dirname.lastIndexOf(sep));
	if (basedir.endsWith('build') || basedir.endsWith('build/') || basedir.endsWith('build\\')) {
		basedir = basedir.slice(0, basedir.lastIndexOf(sep));
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
		if (process.env.NODE_ENV === 'production') {
			res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
		}
		next();
	});

	//Initialize all the middleware
	app.use(cookieParser());
	// Body-size limits: file/media uploads go through multer (multipart), not
	// these parsers, so a generous-but-bounded JSON/urlencoded limit is safe and
	// removes the previous 2GB DoS surface.
	app.use(express.urlencoded({ extended: true, limit: '25mb' }));
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
	app.use(express.static(__basedir + 'static'));

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
