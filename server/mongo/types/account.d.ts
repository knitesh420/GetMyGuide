import { Document, Types } from 'mongoose';

export default interface IAccount extends Document {
	_id: Types.ObjectId;
	name: string;
	email: string;
	phone: string;
	countryCode?: string;
	password: string;
	role: 'tourist' | 'guide' | 'admin';
	isActive: boolean;
	status: 'non_verified' | 'verified';
	emailVerified: boolean;
	paymentStatus: 'pending' | 'success' | 'failed' | 'na';
	unavailableDates: Date[];
	tokenVersion: number;
	deletedAt?: Date | null;
	createdAt: Date;
	updatedAt: Date;

	verifyPassword(password: string): Promise<boolean>;
}
