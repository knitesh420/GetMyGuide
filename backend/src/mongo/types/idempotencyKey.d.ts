import { Document, Types } from 'mongoose';

export default interface IIdempotencyKey extends Document {
	_id: Types.ObjectId;
	key: string;
	endpoint: string;
	requestHash: string;
	/** Filled once the original request replies; absent while it is in flight. */
	response?: {
		statusCode: number;
		body: any;
	};
	createdAt: Date;
	updatedAt: Date;
}
