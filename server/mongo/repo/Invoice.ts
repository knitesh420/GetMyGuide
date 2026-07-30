import mongoose from 'mongoose';
import IInvoice from '../types/invoice';

const InvoiceSchema = new mongoose.Schema<IInvoice>(
	{
		invoiceNumber: {
			type: String,
			required: true,
			unique: true,
			trim: true,
		},
		invoiceType: {
			type: String,
			enum: ['booking', 'guide_membership', 'trip_completion'],
			required: true,
		},
		invoiceDate: {
			type: Date,
			required: true,
			default: Date.now,
		},
		paymentDate: {
			type: Date,
			required: true,
		},
		transaction: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Transaction',
			required: true,
		},
		razorpayPaymentId: {
			type: String,
			trim: true,
		},
		razorpayOrderId: {
			type: String,
			trim: true,
		},
		booking: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Booking',
		},
		trip: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Trip',
		},
		guideAccount: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Account',
		},
		touristAccount: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Account',
		},
		customerSnapshot: {
			name: { type: String, required: true },
			email: { type: String, required: true },
			phone: { type: String, required: true },
			country: { type: String, default: '' },
			billingAddress: { type: String },
		},
		guideSnapshot: {
			name: { type: String },
			email: { type: String },
			phone: { type: String },
			membershipPlan: { type: String },
			membershipDurationDays: { type: Number },
		},
		bookingSnapshot: {
			destination: { type: String },
			travelDate: { type: Date },
			touristsCount: { type: Number },
			assignedGuideName: { type: String },
		},
		paymentInfo: {
			method: { type: String },
			amount: { type: Number, required: true },
			tax: { type: Number, default: 0 },
			discount: { type: Number, default: 0 },
			grandTotal: { type: Number, required: true },
			status: {
				type: String,
				enum: ['paid', 'refunded', 'cancelled'],
				default: 'paid',
			},
			currency: { type: String, default: 'INR' },
		},
		companyInfo: {
			name: { type: String, required: true },
			supportEmail: { type: String, required: true },
			supportPhone: { type: String, required: true },
			website: { type: String, required: true },
			address: { type: String, required: true },
			logoUrl: { type: String, default: '' },
		},
		pdfUrl: {
			type: String,
		},
		emailStatus: {
			type: String,
			enum: ['pending', 'sent', 'failed'],
			default: 'pending',
		},
		status: {
			type: String,
			enum: ['paid', 'refunded', 'cancelled'],
			default: 'paid',
		},
		createdBy: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Account',
		},
	},
	{
		timestamps: true,
	}
);

// Idempotency guard — the same payment event can never generate two invoices
// of the same type, even if a hook fires twice (e.g. sync confirm + webhook
// racing on the same transaction). Mirrors Notification's dedupeKey pattern.
InvoiceSchema.index({ invoiceType: 1, transaction: 1 }, { unique: true });
InvoiceSchema.index({ touristAccount: 1, createdAt: -1 });
InvoiceSchema.index({ guideAccount: 1, createdAt: -1 });
InvoiceSchema.index({ status: 1, createdAt: -1 });

const InvoiceDB = mongoose.model<IInvoice>('Invoice', InvoiceSchema);

export default InvoiceDB;
