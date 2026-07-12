import { Document, Types } from 'mongoose';

/**
 * pending   — tourist (or guide) asked to cancel; awaiting an admin decision.
 * processed — admin approved and every refund leg was accepted by Razorpay
 *             (or the approved amount was zero, i.e. cancel with no money back).
 * rejected  — admin refused; the booking is left exactly as it was.
 * failed    — admin approved but at least one Razorpay refund call errored.
 *             The booking is still cancelled; the money leg is retryable.
 */
export type RefundRequestStatus = 'pending' | 'processed' | 'rejected' | 'failed';

export type RefundRequesterRole = 'tourist' | 'guide' | 'admin';

/** One leg of the refund — a booking may have been paid in an advance + a balance. */
export interface RefundLeg {
	transaction: Types.ObjectId;
	razorpay_payment_id: string;
	razorpay_refund_id?: string;
	amount: number;
	status: 'pending' | 'processed' | 'failed';
	failureReason?: string;
}

export default interface IRefundRequest extends Document {
	_id: Types.ObjectId;
	booking: Types.ObjectId;
	requestedBy: Types.ObjectId;
	requesterRole: RefundRequesterRole;
	reason: string;
	status: RefundRequestStatus;
	/** What the tourist had actually paid when they asked. Snapshot, in rupees. */
	amountPaid: number;
	/** What the admin decided to give back. Set on approve; 0 = cancel, no refund. */
	approvedAmount?: number;
	adminNote?: string;
	refunds: RefundLeg[];
	processedBy?: Types.ObjectId;
	processedAt?: Date;
	refundCode?: string;
	createdAt: Date;
	updatedAt: Date;
}
