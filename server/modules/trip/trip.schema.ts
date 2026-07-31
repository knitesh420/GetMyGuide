import { z } from 'zod';

/**
 * Zod schemas for the trip module.
 *
 * Extracted from trip.validator.ts so the Express middleware and the native
 * Route Handlers share one definition. Rules and messages unchanged.
 */

/** The four states a trip can be in; shared by both list filters. */
const tripStatus = z.enum(['not-started', 'in-progress', 'completed', 'cancelled']);

export const tripStartSchema = z.object({
	notes: z.string().trim().optional(),
});

export const tripCompleteSchema = z.object({
	completionNotes: z.string().trim().optional(),
});

export const tripCancelSchema = z.object({
	reason: z.string().trim().optional(),
});

export const tripListQuerySchema = z.object({
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().positive().max(100).default(20),
	status: tripStatus.optional(),
	guideId: z.string().trim().optional(),
});

export const tripMyQuerySchema = z.object({
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().positive().max(100).default(20),
	status: tripStatus.optional(),
});
