import { NextFunction, Request, Response } from 'express';
import { BadRequestError } from 'node-be-utilities';

import { touristProfileSchema } from './tourist.schema';

export type TouristProfileValidationResult = {
	nationality: string;
	preferredLanguages: string[];
	travelInterests: string[];
	budget: string;
	travelDates?: { startDate?: string; endDate?: string };
	numberOfTravelers: number;
	about: string;
};

/**
 * Express validator for the tourist profile.
 *
 * The schema itself now lives in ./tourist.schema.ts so the native Next Route
 * Handler validates against the same object during the migration. Behaviour is
 * unchanged.
 */
export async function TouristProfileValidator(req: Request, _res: Response, next: NextFunction) {
	const result = touristProfileSchema.safeParse(req.body);

	if (result.success) {
		req.locals.data = result.data;
		return next();
	}

	const message = result.error.issues
		.map((err) => `${err.path.join('.')}: ${err.message}`)
		.join(', ');

	return next(new BadRequestError(message));
}
