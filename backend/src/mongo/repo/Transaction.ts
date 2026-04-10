import mongoose from 'mongoose';
import ITransaction from '../types/transaction';

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
		},
		currency: {
			type: String,
			required: true,
			trim: true,
			default: 'INR',
		},
	},
	{
		timestamps: true,
	}
);

const TransactionDB = mongoose.model<ITransaction>('Transaction', TransactionSchema);

export default TransactionDB;
