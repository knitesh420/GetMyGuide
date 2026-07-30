import mongoose from 'mongoose';
import ITransaction from '../types/transaction';
import { nextCode } from '../utils/businessId';

/**
 * Why the payment did not go through, lifted straight from Razorpay's
 * `payment.failed` payload. Without this the transaction records *that* it
 * failed and nothing about why — which is the one thing support needs in order
 * to answer "my card was declined, what now?".
 *
 * Declared as a Schema (not a bare object literal) so an unset failure stays
 * `undefined` instead of materialising as a phantom `{}` on every transaction.
 */
const PaymentFailureSchema = new mongoose.Schema(
	{
		code: { type: String, trim: true },
		description: { type: String, trim: true, maxlength: 2000 },
		source: { type: String, trim: true },
		step: { type: String, trim: true },
		reason: { type: String, trim: true },
		method: { type: String, trim: true },
		at: { type: Date },
	},
	{ _id: false }
);

/**
 * Who was trying to pay. Booking orders create no DB row until payment
 * succeeds — `reference_id` is a throwaway token at that point — so for a
 * failed booking this snapshot is the only record of the customer anywhere in
 * the system. Same Schema-not-literal reason as above.
 */
const TransactionCustomerSchema = new mongoose.Schema(
	{
		name: { type: String, trim: true },
		email: { type: String, trim: true, lowercase: true },
		phone: { type: String, trim: true },
	},
	{ _id: false }
);

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
		// Who this payment attempt belongs to. `reference_id` cannot answer that:
		// for a booking it is a throwaway token before payment and a Booking id
		// after, so nothing tied a failed attempt back to the person who made it.
		// This is what puts a declined payment on the payer's own dashboard.
		//
		// Optional: guest bookings have no account, and rows written before this
		// field existed have none either.
		account: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Account',
			default: null,
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
		// Contact details captured at order creation. Absent on rows written
		// before this field existed — readers must treat it as optional.
		customer: {
			type: TransactionCustomerSchema,
			default: undefined,
		},
		// Populated only by the payment.failed webhook. Its presence is what
		// distinguishes "the gateway declined this" from "nobody ever paid".
		failure: {
			type: PaymentFailureSchema,
			default: undefined,
		},
		// What this order was quoted for, captured server-side at creation. The
		// client also carries a copy through Razorpay, but that copy is only ever
		// a hint — this is the authoritative record, so the guide/dates/party size
		// cannot be substituted between paying and redeeming.
		metadata: {
			type: mongoose.Schema.Types.Mixed,
		},
		// Single-application guard for guide-membership finalization. The browser
		// confirm path (GuideService.confirmMembershipPayment) and the Razorpay
		// webhook (services/payment.ts) both finalize the same membership payment;
		// the caller that atomically flips this from null→now is the only one that
		// opens the 30-day window, appends a membershipHistory row and cuts an
		// invoice. Without it a webhook/browser race extended membership by 60 days
		// and duplicated the history entry and invoice. Only meaningful for
		// reference_type === 'guide_membership'; null on every other transaction.
		membershipAppliedAt: {
			type: Date,
			default: null,
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
// Drives the "your payment didn't go through" panel on the tourist and guide
// dashboards, which reads one account's unsuccessful attempts newest-first.
TransactionSchema.index({ account: 1, status: 1, createdAt: -1 });

// Transaction is created via .create(), so the document validate hook fires.
TransactionSchema.pre('validate', async function () {
	if (this.isNew && !this.paymentCode) {
		this.paymentCode = await nextCode('payment');
	}
});

const TransactionDB = mongoose.model<ITransaction>('Transaction', TransactionSchema);

export default TransactionDB;
