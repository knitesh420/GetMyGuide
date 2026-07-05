import { NextFunction, Request, Response } from 'express';
import { BadRequestError } from 'node-be-utilities';
import { z } from 'zod';

export type ReviewCreateValidationResult = {
	bookingId: string;
	rating: number;
	comment?: string;
};

export async function ReviewCreateValidator(req: Request, res: Response, next: NextFunction) {
	const reqValidator = z.object({
		bookingId: z.string().trim().min(1, 'Booking ID is required'),
		rating: z.coerce.number().int().min(1, 'Rating must be at least 1').max(5, 'Rating must be at most 5'),
		comment: z.string().trim().max(1000).optional(),
	});

	const reqValidatorResult = reqValidator.safeParse(req.body);

	if (reqValidatorResult.success) {
		req.locals.data = reqValidatorResult.data;
		return next();
	}

	const message = reqValidatorResult.error.issues.map((err) => `${err.path.join('.')}: ${err.message}`).join(', ');
	return next(new BadRequestError(message));
}

export type ReviewHideValidationResult = {
	isHidden: boolean;
};

export async function ReviewHideValidator(req: Request, res: Response, next: NextFunction) {
	const reqValidator = z.object({
		isHidden: z.preprocess((val) => (typeof val === 'string' ? val === 'true' : val), z.boolean()),
	});

	const reqValidatorResult = reqValidator.safeParse(req.body);

	if (reqValidatorResult.success) {
		req.locals.data = reqValidatorResult.data;
		return next();
	}

	const message = reqValidatorResult.error.issues.map((err) => `${err.path.join('.')}: ${err.message}`).join(', ');
	return next(new BadRequestError(message));
}

export type ReviewListQueryValidationResult = {
	page: number;
	limit: number;
	guideId?: string;
	minRating?: number;
	isHidden?: boolean;
};

export async function ReviewListQueryValidator(req: Request, res: Response, next: NextFunction) {
	const reqValidator = z.object({
		page: z.coerce.number().int().positive().default(1),
		limit: z.coerce.number().int().positive().max(100).default(20),
		guideId: z.string().trim().optional(),
		minRating: z.coerce.number().int().min(1).max(5).optional(),
		isHidden: z
			.preprocess((val) => (typeof val === 'string' ? val === 'true' : val), z.boolean())
			.optional(),
	});

	const reqValidatorResult = reqValidator.safeParse(req.query);

	if (reqValidatorResult.success) {
		req.locals.data = reqValidatorResult.data;
		return next();
	}

	const message = reqValidatorResult.error.issues.map((err) => `${err.path.join('.')}: ${err.message}`).join(', ');
	return next(new BadRequestError(message));
}

export type ReviewMyQueryValidationResult = {
	page: number;
	limit: number;
};

export async function ReviewMyQueryValidator(req: Request, res: Response, next: NextFunction) {
	const reqValidator = z.object({
		page: z.coerce.number().int().positive().default(1),
		limit: z.coerce.number().int().positive().max(100).default(20),
	});

	const reqValidatorResult = reqValidator.safeParse(req.query);

	if (reqValidatorResult.success) {
		req.locals.data = reqValidatorResult.data;
		return next();
	}

	const message = reqValidatorResult.error.issues.map((err) => `${err.path.join('.')}: ${err.message}`).join(', ');
	return next(new BadRequestError(message));
}
