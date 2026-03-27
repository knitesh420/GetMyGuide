import { NextFunction, Request, Response } from 'express';
import { BadRequestError } from 'node-be-utilities';

export async function CreateAdvertisementValidator(
	req: Request,
	res: Response,
	next: NextFunction
) {
	if (!req.file) {
		return next(new BadRequestError('Video file is required'));
	}

	if (!req.file.mimetype.startsWith('video/')) {
		return next(new BadRequestError('Only video files are allowed'));
	}

	if (req.file.size > 500 * 1024 * 1024) {
		return next(new BadRequestError('File size exceeds 500MB limit'));
	}

	next();
}

export async function UpdateAdvertisementValidator(
	req: Request,
	res: Response,
	next: NextFunction
) {
	if (!req.file) {
		return next(new BadRequestError('Video file is required'));
	}

	if (!req.file.mimetype.startsWith('video/')) {
		return next(new BadRequestError('Only video files are allowed'));
	}

	if (req.file.size > 500 * 1024 * 1024) {
		return next(new BadRequestError('File size exceeds 500MB limit'));
	}

	next();
}
