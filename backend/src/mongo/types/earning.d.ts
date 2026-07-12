import { Document, Types } from 'mongoose';

/**
 * pending  — trip completed, but inside the hold window (money not yet payable).
 * payable  — clear of the hold window; will appear in the admin payout queue.
 * paid     — included in a Payout the admin has recorded as settled.
 * reversed — the booking was refunded after completion; the earning is void.
 */
export type EarningStatus = 'pending' | 'payable' | 'paid' | 'reversed';

export default interface IEarning extends Document {
	_id: Types.ObjectId;
	guide: Types.ObjectId;
	booking: Types.ObjectId;
	/** One earning per trip — the unique index is what makes accrual idempotent. */
	trip: Types.ObjectId;
	/** Booking price the commission was computed from, in rupees. */
	grossAmount: number;
	/** Percentage the platform keeps, snapshotted so later rate changes don't rewrite history. */
	commissionRate: number;
	commissionAmount: number;
	/** grossAmount - commissionAmount. What the guide is owed. */
	netAmount: number;
	status: EarningStatus;
	/** When the earning leaves the hold window and becomes payable. */
	payableAt: Date;
	payout?: Types.ObjectId;
	earningCode?: string;
	createdAt: Date;
	updatedAt: Date;
}
