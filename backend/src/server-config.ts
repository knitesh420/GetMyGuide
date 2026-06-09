import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { Express, NextFunction, Request, Response } from 'express';
import fs from 'fs';
import routes from './modules';

import { createLoggerContext, errorHandler, NotFoundError } from 'node-be-utilities';
import { IS_WINDOWS, Path } from './config/const';

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

	//Initialize all the middleware
	app.use(cookieParser());
	app.use(express.urlencoded({ extended: true, limit: '2048mb' }));
	app.use(
		express.json({
			limit: '2048mb',
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

	app.route('/media/:path/:filename').get((req, res, next) => {
		try {
			const filePath = __basedir + '/static/' + req.params.path + '/' + req.params.filename;

			if (!fs.existsSync(filePath)) {
				return next(new NotFoundError('File not found'));
			}

			const stat = fs.statSync(filePath);
			const fileSize = stat.size;
			const range = req.headers.range;

			// Determine content type
			const ext = req.params.filename.split('.').pop()?.toLowerCase();
			const mimeTypes: Record<string, string> = {
				mp4: 'video/mp4',
				webm: 'video/webm',
				ogg: 'video/ogg',
				mov: 'video/quicktime',
				jpg: 'image/jpeg',
				jpeg: 'image/jpeg',
				png: 'image/png',
				gif: 'image/gif',
				webp: 'image/webp',
				svg: 'image/svg+xml',
			};
			const contentType = mimeTypes[ext || ''] || 'application/octet-stream';

			if (range) {
				// Handle range request for video streaming
				const parts = range.replace(/bytes=/, '').split('-');
				const start = parseInt(parts[0], 10);
				const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
				const chunkSize = end - start + 1;

				const stream = fs.createReadStream(filePath, { start, end });
				res.writeHead(206, {
					'Content-Range': `bytes ${start}-${end}/${fileSize}`,
					'Accept-Ranges': 'bytes',
					'Content-Length': chunkSize,
					'Content-Type': contentType,
					'Content-Disposition': 'inline',
				});
				stream.pipe(res);
			} else {
				res.writeHead(200, {
					'Content-Length': fileSize,
					'Content-Type': contentType,
					'Accept-Ranges': 'bytes',
					'Content-Disposition': 'inline',
				});
				fs.createReadStream(filePath).pipe(res);
			}
		} catch {
			return next(new NotFoundError('File not found'));
		}
	});

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
