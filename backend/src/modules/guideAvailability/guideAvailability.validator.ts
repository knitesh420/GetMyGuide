import { NextFunction, Request, Response } from 'express';
import { BadRequestError } from 'node-be-utilities';
import { z } from 'zod';

export type CreateLeaveValidationResult = {
	type: 'vacation' | 'emergency';
	startDate: string;
	endDate: string;
	reason?: string;
};

export async function CreateLeaveValidator(req: Request, res: Response, next: NextFunction) {
	const reqValidator = z.object({
		type: z.enum(['vacation', 'emergency'], { message: 'Type must be vacation or emergency' }),
		startDate: z.string().trim().min(1, 'Start date is required'),
		endDate: z.string().trim().min(1, 'End date is required'),
		reason: z.string().trim().optional(),
	});

	const reqValidatorResult = reqValidator.safeParse(req.body);

	if (reqValidatorResult.success) {
		req.locals.data = reqValidatorResult.data;
		return next();
	}

	const message = reqValidatorResult.error.issues.map((err) => `${err.path.join('.')}: ${err.message}`).join(', ');
	return next(new BadRequestError(message));
}

export type GuidesAvailabilityQueryValidationResult = {
	startDate: string;
	endDate?: string;
};

export async function GuidesAvailabilityQueryValidator(req: Request, res: Response, next: NextFunction) {
	const reqValidator = z.object({
		startDate: z.string().trim().min(1, 'Start date is required'),
		endDate: z.string().trim().optional(),
	});

	const reqValidatorResult = reqValidator.safeParse(req.query);

	if (reqValidatorResult.success) {
		req.locals.data = reqValidatorResult.data;
		return next();
	}

	const message = reqValidatorResult.error.issues.map((err) => `${err.path.join('.')}: ${err.message}`).join(', ');
	return next(new BadRequestError(message));
}
