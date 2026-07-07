import { NextFunction, Request, Response } from 'express';
import { BadRequestError } from 'node-be-utilities';
import { z } from 'zod';

export type BookingsTrendValidationResult = {
	range: '7d' | '30d' | '90d';
};

export async function BookingsTrendValidator(req: Request, res: Response, next: NextFunction) {
	const reqValidator = z.object({
		range: z.enum(['7d', '30d', '90d']).default('30d'),
	});

	const reqValidatorResult = reqValidator.safeParse(req.query);

	if (reqValidatorResult.success) {
		req.locals.data = reqValidatorResult.data;
		return next();
	}

	const message = reqValidatorResult.error.issues.map((err) => `${err.path.join('.')}: ${err.message}`).join(', ');
	return next(new BadRequestError(message));
}

export type GuidePerformanceValidationResult = {
	limit: number;
};

export async function GuidePerformanceValidator(req: Request, res: Response, next: NextFunction) {
	const reqValidator = z.object({
		limit: z.coerce.number().int().positive().max(100).default(10),
	});

	const reqValidatorResult = reqValidator.safeParse(req.query);

	if (reqValidatorResult.success) {
		req.locals.data = reqValidatorResult.data;
		return next();
	}

	const message = reqValidatorResult.error.issues.map((err) => `${err.path.join('.')}: ${err.message}`).join(', ');
	return next(new BadRequestError(message));
}

export type ActivityLogQueryValidationResult = {
	page: number;
	limit: number;
	action?: string;
	actorType?: 'user' | 'system';
	from?: string;
	to?: string;
};

export async function ActivityLogQueryValidator(req: Request, res: Response, next: NextFunction) {
	const reqValidator = z.object({
		page: z.coerce.number().int().positive().default(1),
		limit: z.coerce.number().int().positive().max(100).default(20),
		action: z.string().trim().optional(),
		actorType: z.enum(['user', 'system']).optional(),
		from: z.string().trim().optional(),
		to: z.string().trim().optional(),
	});

	const reqValidatorResult = reqValidator.safeParse(req.query);

	if (reqValidatorResult.success) {
		req.locals.data = reqValidatorResult.data;
		return next();
	}

	const message = reqValidatorResult.error.issues.map((err) => `${err.path.join('.')}: ${err.message}`).join(', ');
	return next(new BadRequestError(message));
}
