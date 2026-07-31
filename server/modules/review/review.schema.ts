import { z } from 'zod';

/**
 * Zod schemas for the review module.
 *
 * Extracted from review.validator.ts so the Express middleware and the native
 * Route Handlers share one definition. Rules and messages unchanged.
 */

/**
 * A boolean that may arrive as the string "true"/"false" from a query string or
 * a form post. Preprocessed rather than coerced, because `z.coerce.boolean()`
 * reads the string "false" as `true` — which on the admin review table would
 * turn "show me the visible ones" into "show me the hidden ones".
 */
const looseBoolean = z.preprocess(
	(val) => (typeof val === 'string' ? val === 'true' : val),
	z.boolean()
);

export const reviewCreateSchema = z.object({
	bookingId: z.string().trim().min(1, 'Booking ID is required'),
	rating: z.coerce
		.number()
		.int()
		.min(1, 'Rating must be at least 1')
		.max(5, 'Rating must be at most 5'),
	comment: z.string().trim().max(1000).optional(),
});

export const reviewHideSchema = z.object({
	isHidden: looseBoolean,
});

export const reviewListQuerySchema = z.object({
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().positive().max(100).default(20),
	guideId: z.string().trim().optional(),
	minRating: z.coerce.number().int().min(1).max(5).optional(),
	isHidden: looseBoolean.optional(),
});

export const reviewMyQuerySchema = z.object({
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().positive().max(100).default(20),
});
