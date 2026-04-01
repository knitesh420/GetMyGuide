import { Document, Types } from 'mongoose';

export default interface IPackage extends Document {
	_id: Types.ObjectId;
	title: string;
	city: string;
	places: string[];
	images: string[];
	shortDescription?: string;
	description?: string;
	price?: number;
	numberOfPeople?: number;
	numberOfDays?: number;
	inclusions?: string[];
	exclusions?: string[];
	featured?: boolean;
	status?: 'inactive' | 'active';
	createdAt: Date;
	updatedAt: Date;
}
