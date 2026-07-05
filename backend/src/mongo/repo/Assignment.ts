import mongoose from 'mongoose';
import IAssignment from '../types/assignment';

const AssignmentSchema = new mongoose.Schema<IAssignment>(
	{
		booking: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Booking',
			required: true,
		},
		guide: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Account',
			required: true,
		},
		assignedBy: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Account',
			required: true,
		},
		status: {
			type: String,
			enum: ['pending', 'accepted', 'declined', 'reassigned'],
			default: 'pending',
		},
		adminNotes: {
			type: String,
			trim: true,
		},
		declineReason: {
			type: String,
			trim: true,
		},
		respondedAt: {
			type: Date,
		},
		previousAssignment: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Assignment',
		},
	},
	{
		timestamps: true,
	}
);

AssignmentSchema.index({ booking: 1, createdAt: -1 });
AssignmentSchema.index({ guide: 1, status: 1 });
AssignmentSchema.index({ status: 1 });
// DB-level guarantee: at most one live (pending/accepted) assignment per booking.
AssignmentSchema.index(
	{ booking: 1 },
	{
		unique: true,
		partialFilterExpression: { status: { $in: ['pending', 'accepted'] } },
	}
);

const AssignmentDB = mongoose.model<IAssignment>('Assignment', AssignmentSchema);

export default AssignmentDB;
