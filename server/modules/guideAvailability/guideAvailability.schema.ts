import { z } from 'zod';

/**
 * Zod schemas for the guideAvailability module.
 *
 * Extracted from guideAvailability.validator.ts so the Express middleware and
 * the native Route Handlers share one definition. Rules and messages unchanged.
 *
 * Dates are validated as non-empty STRINGS, not as `z.coerce.date()`. The
 * service does its own `new Date(...)` and day-boundary rounding
 * (`startOfDay`/`endOfDay`), so parsing here would change what reaches it —
 * and a caller sending "2026-12-01" would arrive as a UTC midnight Date rather
 * than the string the service expects.
 */

export const createLeaveSchema = z.object({
	type: z.enum(['vacation', 'emergency'], { message: 'Type must be vacation or emergency' }),
	startDate: z.string().trim().min(1, 'Start date is required'),
	endDate: z.string().trim().min(1, 'End date is required'),
	reason: z.string().trim().optional(),
});

export const guidesAvailabilityQuerySchema = z.object({
	startDate: z.string().trim().min(1, 'Start date is required'),
	// Omitted means "just that one day" — the controller falls back to startDate.
	endDate: z.string().trim().optional(),
});
