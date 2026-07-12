import mongoose from 'mongoose';
import IRefundRequest from '../types/refundRequest';
import { nextCode } from '../utils/businessId';

const RefundRequestSchema = new mongoose.Schema<IRefundRequest>(
	{
		booking: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Booking',
			required: true,
		},
		requestedBy: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Account',
			required: true,
		},
		requesterRole: {
			type: String,
			enum: ['tourist', 'guide', 'admin'],
			required: true,
		},
		reason: {
			type: String,
			required: true,
			trim: true,
			maxlength: 2000,
		},
		status: {
			type: String,
			enum: ['pending', 'processed', 'rejected', 'failed'],
			default: 'pending',
		},
		amountPaid: {
			type: Number,
			required: true,
			min: 0,
		},
		approvedAmount: {
			type: Number,
			min: 0,
		},
		adminNote: {
			type: String,
			trim: true,
			maxlength: 2000,
		},
		// One leg per payment being refunded — a booking may have been paid as an
		// advance plus a balance, and Razorpay refunds are per-payment.
		refunds: {
			type: [
				{
					transaction: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' },
					razorpay_payment_id: { type: String, trim: true },
					razorpay_refund_id: { type: String, trim: true },
					amount: { type: Number, min: 0 },
					status: {
						type: String,
						enum: ['pending', 'processed', 'failed'],
						default: 'pending',
					},
					failureReason: { type: String, trim: true, maxlength: 2000 },
					_id: false,
				},
			],
			default: [],
		},
		processedBy: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Account',
		},
		processedAt: {
			type: Date,
		},
		refundCode: {
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

// A booking can only ever have one refund request awaiting a decision. This is
// what stops a tourist flooding the admin queue with duplicate cancellations —
// a database guarantee, not a check-then-write race in the service.
RefundRequestSchema.index(
	{ booking: 1 },
	{ unique: true, partialFilterExpression: { status: 'pending' } }
);
RefundRequestSchema.index({ status: 1, createdAt: -1 });
RefundRequestSchema.index({ requestedBy: 1, createdAt: -1 });

RefundRequestSchema.pre('validate', async function () {
	if (this.isNew && !this.refundCode) {
		this.refundCode = await nextCode('refund');
	}
});

const RefundRequestDB = mongoose.model<IRefundRequest>('RefundRequest', RefundRequestSchema);

export default RefundRequestDB;
