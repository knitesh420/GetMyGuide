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

// File filter for PDF files (licence and aadhar)
const pdfFileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
	if (file.fieldname === 'licence' || file.fieldname === 'aadhar') {
		if (file.mimetype === 'application/pdf') {
			return cb(null, true);
		}
		return cb(new Error('Only PDF files are allowed for licence and aadhar fields'));
	}
	cb(null, true);
};

// File filter for image files (photo)
const imageFileFilter = (
	req: Request,
	file: Express.Multer.File,
	cb: multer.FileFilterCallback
) => {
	if (file.fieldname === 'photo') {
		const allowedImageTypes = ['image/png', 'image/webp', 'image/jpg', 'image/jpeg'];
		if (allowedImageTypes.includes(file.mimetype)) {
			return cb(null, true);
		}
		return cb(new Error('Only JPG, PNG, WEBP images are allowed for photo field'));
	}
	cb(null, true);
};

// Combined file filter
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
	if (file.fieldname === 'licence' || file.fieldname === 'aadhar') {
		return pdfFileFilter(req, file, cb);
	}
	if (file.fieldname === 'photo') {
		return imageFileFilter(req, file, cb);
	}
	cb(null, true);
};

// Multer middleware
const multerMiddleware = multer({
	storage,
	fileFilter,
	limits: {
		fileSize: 10 * 1024 * 1024, // 10MB limit
	},
}).fields([
	{ name: 'licence', maxCount: 1 },
	{ name: 'aadhar', maxCount: 1 },
	{ name: 'photo', maxCount: 1 },
]);

// Middleware to parse multipart form data (both files and body fields)
export const parseGuideEnrollmentFormData = (req: Request, res: Response, next: NextFunction) => {
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
