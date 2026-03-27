import { NextFunction, Request, Response } from 'express';
import { BadRequestError } from 'node-be-utilities';
import { z } from 'zod';

export type CreateBookingValidationResult = {
	tourist_info: {
		name: string;
		gender: 'male' | 'female' | 'other';
		phone: string;
		email: string;
		country: string;
	};
	travel_details: {
		places: string[];
		city: string;
		date: Date;
		no_of_person: number;
		preferences: {
			hotel: boolean;
			taxi: boolean;
		};
	};
	guide_preferences: {
		guide_language: string[];
		gender: 'male' | 'female' | 'none';
	};
	booking_configuration: {
		duration: 'half-day' | 'full-day';
		foreign_language_required: boolean;
		outstation?: {
			distance: number;
			over_night_stay: number;
			accomodation_meals: boolean;
			special_excursion: string[];
		};
		early_late_hours: boolean;
		extra_city_allowances: boolean;
		special_event_allowances: string[];
		price: number;
	};
};

export async function CreateBookingValidator(req: Request, res: Response, next: NextFunction) {
	const outstationSchema = z
		.object({
			distance: z.preprocess(
				(val) => {
					if (typeof val === 'string') {
						const parsed = parseFloat(val);
						return isNaN(parsed) ? val : parsed;
					}
					return val;
				},
				z.number().min(0, 'Distance must be a non-negative number')
			),
			over_night_stay: z.preprocess(
				(val) => {
					if (typeof val === 'string') {
						const parsed = parseFloat(val);
						return isNaN(parsed) ? val : parsed;
					}
					return val;
				},
				z.number().min(0, 'Overnight stay must be a non-negative number')
			),
			accomodation_meals: z.preprocess((val) => {
				if (typeof val === 'string') {
					if (val === 'true') return true;
					if (val === 'false') return false;
					return val;
				}
				return val;
			}, z.boolean()),
			special_excursion: z
				.preprocess((val) => {
					if (typeof val === 'string') {
						try {
							return JSON.parse(val);
						} catch {
							return val ? val.split(',').map((s) => s.trim()) : [];
						}
					}
					return Array.isArray(val) ? val : val ? [val] : [];
				}, z.array(z.string().trim()))
				.optional(),
		})
		.optional();

	const reqValidator = z.object({
		tourist_info: z.object({
			name: z.string().trim().min(1, 'Name is required'),
			gender: z.enum(['male', 'female', 'other'], {
				message: 'Gender must be male, female, or other',
			}),
			phone: z.string().trim().min(1, 'Phone is required'),
			email: z.string().email('Invalid email address').trim().toLowerCase(),
			country: z.string().trim().min(1, 'Country is required'),
		}),
		travel_details: z.object({
			places: z
				.preprocess(
					(val) => {
						if (typeof val === 'string') {
							try {
								return JSON.parse(val);
							} catch {
								return val.split(',').map((s) => s.trim());
							}
						}
						return Array.isArray(val) ? val : [val];
					},
					z.array(z.string().trim().min(1)).min(1, 'At least one place is required')
				)
				.transform((val) => (Array.isArray(val) ? val : [val])),
			city: z.string().trim().min(1, 'City is required'),
			date: z.preprocess(
				(val) => {
					if (typeof val === 'string') {
						return new Date(val);
					}
					return val;
				},
				z.date({ message: 'Invalid date format' })
			),
			no_of_person: z.preprocess(
				(val) => {
					if (typeof val === 'string') {
						const parsed = parseInt(val, 10);
						return isNaN(parsed) ? val : parsed;
					}
					return val;
				},
				z.number().min(1, 'Number of persons must be at least 1')
			),
			preferences: z.object({
				hotel: z.preprocess((val) => {
					if (typeof val === 'string') {
						if (val === 'true') return true;
						if (val === 'false') return false;
						return val;
					}
					return val;
				}, z.boolean()),
				taxi: z.preprocess((val) => {
					if (typeof val === 'string') {
						if (val === 'true') return true;
						if (val === 'false') return false;
						return val;
					}
					return val;
				}, z.boolean()),
			}),
		}),
		guide_preferences: z.object({
			guide_language: z
				.preprocess((val) => {
					if (typeof val === 'string') {
						try {
							return JSON.parse(val);
						} catch {
							return val ? val.split(',').map((s) => s.trim()) : [];
						}
					}
					return Array.isArray(val) ? val : val ? [val] : [];
				}, z.array(z.string().trim()))
				.optional()
				.default([]),
			gender: z.enum(['male', 'female', 'none'], {
				message: 'Gender preference must be male, female, or none',
			}),
		}),
		booking_configuration: z.object({
			duration: z.enum(['half-day', 'full-day'], {
				message: 'Duration must be half-day or full-day',
			}),
			foreign_language_required: z.preprocess((val) => {
				if (typeof val === 'string') {
					if (val === 'true') return true;
					if (val === 'false') return false;
					return val;
				}
				return val;
			}, z.boolean()),
			outstation: outstationSchema,
			early_late_hours: z.preprocess((val) => {
				if (typeof val === 'string') {
					if (val === 'true') return true;
					if (val === 'false') return false;
					return val;
				}
				return val;
			}, z.boolean()),
			extra_city_allowances: z.preprocess((val) => {
				if (typeof val === 'string') {
					if (val === 'true') return true;
					if (val === 'false') return false;
					return val;
				}
				return val;
			}, z.boolean()),
			special_event_allowances: z
				.preprocess((val) => {
					if (typeof val === 'string') {
						try {
							return JSON.parse(val);
						} catch {
							return val ? val.split(',').map((s) => s.trim()) : [];
						}
					}
					return Array.isArray(val) ? val : val ? [val] : [];
				}, z.array(z.string().trim()))
				.optional()
				.default([]),
			price: z.preprocess(
				(val) => {
					if (typeof val === 'string') {
						const parsed = parseFloat(val);
						return isNaN(parsed) ? val : parsed;
					}
					return val;
				},
				z.number().min(0, 'Price must be a positive number')
			),
		}),
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

export type AllocateGuideValidationResult = {
	guide_id: string;
};

export async function AllocateGuideValidator(req: Request, res: Response, next: NextFunction) {
	const reqValidator = z.object({
		guide_id: z.string().trim().min(1, 'Guide ID is required'),
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
