import { Document, Types } from 'mongoose';

/**
 * KYC review state, set by an admin. Distinct from membership: a guide can have
 * paid and still be unapproved, and vice-versa. Public visibility needs both.
 */
export type GuideApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface GuidePricing {
	/** Half-day engagement rate, in rupees. */
	halfDay: number;
	/** Full-day rate, in rupees. Direct bookings are priced off this. */
	fullDay: number;
}

/** Outcome of the automatic membership refund issued when an admin rejects. */
export type MembershipRefundStatus = 'processed' | 'failed';

export interface GuideMembershipRefund {
	status: MembershipRefundStatus;
	/** Razorpay refund id (rfnd_…). Absent when the gateway call failed. */
	refundId?: string;
	/** Rupees actually sent back. */
	amount: number;
	refundedAt: Date;
	/** Why Razorpay refused, when status is 'failed'. */
	failureReason?: string;
	/** The membership Transaction that was refunded. */
	transaction?: Types.ObjectId;
	razorpay_payment_id?: string;
	/** The admin whose rejection triggered it. */
	initiatedBy?: Types.ObjectId;
}

export default interface IGuide extends Document {
	_id: Types.ObjectId;
	accountId: Types.ObjectId;
	languages: string[];
	/** Absent on Guide records written before this field existed. */
	type?: 'normal' | 'escort';
	city: string;
	/** Escort guides only. */
	pan?: string;
	profileImage: string;
	identityProofs: string[];
	registrationCompleted: boolean;
	paymentStatus: 'pending' | 'success' | 'failed';
	isVisible: boolean;
	membershipStartDate: Date | null;
	membershipExpiryDate: Date | null;
	guideCode?: string;
	membershipHistory?: {
		plan?: string;
		startDate?: Date;
		expiryDate?: Date;
		transaction?: Types.ObjectId;
	}[];

	// ---- Admin KYC review -------------------------------------------------
	/** Rows written before the review flow exist without this; read as 'pending'. */
	approvalStatus?: GuideApprovalStatus;
	approvedBy?: Types.ObjectId | null;
	approvedAt?: Date | null;
	rejectionReason?: string;

	/**
	 * Membership has been paid for but the 30-day clock has NOT started, because
	 * the guide is still awaiting KYC approval. `approveGuide` starts the window
	 * from the moment of approval and clears this. Absent on every row written
	 * before this flow existed — those guides had their clock started at payment,
	 * and are left exactly as they are.
	 */
	membershipPendingActivation?: boolean;
	/** When the membership fee was actually captured. Distinct from membershipStartDate. */
	membershipPaidAt?: Date | null;
	/** Set when a rejection auto-refunded the membership fee. Also the duplicate-refund guard. */
	membershipRefund?: GuideMembershipRefund;

	// ---- Admin-only internal notes -----------------------------------------
	/** Free-text, never returned on any public or guide-facing route. */
	adminNotes?: string;
	adminNotesUpdatedBy?: Types.ObjectId | null;
	adminNotesUpdatedAt?: Date | null;

	// ---- Direct-booking pricing -------------------------------------------
	/** Unset until the guide publishes rates; direct booking is refused without it. */
	pricing?: GuidePricing;

	// ---- Payout destination (manual settlement) ---------------------------
	bankDetails?: {
		accountHolderName?: string;
		accountNumber?: string;
		ifsc?: string;
		upiId?: string;
	};

	deletedAt?: Date | null;
	createdAt: Date;
	updatedAt: Date;
}
