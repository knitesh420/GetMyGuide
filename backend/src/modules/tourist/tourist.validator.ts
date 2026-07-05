import { NextFunction, Request, Response } from 'express';
import { BadRequestError } from 'node-be-utilities';
import { z } from 'zod';

export type TouristProfileValidationResult = {
	nationality: string;
	preferredLanguages: string[];
	travelInterests: string[];
	budget: string;
	travelDates?: { startDate?: string; endDate?: string };
	numberOfTravelers: number;
	about: string;
};

export async function TouristProfileValidator(req: Request, res: Response, next: NextFunction) {
	const reqValidator = z.object({
		nationality: z.string().trim().min(1, 'Nationality is required'),
		preferredLanguages: z.array(z.string().trim().min(1)).default([]),
		travelInterests: z.array(z.string().trim().min(1)).default([]),
		budget: z.string().trim().min(1, 'Budget is required'),
		travelDates: z
			.object({
				startDate: z.string().trim().optional(),
				endDate: z.string().trim().optional(),
			})
			.optional(),
		numberOfTravelers: z.coerce.number().int().positive('Number of travelers must be at least 1'),
		about: z.string().trim().min(1, 'About is required'),
	});

	const reqValidatorResult = reqValidator.safeParse(req.body);

	if (reqValidatorResult.success) {
		req.locals.data = reqValidatorResult.data;
		return next();
	}

	const message = reqValidatorResult.error.issues
		.map((err) => `${err.path.join('.')}: ${err.message}`)
		.join(', ');

	return next(new BadRequestError(message));
}
