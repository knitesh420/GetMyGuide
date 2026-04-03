import crypto from 'crypto';
import { RAZORPAY_API_SECRET } from '@config/const';

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

	return expectedSignature === razorpay_signature;
}
