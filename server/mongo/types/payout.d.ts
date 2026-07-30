import { Document, Types } from 'mongoose';

export type PayoutMethod = 'bank_transfer' | 'upi' | 'cash' | 'other';

export default interface IPayout extends Document {
	_id: Types.ObjectId;
	guide: Types.ObjectId;
	/** The earnings this payout settles. Each is flipped to 'paid'. */
	earnings: Types.ObjectId[];
	/** Sum of the settled earnings' netAmount, in rupees. */
	amount: number;
	method: PayoutMethod;
	/** Bank UTR / UPI txn id / cheque no — whatever proves the money moved. */
	reference: string;
	note?: string;
	/** Snapshot of where it was sent, so a later bank-detail edit doesn't rewrite the record. */
	paidTo?: {
		accountHolderName?: string;
		accountNumberLast4?: string;
		ifsc?: string;
		upiId?: string;
	};
	paidBy: Types.ObjectId;
	paidAt: Date;
	payoutCode?: string;
	createdAt: Date;
	updatedAt: Date;
}
