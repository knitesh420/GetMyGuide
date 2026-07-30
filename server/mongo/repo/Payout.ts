import mongoose from 'mongoose';
import IPayout from '../types/payout';
import { nextCode } from '../utils/businessId';

const PayoutSchema = new mongoose.Schema<IPayout>(
	{
		guide: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Account',
			required: true,
		},
		earnings: {
			type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Earning' }],
			default: [],
		},
		amount: {
			type: Number,
			required: true,
			min: 0,
		},
		method: {
			type: String,
			enum: ['bank_transfer', 'upi', 'cash', 'other'],
			required: true,
		},
		reference: {
			type: String,
			required: true,
			trim: true,
			maxlength: 200,
		},
		note: {
			type: String,
			trim: true,
			maxlength: 2000,
		},
		// Snapshot, not a live ref: if the guide edits their bank details later,
		// the record of where the money actually went must not change.
		paidTo: {
			accountHolderName: { type: String, trim: true },
			accountNumberLast4: { type: String, trim: true },
			ifsc: { type: String, trim: true },
			upiId: { type: String, trim: true },
		},
		paidBy: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Account',
			required: true,
		},
		paidAt: {
			type: Date,
			default: Date.now,
		},
		payoutCode: {
			type: String,
			unique: true,
			sparse: true,
			trim: true,
		},
	},
	{
		timestamps: true,
	}
);

PayoutSchema.index({ guide: 1, paidAt: -1 });

PayoutSchema.pre('validate', async function () {
	if (this.isNew && !this.payoutCode) {
		this.payoutCode = await nextCode('payout');
	}
});

const PayoutDB = mongoose.model<IPayout>('Payout', PayoutSchema);

export default PayoutDB;
