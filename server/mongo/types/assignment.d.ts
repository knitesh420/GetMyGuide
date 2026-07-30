import { Document, Types } from 'mongoose';

export type AssignmentStatus = 'pending' | 'accepted' | 'declined' | 'reassigned';

export default interface IAssignment extends Document {
	_id: Types.ObjectId;
	booking: Types.ObjectId;
	guide: Types.ObjectId;
	assignedBy: Types.ObjectId;
	status: AssignmentStatus;
	adminNotes?: string;
	declineReason?: string;
	respondedAt?: Date;
	previousAssignment?: Types.ObjectId;
	assignmentCode?: string;
	createdAt: Date;
	updatedAt: Date;
}
