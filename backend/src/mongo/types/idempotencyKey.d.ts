import { Document, Types } from 'mongoose';

export default interface IIdempotencyKey extends Document {
	_id: Types.ObjectId;
	key: string;
	endpoint: string;
	requestHash: string;
	response: {
		statusCode: number;
		body: any;
	};
	createdAt: Date;
	updatedAt: Date;
}
