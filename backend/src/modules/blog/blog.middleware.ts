import crypto from 'crypto';
import { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { BadRequestError } from 'node-be-utilities';
import path from 'path';

const storage = multer.diskStorage({
	destination: (req, file, cb) => {
		const tempDir = path.join(global.__basedir, 'static', 'misc');
		cb(null, tempDir);
	},
	filename: (req, file, cb) => {
		cb(null, crypto.randomUUID() + path.extname(file.originalname));
	},
});

// File filter for video files
const videoFileFilter = (
	req: Request,
	file: Express.Multer.File,
	cb: multer.FileFilterCallback
) => {
	if (file.fieldname === 'video') {
		if (file.mimetype.startsWith('video/')) {
			return cb(null, true);
		}
		return cb(new Error('Only video files are allowed for video field'));
	}
	cb(null, true);
};

// File filter for image files
const imageFileFilter = (
	req: Request,
	file: Express.Multer.File,
	cb: multer.FileFilterCallback
) => {
	if (file.fieldname === 'image') {
		const allowedImageTypes = ['image/png', 'image/webp', 'image/jpg', 'image/jpeg'];
		if (allowedImageTypes.includes(file.mimetype)) {
			return cb(null, true);
		}
		return cb(new Error('Only JPG, PNG, WEBP images are allowed for image field'));
	}
	cb(null, true);
};

// Combined file filter
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
	if (file.fieldname === 'video') {
		return videoFileFilter(req, file, cb);
	}
	if (file.fieldname === 'image') {
		return imageFileFilter(req, file, cb);
	}
	cb(null, true);
};

// Multer middleware
const multerMiddleware = multer({
	storage,
	fileFilter,
	limits: {
		fileSize: 2048 * 1024 * 1024, // 2GB limit
	},
}).fields([
	{ name: 'video', maxCount: 1 },
	{ name: 'image', maxCount: 1 },
]);

// Middleware to parse multipart form data (both files and body fields)
// This makes req.body available for validation
// Wrapped with error handling to convert multer errors to BadRequestError
export const parseBlogFormData = (req: Request, res: Response, next: NextFunction) => {
	multerMiddleware(req, res, (err: any) => {
		if (err) {
			// Convert multer errors to BadRequestError
			if (err instanceof multer.MulterError) {
				return next(new BadRequestError(err.message));
			}
			// Convert file filter errors to BadRequestError
			if (err.message) {
				return next(new BadRequestError(err.message));
			}
			return next(err);
		}
		next();
	});
};
