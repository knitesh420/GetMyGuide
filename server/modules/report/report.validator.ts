import { NextFunction, Request, Response } from 'express';
import { BadRequestError } from 'node-be-utilities';
import type { z } from 'zod';

import {
	activityLogQuerySchema,
	bookingsTrendSchema,
	guidePerformanceSchema,
} from './report.schema';

/**
 * Express validator middleware for the report module.
 *
 * The schemas now live in ./report.schema.ts so the native Next Route Handlers
 * validate against the same objects. Note these parse req.QUERY, not req.body —
 * every report endpoint is a GET.
 */

export type BookingsTrendValidationResult = {
	range: '7d' | '30d' | '90d';
};

export type GuidePerformanceValidationResult = {
	limit: number;
};

export type ActivityLogQueryValidationResult = {
	page: number;
	limit: number;
	action?: string;
	actorType?: 'user' | 'system';
	from?: string;
	to?: string;
};

function validateQuery<T>(schema: z.ZodType<T>) {
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

export const BookingsTrendValidator = validateQuery(bookingsTrendSchema);
export const GuidePerformanceValidator = validateQuery(guidePerformanceSchema);
export const ActivityLogQueryValidator = validateQuery(activityLogQuerySchema);
