import { handleValidation as handle } from '@utils/validate';
import { NextFunction, Request, Response } from 'express';

import { allocateGuideSchema, createBookingSchema, packageBookingSchema } from './booking.schema';

/**
 * The schemas themselves live in `booking.schema.ts`, shared with the native
 * Route Handlers in `app/api/booking/`. These wrappers exist only to keep the
 * Express middleware signature while both implementations are mounted.
 */

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
	return handle(createBookingSchema.safeParse(req.body), req, next);
}

export type PackageBookingValidationResult = {
	tourId: string;
	guideId: string;
	startDate: Date;
	endDate: Date;
	tourists: number;
};

export async function PackageBookingValidator(req: Request, res: Response, next: NextFunction) {
	return handle(packageBookingSchema.safeParse(req.body), req, next);
}

export type AllocateGuideValidationResult = {
	guide_id: string;
};

export async function AllocateGuideValidator(req: Request, res: Response, next: NextFunction) {
	return handle(allocateGuideSchema.safeParse(req.body), req, next);
}
