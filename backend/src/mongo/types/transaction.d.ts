import { Document, Types } from 'mongoose';

export type TransactionStatus = 'pending' | 'paid' | 'success' | 'failed' | 'refunded' | 'pending_verification';
export type TransactionType = 'guide' | 'tourist';

/** Razorpay's verdict on a failed payment, as delivered by `payment.failed`. */
export interface ITransactionFailure {
	code?: string;
	description?: string;
	source?: string;
	step?: string;
	reason?: string;
	method?: string;
	at?: Date;
}

/** Contact details snapshotted when the order was created. */
export interface ITransactionCustomer {
	name?: string;
	email?: string;
	phone?: string;
}

export default interface ITransaction extends Document {
	_id: Types.ObjectId;
	reference_id: string; // Generic reference ID (e.g., enrollment_id, booking_id, etc.)
	reference_type: string; // Type of reference (e.g., 'enrollment', 'booking', etc.)
	/**
	 * The account this payment attempt belongs to. Null for guest bookings and
	 * for rows written before the field existed — never assume it is set.
	 */
	account?: Types.ObjectId | null;
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
	 * Who was paying. Absent on rows written before this field existed, and the
	 * only trace of the customer when a booking order fails before any Booking
	 * document is written.
	 */
	customer?: ITransactionCustomer;
	/** Why the payment failed. Present only when status is 'failed'. */
	failure?: ITransactionFailure;
	/**
	 * Server-held snapshot of what this order was actually quoted for. Written at
	 * order-creation time and read back at verify, so the parameters of a booking
	 * cannot be swapped between paying and redeeming.
	 */
	metadata?: Record<string, unknown>;
	/**
	 * Set once a guide-membership payment has had its 30-day window applied. The
	 * atomic null→date flip is what serialises the browser confirm path against
	 * the Razorpay webhook so the window, invoice and history row are applied
	 * exactly once. Null/absent on every non-membership transaction.
	 */
	membershipAppliedAt?: Date | null;
	createdAt: Date;
	updatedAt: Date;
}
