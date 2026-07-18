import { Document, Types } from 'mongoose';

export type TransactionStatus = 'pending' | 'paid' | 'success' | 'failed' | 'refunded' | 'pending_verification';
export type TransactionType = 'guide' | 'tourist';

export default interface ITransaction extends Document {
	_id: Types.ObjectId;
	reference_id: string; // Generic reference ID (e.g., enrollment_id, booking_id, etc.)
	reference_type: string; // Type of reference (e.g., 'enrollment', 'booking', etc.)
	type: TransactionType; // Registration type
	razorpay_order_id: string;
	razorpay_customer_id: string;
	razorpay_payment_id?: string; // Filled after payment
	transaction_id: string;
	status: TransactionStatus;
	amount: number;
	currency: string;
	paymentCode?: string;
	/**
	 * Server-held snapshot of what this order was actually quoted for. Written at
	 * order-creation time and read back at verify, so the parameters of a booking
	 * cannot be swapped between paying and redeeming.
	 */
	metadata?: Record<string, unknown>;
	createdAt: Date;
	updatedAt: Date;
}
