import { Document, Types } from 'mongoose';

export type TripStatus = 'not-started' | 'in-progress' | 'completed' | 'cancelled';

export default interface ITrip extends Document {
	_id: Types.ObjectId;
	booking: Types.ObjectId;
	assignment: Types.ObjectId;
	guide: Types.ObjectId;
	status: TripStatus;
	startedAt?: Date;
	completedAt?: Date;
	startNotes?: string;
	completionNotes?: string;
	createdAt: Date;
	updatedAt: Date;
}
