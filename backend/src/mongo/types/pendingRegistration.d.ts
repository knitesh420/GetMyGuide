import { Document } from 'mongoose';

export interface PendingGuideDraft {
	city: string;
	type: 'normal' | 'escort';
	languages: string[];
	pan?: string;
	profileImage: string;
	identityProofs: string[];
}

export default interface IPendingRegistration extends Document {
	name: string;
	email: string;
	phone: string;
	countryCode: string;
	passwordHash: string;
	accountType: 'tourist' | 'guide';
	guideDraft?: PendingGuideDraft;
	otpHash: string;
	otpExpiresAt: Date;
	attempts: number;
	lastSentAt: Date;
	expireAt: Date;
	status: 'pending' | 'finalizing';
	createdAt: Date;
	updatedAt: Date;
}
