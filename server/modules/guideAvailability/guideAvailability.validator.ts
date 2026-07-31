import { handleValidation as handle } from '@utils/validate';
import { NextFunction, Request, Response } from 'express';

import { createLeaveSchema, guidesAvailabilityQuerySchema } from './guideAvailability.schema';

/**
 * The schemas themselves live in `guideAvailability.schema.ts`, shared with the
 * native Route Handlers in `app/api/guide-availability/`. These wrappers exist
 * only to keep the Express middleware signature while both are mounted.
 */

export type CreateLeaveValidationResult = {
	type: 'vacation' | 'emergency';
	startDate: string;
	endDate: string;
	reason?: string;
};

export async function CreateLeaveValidator(req: Request, res: Response, next: NextFunction) {
	return handle(createLeaveSchema.safeParse(req.body), req, next);
}

export type GuidesAvailabilityQueryValidationResult = {
	startDate: string;
	endDate?: string;
};

export async function GuidesAvailabilityQueryValidator(
	req: Request,
	res: Response,
	next: NextFunction
) {
	return handle(guidesAvailabilityQuerySchema.safeParse(req.query), req, next);
}
