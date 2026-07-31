import { z } from 'zod';

/**
 * Zod schemas for the refund module.
 *
 * Extracted from refund.validator.ts so the Express middleware and the native
 * Route Handlers share one definition. Rules and messages unchanged.
 */

export const refundRequestSchema = z.object({
	bookingId: z.string().trim().min(1, 'bookingId is required'),
	reason: z.string().trim().min(5, 'Please give a reason of at least 5 characters').max(2000),
});

export const refundApproveSchema = z.object({
	// 0 is legitimate: cancel the booking, refund nothing. `.min(0)` rather than
	// `.positive()` is therefore deliberate — do not "tighten" it.
	approvedAmount: z.coerce.number().min(0, 'Refund amount cannot be negative'),
	adminNote: z.string().trim().max(2000).optional(),
});

export const refundRejectSchema = z.object({
	// The tourist is shown this, so it has to actually say something.
	adminNote: z.string().trim().min(5, 'Tell the tourist why the request was declined').max(2000),
});

export const refundListQuerySchema = z.object({
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().positive().max(100).default(20),
	status: z.enum(['pending', 'processed', 'rejected', 'failed']).optional(),
});
