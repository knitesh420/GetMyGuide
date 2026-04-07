import { Document, Types } from 'mongoose';

export default interface IBlog extends Document {
	_id: Types.ObjectId;
	videoId: string;
	description: string;
	hasImage: boolean;
	imageFilename?: string;
	createdAt: Date;
	updatedAt: Date;
}
