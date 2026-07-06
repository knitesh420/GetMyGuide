import { NextFunction, Request, Response } from 'express';
import { BadRequestError } from 'node-be-utilities';
import { z } from 'zod';

export type AssignmentCreateValidationResult = {
	bookingId: string;
	guideId: string;
	adminNotes?: string;
	override?: boolean;
	overrideReason?: string;
};

export async function AssignmentCreateValidator(req: Request, res: Response, next: NextFunction) {
	const reqValidator = z
		.object({
			bookingId: z.string().trim().min(1, 'Booking ID is required'),
			guideId: z.string().trim().min(1, 'Guide ID is required'),
			adminNotes: z.string().trim().optional(),
			override: z.boolean().optional(),
			overrideReason: z.string().trim().optional(),
		})
		.refine((data) => !data.override || !!data.overrideReason, {
			message: 'A reason is required to override an availability conflict',
			path: ['overrideReason'],
		});

	const reqValidatorResult = reqValidator.safeParse(req.body);

	if (reqValidatorResult.success) {
		req.locals.data = reqValidatorResult.data;
		return next();
	}

	const message = reqValidatorResult.error.issues.map((err) => `${err.path.join('.')}: ${err.message}`).join(', ');
	return next(new BadRequestError(message));
}

export type AssignmentRespondValidationResult = {
	action: 'accept' | 'decline';
	declineReason?: string;
};

export async function AssignmentRespondValidator(req: Request, res: Response, next: NextFunction) {
	const reqValidator = z
		.object({
			action: z.enum(['accept', 'decline'], { message: 'Action must be accept or decline' }),
			declineReason: z.string().trim().min(1).optional(),
		})
		.refine((data) => data.action !== 'decline' || !!data.declineReason, {
			message: 'A reason is required to decline an assignment',
			path: ['declineReason'],
		});

	const reqValidatorResult = reqValidator.safeParse(req.body);

	if (reqValidatorResult.success) {
		req.locals.data = reqValidatorResult.data;
		return next();
	}

	const message = reqValidatorResult.error.issues.map((err) => `${err.path.join('.')}: ${err.message}`).join(', ');
	return next(new BadRequestError(message));
}

export type AssignmentReassignValidationResult = {
	newGuideId: string;
	adminNotes?: string;
	override?: boolean;
	overrideReason?: string;
};

export async function AssignmentReassignValidator(req: Request, res: Response, next: NextFunction) {
	const reqValidator = z
		.object({
			newGuideId: z.string().trim().min(1, 'New guide ID is required'),
			adminNotes: z.string().trim().optional(),
			override: z.boolean().optional(),
			overrideReason: z.string().trim().optional(),
		})
		.refine((data) => !data.override || !!data.overrideReason, {
			message: 'A reason is required to override an availability conflict',
			path: ['overrideReason'],
		});

	const reqValidatorResult = reqValidator.safeParse(req.body);

	if (reqValidatorResult.success) {
		req.locals.data = reqValidatorResult.data;
		return next();
	}

	const message = reqValidatorResult.error.issues.map((err) => `${err.path.join('.')}: ${err.message}`).join(', ');
	return next(new BadRequestError(message));
}

export type AssignmentListQueryValidationResult = {
	page: number;
	limit: number;
	status?: string;
	guideId?: string;
	bookingId?: string;
};

export async function AssignmentListQueryValidator(req: Request, res: Response, next: NextFunction) {
	const reqValidator = z.object({
		page: z.coerce.number().int().positive().default(1),
		limit: z.coerce.number().int().positive().max(100).default(20),
		status: z.enum(['pending', 'accepted', 'declined', 'reassigned']).optional(),
		guideId: z.string().trim().optional(),
		bookingId: z.string().trim().optional(),
	});

	const reqValidatorResult = reqValidator.safeParse(req.query);

	if (reqValidatorResult.success) {
		req.locals.data = reqValidatorResult.data;
		return next();
	}

	const message = reqValidatorResult.error.issues.map((err) => `${err.path.join('.')}: ${err.message}`).join(', ');
	return next(new BadRequestError(message));
}

export type AssignmentMyQueryValidationResult = {
	page: number;
	limit: number;
	status?: string;
};

export async function AssignmentMyQueryValidator(req: Request, res: Response, next: NextFunction) {
	const reqValidator = z.object({
		page: z.coerce.number().int().positive().default(1),
		limit: z.coerce.number().int().positive().max(100).default(20),
		status: z.enum(['pending', 'accepted', 'declined', 'reassigned']).optional(),
	});

	const reqValidatorResult = reqValidator.safeParse(req.query);

	if (reqValidatorResult.success) {
		req.locals.data = reqValidatorResult.data;
		return next();
	}

	const message = reqValidatorResult.error.issues.map((err) => `${err.path.join('.')}: ${err.message}`).join(', ');
	return next(new BadRequestError(message));
}
