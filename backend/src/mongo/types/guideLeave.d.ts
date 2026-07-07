import { Document, Types } from 'mongoose';

export type GuideLeaveType = 'vacation' | 'emergency';
export type GuideLeaveStatus = 'active' | 'cancelled';

export default interface IGuideLeave extends Document {
	_id: Types.ObjectId;
	guide: Types.ObjectId;
	type: GuideLeaveType;
	startDate: Date;
	endDate: Date;
	reason?: string;
	status: GuideLeaveStatus;
	createdAt: Date;
	updatedAt: Date;
}
