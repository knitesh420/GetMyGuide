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
