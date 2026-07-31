import { z } from 'zod';

/**
 * Zod schema for the tourist module.
 *
 * Extracted from tourist.validator.ts so the Express middleware and the native
 * Next Route Handler validate against the same object. Unchanged from the
 * original — same rules, same messages (the frontend renders them verbatim).
 */
export const touristProfileSchema = z.object({
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
