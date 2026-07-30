import crypto from 'crypto';
import { RAZORPAY_API_SECRET } from '@config/const';

/**
 * Constant-time comparison of two hex digests.
 *
 * `===` on a signature short-circuits at the first differing byte, which leaks
 * how much of a forged signature was correct. `timingSafeEqual` requires equal
 * lengths, so the length check is done first (and is not itself secret — the
 * digest length is fixed and public).
 */
export function timingSafeCompare(expected: string, actual: string): boolean {
	if (typeof actual !== 'string' || expected.length !== actual.length) {
		return false;
	}
	return crypto.timingSafeEqual(Buffer.from(expected, 'utf8'), Buffer.from(actual, 'utf8'));
}

/**
 * Verify Razorpay payment signature using HMAC SHA256.
 * This MUST be called before saving any data to the database after payment.
 *
 * @param razorpay_order_id - The order ID returned by Razorpay
 * @param razorpay_payment_id - The payment ID returned by Razorpay
 * @param razorpay_signature - The signature returned by Razorpay
 * @returns true if signature is valid, false otherwise
 */
export function verifyRazorpaySignature(
	razorpay_order_id: string,
	razorpay_payment_id: string,
	razorpay_signature: string
): boolean {
	const body = razorpay_order_id + '|' + razorpay_payment_id;

	const expectedSignature = crypto
		.createHmac('sha256', RAZORPAY_API_SECRET)
		.update(body)
		.digest('hex');

	return timingSafeCompare(expectedSignature, razorpay_signature);
}
