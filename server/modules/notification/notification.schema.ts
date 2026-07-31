import { z } from 'zod';

/**
 * Zod schemas for the notification module.
 *
 * Extracted from notification.validator.ts so the Express middleware and the
 * native Route Handlers share one definition. Rules and messages unchanged.
 */

/**
 * `unreadOnly` is preprocessed rather than coerced. `z.coerce.boolean()` reads
 * the string "false" as true, which would make the bell icon's unread filter
 * silently return everything the moment the client sent the flag explicitly.
 */
export const notificationListQuerySchema = z.object({
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().positive().max(100).default(20),
	unreadOnly: z.preprocess((val) => val === 'true' || val === true, z.boolean()).default(false),
});

export const notificationAdminListQuerySchema = z.object({
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().positive().max(100).default(20),
	type: z.string().trim().optional(),
	recipient: z.string().trim().optional(),
});
