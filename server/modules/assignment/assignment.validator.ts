import { NextFunction, Request, Response } from 'express';
import { BadRequestError } from 'node-be-utilities';
import type { z } from 'zod';

import {
	assignmentCreateSchema,
	assignmentListQuerySchema,
	assignmentMyQuerySchema,
	assignmentReassignSchema,
	assignmentRespondSchema,
} from './assignment.schema';

/**
 * Express validator middleware for the assignment module.
 *
 * The schemas now live in ./assignment.schema.ts so the native Next Route
 * Handlers validate against the same objects. Behaviour unchanged.
 */

export type AssignmentCreateValidationResult = {
	bookingId: string;
	guideId: string;
	adminNotes?: string;
	override?: boolean;
	overrideReason?: string;
};

export type AssignmentRespondValidationResult = {
	action: 'accept' | 'decline';
	declineReason?: string;
};

export type AssignmentReassignValidationResult = {
	newGuideId: string;
	adminNotes?: string;
	override?: boolean;
	overrideReason?: string;
};

export type AssignmentListQueryValidationResult = {
	page: number;
	limit: number;
	status?: string;
	guideId?: string;
	bookingId?: string;
};

export type AssignmentMyQueryValidationResult = {
	page: number;
	limit: number;
	status?: string;
};

function validateBodyMw<T>(schema: z.ZodType<T>) {
	return async function validator(req: Request, _res: Response, next: NextFunction) {
		const result = schema.safeParse(req.body);
		if (result.success) {
			req.locals.data = result.data as object;
			return next();
		}
		const message = result.error.issues
			.map((err) => `${err.path.join('.')}: ${err.message}`)
			.join(', ');
		return next(new BadRequestError(message));
	};
}

function validateQueryMw<T>(schema: z.ZodType<T>) {
	return async function validator(req: Request, _res: Response, next: NextFunction) {
		const result = schema.safeParse(req.query);
		if (result.success) {
			req.locals.data = result.data as object;
			return next();
		}
		const message = result.error.issues
			.map((err) => `${err.path.join('.')}: ${err.message}`)
			.join(', ');
		return next(new BadRequestError(message));
	};
}

export const AssignmentCreateValidator = validateBodyMw(assignmentCreateSchema);
export const AssignmentRespondValidator = validateBodyMw(assignmentRespondSchema);
export const AssignmentReassignValidator = validateBodyMw(assignmentReassignSchema);
export const AssignmentListQueryValidator = validateQueryMw(assignmentListQuerySchema);
export const AssignmentMyQueryValidator = validateQueryMw(assignmentMyQuerySchema);
