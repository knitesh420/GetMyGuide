import { z } from 'zod';

/**
 * Zod schemas for the report module.
 *
 * These validate the QUERY STRING, not a JSON body — every report endpoint is a
 * GET. The `.default(...)` values are load-bearing: the controllers destructure
 * straight into service calls, so a missing `range` must arrive as '30d' rather
 * than undefined.
 *
 * Extracted from report.validator.ts so the Express middleware and the native
 * Route Handlers share one definition.
 */

export const bookingsTrendSchema = z.object({
	range: z.enum(['7d', '30d', '90d']).default('30d'),
});

export const guidePerformanceSchema = z.object({
	limit: z.coerce.number().int().positive().max(100).default(10),
});

export const activityLogQuerySchema = z.object({
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().positive().max(100).default(20),
	action: z.string().trim().optional(),
	actorType: z.enum(['user', 'system']).optional(),
	from: z.string().trim().optional(),
	to: z.string().trim().optional(),
});
