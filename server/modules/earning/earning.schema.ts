import { z } from 'zod';

/**
 * Zod schemas for the earning / payout module.
 *
 * Extracted from earning.validator.ts so the Express middleware and the native
 * Route Handlers share one definition.
 */

export const EARNING_STATUS = ['pending', 'payable', 'paid', 'reversed'] as const;

export const earningListQuerySchema = z.object({
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().positive().max(100).default(20),
	status: z.enum(EARNING_STATUS).optional(),
	guideId: z.string().trim().optional(),
});

export const payoutCreateSchema = z.object({
	guideId: z.string().trim().min(1, 'guideId is required'),
	earningIds: z.array(z.string().trim().min(1)).min(1, 'Select at least one earning'),
	method: z.enum(['bank_transfer', 'upi', 'cash', 'other']),
	// The proof the money actually moved — a UTR, UPI txn id, or cheque no.
	// Required precisely because this endpoint does not move money itself: it
	// closes the ledger against a transfer the admin already made out-of-band,
	// so without a reference there is nothing tying the two together.
	reference: z.string().trim().min(3, 'Enter the transfer reference (UTR / UPI txn id)').max(200),
	note: z.string().trim().max(2000).optional(),
});

export const payoutListQuerySchema = z.object({
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().positive().max(100).default(20),
	guideId: z.string().trim().optional(),
});
