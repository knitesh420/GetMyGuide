import { NextFunction, Request, Response } from 'express';
import { BadRequestError } from 'node-be-utilities';
import { z } from 'zod';

export type TripStartValidationResult = {
	notes?: string;
};

export async function TripStartValidator(req: Request, res: Response, next: NextFunction) {
	const reqValidator = z.object({
		notes: z.string().trim().optional(),
	});

	const reqValidatorResult = reqValidator.safeParse(req.body);

	if (reqValidatorResult.success) {
		req.locals.data = reqValidatorResult.data;
		return next();
	}

	const message = reqValidatorResult.error.issues.map((err) => `${err.path.join('.')}: ${err.message}`).join(', ');
	return next(new BadRequestError(message));
}

export type TripCompleteValidationResult = {
	completionNotes?: string;
};

export async function TripCompleteValidator(req: Request, res: Response, next: NextFunction) {
	const reqValidator = z.object({
		completionNotes: z.string().trim().optional(),
	});

	const reqValidatorResult = reqValidator.safeParse(req.body);

	if (reqValidatorResult.success) {
		req.locals.data = reqValidatorResult.data;
		return next();
	}

	const message = reqValidatorResult.error.issues.map((err) => `${err.path.join('.')}: ${err.message}`).join(', ');
	return next(new BadRequestError(message));
}

export type TripCancelValidationResult = {
	reason?: string;
};

export async function TripCancelValidator(req: Request, res: Response, next: NextFunction) {
	const reqValidator = z.object({
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

export type TripListQueryValidationResult = {
	page: number;
	limit: number;
	status?: string;
	guideId?: string;
};

export async function TripListQueryValidator(req: Request, res: Response, next: NextFunction) {
	const reqValidator = z.object({
		page: z.coerce.number().int().positive().default(1),
		limit: z.coerce.number().int().positive().max(100).default(20),
		status: z.enum(['not-started', 'in-progress', 'completed', 'cancelled']).optional(),
		guideId: z.string().trim().optional(),
	});

	const reqValidatorResult = reqValidator.safeParse(req.query);

	if (reqValidatorResult.success) {
		req.locals.data = reqValidatorResult.data;
		return next();
	}

	const message = reqValidatorResult.error.issues.map((err) => `${err.path.join('.')}: ${err.message}`).join(', ');
	return next(new BadRequestError(message));
}

export type TripMyQueryValidationResult = {
	page: number;
	limit: number;
	status?: string;
};

export async function TripMyQueryValidator(req: Request, res: Response, next: NextFunction) {
	const reqValidator = z.object({
		page: z.coerce.number().int().positive().default(1),
		limit: z.coerce.number().int().positive().max(100).default(20),
		status: z.enum(['not-started', 'in-progress', 'completed', 'cancelled']).optional(),
	});

	const reqValidatorResult = reqValidator.safeParse(req.query);

	if (reqValidatorResult.success) {
		req.locals.data = reqValidatorResult.data;
		return next();
	}

	const message = reqValidatorResult.error.issues.map((err) => `${err.path.join('.')}: ${err.message}`).join(', ');
	return next(new BadRequestError(message));
}
