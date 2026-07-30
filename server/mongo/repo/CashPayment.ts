import mongoose from 'mongoose';
import ICashPayment from '../types/cashPayment';
import { nextCode } from '../utils/businessId';

const CashPaymentSchema = new mongoose.Schema<ICashPayment>(
	{
		guide: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Account',
			required: true,
		},
		amount: {
			type: Number,
			required: true,
			min: 0,
		},
		paymentDate: {
			type: Date,
			required: true,
		},
		method: {
			type: String,
			enum: ['cash'],
			default: 'cash',
			required: true,
		},
		paidBy: {
			type: String,
			enum: ['tourist', 'admin'],
			required: true,
		},
		touristName: {
			type: String,
			trim: true,
			maxlength: 200,
		},
		bookingReference: {
			type: String,
			trim: true,
			maxlength: 200,
		},
		remarks: {
			type: String,
			trim: true,
			maxlength: 2000,
		},
		status: {
			type: String,
			enum: ['received', 'voided'],
			default: 'received',
			required: true,
		},
		// Audit trail. `recordedBy` is the admin the payment is attributed to;
		// createdBy/updatedBy/deletedBy are who touched the row, which is the same
		// person on creation but need not stay so.
		recordedBy: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Account',
			required: true,
		},
		createdBy: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Account',
			required: true,
		},
		updatedBy: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Account',
			default: null,
		},
		deletedBy: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Account',
			default: null,
		},
		deletedAt: {
			type: Date,
			default: null,
		},
		voidReason: {
			type: String,
			trim: true,
			maxlength: 2000,
		},
		cashPaymentCode: {
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

// The guide's payment history and the admin's per-guide panel both read this.
CashPaymentSchema.index({ guide: 1, paymentDate: -1 });
CashPaymentSchema.index({ status: 1, paymentDate: -1 });

CashPaymentSchema.pre('validate', async function () {
	if (this.isNew && !this.cashPaymentCode) {
		this.cashPaymentCode = await nextCode('cash_payment');
	}
});

// NOTE: unlike Guide, there is deliberately no pre-find hook hiding soft-deleted
// rows. A voided cash payment must stay visible to admins — that is the whole
// point of voiding rather than deleting — so callers filter explicitly instead.
const CashPaymentDB = mongoose.model<ICashPayment>('CashPayment', CashPaymentSchema);

export default CashPaymentDB;
