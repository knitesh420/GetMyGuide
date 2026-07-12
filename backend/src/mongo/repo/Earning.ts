import mongoose from 'mongoose';
import IEarning from '../types/earning';
import { nextCode } from '../utils/businessId';

const EarningSchema = new mongoose.Schema<IEarning>(
	{
		guide: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Account',
			required: true,
		},
		booking: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Booking',
			required: true,
		},
		// Unique: one trip accrues exactly one earning. Accrual is fired from
		// TripService.complete, so this index is what makes a double-complete
		// (or a retry) idempotent rather than paying the guide twice.
		trip: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Trip',
			required: true,
			unique: true,
		},
		grossAmount: {
			type: Number,
			required: true,
			min: 0,
		},
		commissionRate: {
			type: Number,
			required: true,
			min: 0,
			max: 100,
		},
		commissionAmount: {
			type: Number,
			required: true,
			min: 0,
		},
		netAmount: {
			type: Number,
			required: true,
			min: 0,
		},
		status: {
			type: String,
			enum: ['pending', 'payable', 'paid', 'reversed'],
			default: 'pending',
		},
		payableAt: {
			type: Date,
			required: true,
		},
		payout: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Payout',
		},
		earningCode: {
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

EarningSchema.index({ guide: 1, status: 1 });
// The payout queue asks "what is clear of the hold window and unpaid?".
EarningSchema.index({ status: 1, payableAt: 1 });

EarningSchema.pre('validate', async function () {
	if (this.isNew && !this.earningCode) {
		this.earningCode = await nextCode('earning');
	}
});

const EarningDB = mongoose.model<IEarning>('Earning', EarningSchema);

export default EarningDB;
