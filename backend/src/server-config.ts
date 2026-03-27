import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { Express, NextFunction, Request, Response } from 'express';
import fs from 'fs';
import routes from './modules';

import { createLoggerContext, errorHandler, NotFoundError, RespondFile } from 'node-be-utilities';
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
	let basedir = __dirname;
	basedir = basedir.slice(0, basedir.lastIndexOf(IS_WINDOWS ? '\\' : '/'));
	if (IS_PRODUCTION) {
		basedir = basedir.slice(0, basedir.lastIndexOf(IS_WINDOWS ? '\\' : '/'));
	}
	global.__basedir = basedir;

	//Initialize all the middleware
	app.use(cookieParser());
	app.use(express.urlencoded({ extended: true, limit: '2048mb' }));
	app.use(express.json({ limit: '2048mb' }));
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
			const path = __basedir + '/static/' + req.params.path + '/' + req.params.filename;
			return RespondFile({
				res,
				filename: req.params.filename,
				filepath: path,
			});
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
