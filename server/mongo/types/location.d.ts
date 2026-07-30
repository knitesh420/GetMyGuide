import { Document, Types } from 'mongoose';

export default interface ILocation extends Document {
	_id: Types.ObjectId;
	name: string;
	slug: string;
	city: string;
	state?: string;
	country: string;
	description?: string;
	image?: string;
	isActive: boolean;
	isPopular: boolean;
	deletedAt?: Date | null;
	createdAt: Date;
	updatedAt: Date;
}
