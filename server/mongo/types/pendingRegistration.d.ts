import { Document } from 'mongoose';

export default interface IPendingRegistration extends Document {
	name: string;
	email: string;
	phone: string;
	countryCode: string;
	passwordHash: string;
	accountType: 'tourist' | 'guide';
	otpHash: string;
	otpExpiresAt: Date;
	attempts: number;
	lastSentAt: Date;
	expireAt: Date;
	createdAt: Date;
	updatedAt: Date;
}
