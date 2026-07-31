/**
 * The Razorpay verify payload, shared by the three booking verify endpoints and
 * by both implementations of each.
 *
 * These three routes (`/verify-guest-booking`, `/verify-booking`,
 * `/package/verify`) are the only ones in the module with NO validator
 * middleware — the controller checks the four fields by hand and answers
 * `{ success: false, message }` directly, bypassing `Respond()`. That reply
 * shape is what the checkout page reads, so it is reproduced verbatim rather
 * than upgraded to the standard error envelope; see `respondJson()` in
 * `server/http/respond.ts` for why the envelope cannot be used here.
 *
 * Extracted so the Express controller and the native handlers cannot drift on
 * which payloads they accept — the check is falsy-based, not
 * presence-based, so an empty-string signature is a 400 rather than a
 * signature-verification failure further in.
 */

export type RazorpayVerifyPayload = {
	razorpay_order_id: string;
	razorpay_payment_id: string;
	razorpay_signature: string;
	booking_data: string;
};

export const MISSING_PAYMENT_DETAILS = 'Missing required payment details';

/**
 * Pull the four fields off a request body, or return undefined if any is
 * missing or empty.
 *
 * Values are passed through exactly as received rather than parsed or coerced:
 * Express typed `req.body` as `any`, so a truthy non-string reached the service
 * unchanged, and narrowing that here would reject payloads production accepts.
 */
export function readVerifyPayload(body: unknown): RazorpayVerifyPayload | undefined {
	if (body === null || typeof body !== 'object') return undefined;

	const { razorpay_order_id, razorpay_payment_id, razorpay_signature, booking_data } =
		body as Record<string, string>;

	if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !booking_data) {
		return undefined;
	}

	return { razorpay_order_id, razorpay_payment_id, razorpay_signature, booking_data };
}
