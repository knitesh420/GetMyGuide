import { Document, Types } from 'mongoose';

/** Who physically handed the cash over. */
export type CashPaymentPaidBy = 'tourist' | 'admin';

/**
 * 'received' is the only state a live record has; 'voided' is what a soft-delete
 * leaves behind. Kept as a status rather than a boolean so the admin table can
 * show voided rows without a second flag.
 */
export type CashPaymentStatus = 'received' | 'voided';

/**
 * A cash payment an admin recorded by hand — money that never went through
 * Razorpay, so no Transaction exists for it.
 *
 * This collection is deliberately separate from `transactions`: online payments
 * and manual cash records must coexist without either overwriting the other, and
 * a Transaction cannot be created without a Razorpay order id.
 */
export default interface ICashPayment extends Document {
	_id: Types.ObjectId;
	/** The guide's *Account* id — same convention as Payout.guide and Earning.guide. */
	guide: Types.ObjectId;
	/** Rupees. */
	amount: number;
	paymentDate: Date;
	/** Only cash is recordable by hand today; the enum leaves room without a migration. */
	method: 'cash';
	paidBy: CashPaymentPaidBy;
	/** Optional free-text identification of the payer / trip. */
	touristName?: string;
	bookingReference?: string;
	remarks?: string;
	status: CashPaymentStatus;

	// ---- Audit trail --------------------------------------------------------
	/** The admin account this payment is attributed to (auto-filled from the caller). */
	recordedBy: Types.ObjectId;
	createdBy: Types.ObjectId;
	updatedBy?: Types.ObjectId | null;
	deletedBy?: Types.ObjectId | null;
	/** Soft delete. Set together with status='voided'; the row is never removed. */
	deletedAt?: Date | null;
	voidReason?: string;

	cashPaymentCode?: string;
	createdAt: Date;
	updatedAt: Date;
}
