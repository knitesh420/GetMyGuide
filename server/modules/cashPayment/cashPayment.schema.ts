import { z } from 'zod';

/**
 * Zod schemas for the cashPayment module.
 *
 * Extracted from cashPayment.validator.ts so the Express middleware and the
 * native Route Handlers share one definition.
 *
 * Note what is NOT accepted by the create schema: `recordedBy`, `createdBy`,
 * `status`. The recording admin is taken from the session, never from the body —
 * a client that could name the recorder could forge the audit trail.
 */

export const PAID_BY = ['tourist', 'admin'] as const;

export const cashPaymentCreateSchema = z.object({
	guideId: z.string().trim().min(1, 'Select a guide'),
	amount: z.coerce.number().positive('Enter the amount received'),
	// Cash is recorded after the fact, so the date is nearly always in the past.
	// A future date is a typo, not an intent.
	paymentDate: z.coerce
		.date({ message: 'Enter a valid payment date' })
		.refine((date) => date.getTime() <= Date.now(), {
			message: 'The payment date cannot be in the future',
		}),
	paidBy: z.enum(PAID_BY, { message: 'Say whether the tourist or the admin paid' }),
	touristName: z.string().trim().max(200).optional(),
	bookingReference: z.string().trim().max(200).optional(),
	remarks: z.string().trim().max(2000).optional(),
});

export const cashPaymentUpdateSchema = z
	.object({
		amount: z.coerce.number().positive('Enter the amount received').optional(),
		paymentDate: z.coerce
			.date({ message: 'Enter a valid payment date' })
			.refine((date) => date.getTime() <= Date.now(), {
				message: 'The payment date cannot be in the future',
			})
			.optional(),
		paidBy: z.enum(PAID_BY).optional(),
		touristName: z.string().trim().max(200).optional(),
		bookingReference: z.string().trim().max(200).optional(),
		remarks: z.string().trim().max(2000).optional(),
	})
	// .strict() so an attempt to smuggle in `status` or `recordedBy` is a 400
	// rather than a silently ignored field.
	.strict()
	.refine((data) => Object.keys(data).length > 0, {
		message: 'Provide at least one field to update',
	});

export const cashPaymentVoidSchema = z.object({
	reason: z.string().trim().max(2000).optional(),
});

export const cashPaymentListQuerySchema = z.object({
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().positive().max(100).default(20),
	guideId: z.string().trim().optional(),
	status: z.enum(['received', 'voided']).optional(),
});
