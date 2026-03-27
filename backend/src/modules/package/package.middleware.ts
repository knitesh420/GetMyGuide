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

// File filter for image files
const imageFileFilter = (
	req: Request,
	file: Express.Multer.File,
	cb: multer.FileFilterCallback
) => {
	if (file.fieldname === 'images') {
		const allowedImageTypes = ['image/png', 'image/webp', 'image/jpg', 'image/jpeg'];
		if (allowedImageTypes.includes(file.mimetype)) {
			return cb(null, true);
		}
		return cb(new Error('Only JPG, PNG, WEBP images are allowed for images field'));
	}
	cb(null, true);
};

// Multer middleware
const multerMiddleware = multer({
	storage,
	fileFilter: imageFileFilter,
	limits: {
		fileSize: 10 * 1024 * 1024, // 10MB limit per file
	},
}).array('images', 10); // Allow up to 10 images

// Middleware to parse multipart form data (both files and body fields)
// This makes req.body available for validation
// Wrapped with error handling to convert multer errors to BadRequestError
export const parsePackageFormData = (req: Request, res: Response, next: NextFunction) => {
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
