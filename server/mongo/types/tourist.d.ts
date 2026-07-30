import { Document, Types } from 'mongoose';

export default interface ITourist extends Document {
	_id: Types.ObjectId;
	accountId: Types.ObjectId;
	nationality: string;
	preferredLanguages: string[];
	travelInterests: string[];
	budget: string;
	travelDates: {
		startDate: Date | null;
		endDate: Date | null;
	};
	numberOfTravelers: number;
	about: string;
	paymentStatus: 'pending' | 'success' | 'failed' | 'na';
	registrationCompleted: boolean;
	touristCode?: string;
	createdAt: Date;
	updatedAt: Date;
}
