import { Document, Types } from 'mongoose';

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
	createdAt: Date;
	updatedAt: Date;
}
