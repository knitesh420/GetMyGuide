import mongoose from 'mongoose';
import IGuide from '../types/guide';
import { nextCode } from '../utils/businessId';

const GuideSchema = new mongoose.Schema<IGuide>(
	{
		accountId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Account',
			required: true,
			unique: true,
		},
		languages: {
			type: [String],
			default: [],
		},
		// 'escort' is what `isCertified` keys off. Deliberately has no default:
		// rows written before this field existed must hydrate as `undefined` so
		// an un-backfilled guide stays distinguishable from one who genuinely
		// chose 'normal'. Reads apply 'normal' as the display fallback.
		type: {
			type: String,
			enum: ['normal', 'escort'],
		},
		city: {
			type: String,
			default: '',
			trim: true,
		},
		// Collected for escort guides only.
		pan: {
			type: String,
			trim: true,
		},
		profileImage: {
			type: String,
			default: '',
		},
		// Licence and Aadhaar uploads land here, in that order (legacy positional
		// store, still indexed by the admin download route). Kept as-is.
		identityProofs: {
			type: [String],
			default: [],
		},
		// Individually-editable identity documents managed from the guide profile
		// after registration. Additive to `identityProofs` — each key can be
		// replaced or deleted without disturbing the other. No default object, so
		// an untouched guide is not carrying two empty phantom sub-docs.
		identityDocuments: {
			aadhaar: {
				url: { type: String, trim: true },
				storage: { type: String, enum: ['remote', 'local'] },
				mimeType: { type: String, trim: true },
				originalName: { type: String, trim: true },
				size: { type: Number, min: 0 },
				uploadedAt: { type: Date },
				_id: false,
			},
			guideLicence: {
				url: { type: String, trim: true },
				storage: { type: String, enum: ['remote', 'local'] },
				mimeType: { type: String, trim: true },
				originalName: { type: String, trim: true },
				size: { type: Number, min: 0 },
				uploadedAt: { type: Date },
				_id: false,
			},
			_id: false,
		},
		registrationCompleted: {
			type: Boolean,
			default: false,
		},
		paymentStatus: {
			type: String,
			enum: ['pending', 'success', 'failed'],
			default: 'pending',
		},
		isVisible: {
			type: Boolean,
			default: false,
		},
		membershipStartDate: {
			type: Date,
			default: null,
		},
		membershipExpiryDate: {
			type: Date,
			default: null,
		},
		// Human-facing business ID, e.g. "GU000001". Sparse for backward compat.
		guideCode: {
			type: String,
			unique: true,
			sparse: true,
			trim: true,
		},
		// Append-only record of each membership period. The current-window fields
		// above stay the fast path; services push a row here on every renewal.
		membershipHistory: {
			type: [
				{
					plan: { type: String, trim: true },
					startDate: { type: Date },
					expiryDate: { type: Date },
					transaction: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' },
					_id: false,
				},
			],
			default: [],
		},
		// Admin KYC review. No default, for the same reason as `type` above: rows
		// written before the review flow existed must stay distinguishable from a
		// guide an admin has actually looked at. Reads treat absent as 'pending'.
		approvalStatus: {
			type: String,
			enum: ['pending', 'approved', 'rejected'],
		},
		approvedBy: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Account',
			default: null,
		},
		approvedAt: {
			type: Date,
			default: null,
		},
		rejectionReason: {
			type: String,
			trim: true,
			maxlength: 2000,
		},
		// Paid, but the 30-day clock has not started: the guide is still waiting on
		// KYC review. approveGuide() opens the window from the approval instant.
		// No default — rows written before this flow existed must stay
		// distinguishable, since their clock was (correctly, at the time) started
		// at payment and must not be restarted.
		membershipPendingActivation: {
			type: Boolean,
		},
		// When the fee was captured. membershipStartDate is when the window opened;
		// under the approval-gated flow those are no longer the same instant.
		membershipPaidAt: {
			type: Date,
			default: null,
		},
		// Written only by the auto-refund on rejection. Its presence is what stops
		// a second rejection from refunding the same payment twice.
		membershipRefund: {
			status: { type: String, enum: ['processed', 'failed'] },
			refundId: { type: String, trim: true },
			amount: { type: Number, min: 0 },
			refundedAt: { type: Date },
			failureReason: { type: String, trim: true, maxlength: 2000 },
			transaction: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' },
			razorpay_payment_id: { type: String, trim: true },
			initiatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Account' },
		},
		// Internal admin notes. Never projected onto a public or guide-facing
		// response — see the explicit field lists in services/guide.ts.
		adminNotes: {
			type: String,
			trim: true,
			maxlength: 5000,
		},
		adminNotesUpdatedBy: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Account',
			default: null,
		},
		adminNotesUpdatedAt: {
			type: Date,
			default: null,
		},
		// Published rates. Direct bookings are priced from `fullDay` server-side;
		// absent means the guide is not bookable directly yet.
		pricing: {
			halfDay: { type: Number, min: 0 },
			fullDay: { type: Number, min: 0 },
		},
		// Payout destination for manual settlement. Never returned to anyone but
		// the owning guide and admins — see the projections in the services.
		bankDetails: {
			accountHolderName: { type: String, trim: true },
			accountNumber: { type: String, trim: true },
			ifsc: { type: String, trim: true, uppercase: true },
			upiId: { type: String, trim: true },
		},
		deletedAt: {
			type: Date,
			default: null,
		},
	},
	{
		timestamps: true,
	}
);

// The exact filter the public guide listing runs on every request.
GuideSchema.index({ isVisible: 1, membershipExpiryDate: 1 });
GuideSchema.index({ approvalStatus: 1 });
GuideSchema.index({ membershipExpiryDate: 1 });
GuideSchema.index({ city: 1, isVisible: 1 });

// Guide is created via .create(), so the document validate hook fires.
GuideSchema.pre('validate', async function () {
	if (this.isNew && !this.guideCode) {
		this.guideCode = await nextCode('guide');
	}
});

// Hide soft-deleted guides from every find; { deletedAt: null } matches absent.
GuideSchema.pre(/^find/, function (this: mongoose.Query<unknown, IGuide>) {
	if (this.getFilter().deletedAt === undefined) {
		this.where({ deletedAt: null });
	}
});

const GuideDB = mongoose.model<IGuide>('Guide', GuideSchema);

export default GuideDB;
