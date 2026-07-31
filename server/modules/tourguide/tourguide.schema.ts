import { z } from 'zod';

/**
 * Zod schemas for the tourguide module.
 *
 * Only `paymentVerifySchema` is extracted so far, because it is the one the
 * booking module borrows: `POST /booking/:id/balance/verify` mounts tourguide's
 * `PaymentVerifyValidator` directly. Both flows settle an advance the same way,
 * so they must reject the same payloads with the same message.
 *
 * The rest of tourguide.validator.ts stays inline until that module is ported;
 * moving it early would be churn with nothing sharing it.
 */

export const paymentVerifySchema = z.object({
	razorpay_order_id: z.string().trim().min(1),
	razorpay_payment_id: z.string().trim().min(1),
	razorpay_signature: z.string().trim().min(1),
});
