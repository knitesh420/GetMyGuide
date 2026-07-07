import mongoose from 'mongoose';
import IActivityLog from '../types/activityLog';

const ActivityLogSchema = new mongoose.Schema<IActivityLog>(
	{
		actor: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Account',
		},
		actorType: {
			type: String,
			enum: ['user', 'system'],
			default: 'user',
		},
		action: {
			type: String,
			required: true,
		},
		targetType: {
			type: String,
			enum: ['Booking', 'Assignment', 'Trip', 'Notification', 'Review', 'Guide', 'Transaction'],
			required: true,
		},
		targetId: {
			type: String,
			required: true,
		},
		description: {
			type: String,
			required: true,
		},
		metadata: {
			type: mongoose.Schema.Types.Mixed,
		},
	},
	{
		timestamps: true,
	}
);

ActivityLogSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });
ActivityLogSchema.index({ actor: 1, createdAt: -1 });
ActivityLogSchema.index({ action: 1, createdAt: -1 });

const ActivityLogDB = mongoose.model<IActivityLog>('ActivityLog', ActivityLogSchema);

export default ActivityLogDB;
