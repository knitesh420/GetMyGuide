import crypto from 'crypto';
import { NextFunction, Request, RequestHandler, Response } from 'express';
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

// ---- Guide profile (post-login, membership) form upload -------------------

const profileFileFilter = (
	req: Request,
	file: Express.Multer.File,
	cb: multer.FileFilterCallback
) => {
	if (file.fieldname === 'profileImage') {
		const allowedImageTypes = ['image/png', 'image/webp', 'image/jpg', 'image/jpeg'];
		if (allowedImageTypes.includes(file.mimetype)) {
			return cb(null, true);
		}
		return cb(new Error('Only JPG, PNG, WEBP images are allowed'));
	}
	if (file.fieldname === 'identityProofs') {
		const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
		if (allowedTypes.includes(file.mimetype)) {
			return cb(null, true);
		}
		return cb(new Error('Only PDF, PNG, JPG, JPEG files are allowed for identity proofs'));
	}
	cb(null, true);
};

const guideProfileMulterMiddleware = multer({
	storage,
	fileFilter: profileFileFilter,
	limits: {
		fileSize: 10 * 1024 * 1024, // 10MB per file
	},
}).fields([
	{ name: 'profileImage', maxCount: 1 },
	{ name: 'identityProofs', maxCount: 5 },
]);

export const parseGuideProfileFormData = (req: Request, res: Response, next: NextFunction) => {
	guideProfileMulterMiddleware(req, res, (err: any) => {
		if (err) {
			if (err instanceof multer.MulterError) {
				return next(new BadRequestError(err.message));
			}
			if (err.message) {
				return next(new BadRequestError(err.message));
			}
			return next(err);
		}
		next();
	});
};

// ---- Post-registration single-file self-service uploads -------------------
// The guide manages their profile photo and their two identity documents one at
// a time after registration. Same disk storage as above; each parser accepts a
// single file under its own field name, so a mismatched field is simply ignored.

const IMAGE_MIME_TYPES = ['image/png', 'image/webp', 'image/jpg', 'image/jpeg'];
// Documents additionally allow PDF and WebP, per the profile spec.
const DOCUMENT_MIME_TYPES = ['application/pdf', 'image/png', 'image/webp', 'image/jpg', 'image/jpeg'];

const profilePhotoMulter = multer({
	storage,
	fileFilter: (req, file, cb) => {
		if (IMAGE_MIME_TYPES.includes(file.mimetype)) return cb(null, true);
		return cb(new Error('Only JPG, PNG, WEBP images are allowed'));
	},
	limits: { fileSize: 10 * 1024 * 1024 },
}).single('profileImage');

const identityDocumentMulter = multer({
	storage,
	fileFilter: (req, file, cb) => {
		if (DOCUMENT_MIME_TYPES.includes(file.mimetype)) return cb(null, true);
		return cb(new Error('Only PDF, PNG, JPG, JPEG, WEBP files are allowed'));
	},
	limits: { fileSize: 10 * 1024 * 1024 },
}).single('document');

/** Shared error normaliser for the two single-file parsers below. */
const runSingleUpload =
	(upload: RequestHandler) => (req: Request, res: Response, next: NextFunction) => {
		upload(req, res, (err: any) => {
			if (err) {
				if (err instanceof multer.MulterError) return next(new BadRequestError(err.message));
				if (err.message) return next(new BadRequestError(err.message));
				return next(err);
			}
			next();
		});
	};

export const parseProfilePhotoUpload = runSingleUpload(profilePhotoMulter);
export const parseIdentityDocumentUpload = runSingleUpload(identityDocumentMulter);
