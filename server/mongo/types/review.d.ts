import { Document, Types } from 'mongoose';

export default interface IReview extends Document {
	_id: Types.ObjectId;
	booking: Types.ObjectId;
	guide: Types.ObjectId;
	tourist: Types.ObjectId;
	rating: number;
	comment?: string;
	isHidden: boolean;
	moderatedBy?: Types.ObjectId;
	moderatedAt?: Date;
	createdAt: Date;
	updatedAt: Date;
}
