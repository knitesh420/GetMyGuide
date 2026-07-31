import { z } from 'zod';

/**
 * Zod schemas for the message module.
 *
 * Extracted from message.validator.ts so the Express middleware and the native
 * Route Handlers share one definition. Rules and messages unchanged.
 */

export const messageSendSchema = z.object({
	body: z.string().trim().min(1, 'Message cannot be empty').max(4000),
});

export const messageThreadQuerySchema = z.object({
	// The client's newest known message id — the poll cursor.
	after: z
		.string()
		.trim()
		.regex(/^[a-f\d]{24}$/i, 'after must be a message id')
		.optional(),
	limit: z.coerce.number().int().positive().max(100).default(50),
});

export const messageThreadListQuerySchema = z.object({
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().positive().max(100).default(20),
});
