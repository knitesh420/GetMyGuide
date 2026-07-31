import { z } from 'zod';

/**
 * Zod schemas for the tourguide module.
 *
 * Extracted from tourguide.validator.ts so the Express middleware and the native
 * Route Handlers in `app/api/tourguide/` share one definition. Rules and
 * messages are unchanged — a second copy would drift, and a drifted validator
 * surfaces as a rejected request rather than a failing test.
 *
 * `paymentVerifySchema` was pulled out ahead of the rest during Phase 3.8,
 * because the booking module borrows it: `POST /booking/:id/balance/verify`
 * mounts tourguide's `PaymentVerifyValidator` directly. Both flows settle an
 * advance the same way, so they must reject the same payloads with the same
 * message.
 */

/**
 * Note there is deliberately no `totalPrice` here. The price is derived from the
 * guide's published rate on the server; accepting it from the client would let a
 * tourist name their own price.
 */
export const createOrderSchema = z.object({
	guideId: z.string().trim().min(1, 'guideId is required'),
	location: z.string().trim().min(1, 'location is required').max(200),
	language: z.string().trim().max(100).optional().default(''),
	startDate: z.coerce.date(),
	endDate: z.coerce.date(),
	numberOfTravelers: z.coerce.number().int().positive().max(100).default(1),
});

export const quoteSchema = z.object({
	guideId: z.string().trim().min(1, 'guideId is required'),
	startDate: z.coerce.date(),
	endDate: z.coerce.date(),
});

/**
 * The advance-payment verify payload. Unlike `paymentVerifySchema` below it also
 * carries `booking_data` — the base64 terms blob handed to the browser at order
 * creation, kept for orders opened before those terms were snapshotted onto the
 * transaction.
 */
export const verifyAndCreateSchema = z.object({
	razorpay_order_id: z.string().trim().min(1),
	razorpay_payment_id: z.string().trim().min(1),
	razorpay_signature: z.string().trim().min(1),
	booking_data: z.string().trim().min(1),
});

export const paymentVerifySchema = z.object({
	razorpay_order_id: z.string().trim().min(1),
	razorpay_payment_id: z.string().trim().min(1),
	razorpay_signature: z.string().trim().min(1),
});

export const statusSchema = z.object({
	status: z.enum(['Upcoming', 'Completed']),
});

export const cancelSchema = z.object({
	reason: z.string().trim().min(5, 'Please give a reason of at least 5 characters').max(2000),
});

export const reassignSchema = z.object({
	newGuideId: z.string().trim().min(1, 'newGuideId is required'),
});

export const listQuerySchema = z.object({
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().positive().max(100).default(20),
});
