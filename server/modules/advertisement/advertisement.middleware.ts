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

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
	if (!file.mimetype.startsWith('video/')) {
		return cb(new Error('Only video files are allowed'));
	}
	cb(null, true);
};

const uploadVideo = multer({
	storage,
	fileFilter,
	limits: {
		fileSize: 500 * 1024 * 1024, // 500MB
	},
}).single('video');

export const parseAdvertisementFormData = (req: Request, res: Response, next: NextFunction) => {
	uploadVideo(req, res, (err: any) => {
		if (err) {
			if (err instanceof multer.MulterError) {
				if (err.code === 'LIMIT_FILE_SIZE') {
					return next(new BadRequestError('File size exceeds 500MB limit'));
				}
				if (err.code === 'LIMIT_PART_COUNT') {
					return next(new BadRequestError('Too many file parts'));
				}
			}

			if (err.message) {
				return next(new BadRequestError(err.message));
			}

			return next(new BadRequestError('File upload failed'));
		}
		next();
	});
};
