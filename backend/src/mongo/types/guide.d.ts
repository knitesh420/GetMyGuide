import { Document, Types } from 'mongoose';

export default interface IGuide extends Document {
	_id: Types.ObjectId;
	accountId: Types.ObjectId;
	languages: string[];
	experience: string;
	city: string;
	state: string;
	country: string;
	price: number;
	about: string;
	specialization: string[];
	availableDays: string[];
	availableTime: string;
	profileImage: string;
	identityProofs: string[];
	galleryImages: string[];
	registrationCompleted: boolean;
	paymentStatus: 'pending' | 'success' | 'failed';
	isVisible: boolean;
	membershipStartDate: Date | null;
	membershipExpiryDate: Date | null;
	createdAt: Date;
	updatedAt: Date;
}
