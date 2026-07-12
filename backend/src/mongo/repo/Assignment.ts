import mongoose from 'mongoose';
import IAssignment from '../types/assignment';
import { nextCode } from '../utils/businessId';

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
			maxlength: 2000,
		},
		declineReason: {
			type: String,
			trim: true,
			maxlength: 2000,
		},
		respondedAt: {
			type: Date,
		},
		previousAssignment: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Assignment',
		},
		// Human-facing business ID, e.g. "AS000001". Sparse for backward compat.
		assignmentCode: {
			type: String,
			unique: true,
			sparse: true,
			trim: true,
		},
	},
	{
		timestamps: true,
	}
);

AssignmentSchema.index({ booking: 1, createdAt: -1 });
AssignmentSchema.index({ guide: 1, status: 1 });
AssignmentSchema.index({ status: 1 });
AssignmentSchema.index({ assignedBy: 1, createdAt: -1 });
// DB-level guarantee: at most one live (pending/accepted) assignment per booking.
AssignmentSchema.index(
	{ booking: 1 },
	{
		unique: true,
		partialFilterExpression: { status: { $in: ['pending', 'accepted'] } },
	}
);

// Assignment is created via .create(), so the document validate hook fires.
AssignmentSchema.pre('validate', async function () {
	if (this.isNew && !this.assignmentCode) {
		this.assignmentCode = await nextCode('assignment');
	}
});

const AssignmentDB = mongoose.model<IAssignment>('Assignment', AssignmentSchema);

export default AssignmentDB;
