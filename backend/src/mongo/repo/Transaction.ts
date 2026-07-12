import mongoose from 'mongoose';
import ITransaction from '../types/transaction';
import { nextCode } from '../utils/businessId';

const TransactionSchema = new mongoose.Schema<ITransaction>(
	{
		reference_id: {
			type: String,
			required: true,
			trim: true,
		},
		reference_type: {
			type: String,
			required: true,
			trim: true,
		},
		razorpay_order_id: {
			type: String,
			required: true,
			trim: true,
		},
		razorpay_customer_id: {
			type: String,
			required: true,
			trim: true,
		},
		razorpay_payment_id: {
			type: String,
			trim: true,
		},
		type: {
			type: String,
			enum: ['guide', 'tourist'],
			required: true,
			trim: true,
		},
		transaction_id: {
			type: String,
			required: true,
			trim: true,
			unique: true,
		},
		status: {
			type: String,
			enum: ['pending', 'paid', 'success', 'failed', 'refunded', 'pending_verification'],
			required: true,
			trim: true,
			default: 'pending',
		},
		amount: {
			type: Number,
			required: true,
			min: 0,
		},
		currency: {
			type: String,
			required: true,
			trim: true,
			default: 'INR',
		},
		// Human-facing payment ID, e.g. "PM000001". Sparse for backward compat.
		paymentCode: {
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

// The webhook handler resolves a transaction by these under Razorpay's retry
// pressure — previously unindexed.
TransactionSchema.index({ razorpay_order_id: 1 });
TransactionSchema.index({ razorpay_payment_id: 1 });
TransactionSchema.index({ reference_type: 1, reference_id: 1 });
TransactionSchema.index({ status: 1, createdAt: -1 });

// Transaction is created via .create(), so the document validate hook fires.
TransactionSchema.pre('validate', async function () {
	if (this.isNew && !this.paymentCode) {
		this.paymentCode = await nextCode('payment');
	}
});

const TransactionDB = mongoose.model<ITransaction>('Transaction', TransactionSchema);

export default TransactionDB;
