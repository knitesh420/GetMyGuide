import mongoose from 'mongoose';
import INotification from '../types/notification';

const NotificationSchema = new mongoose.Schema<INotification>(
	{
		recipient: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Account',
			required: true,
		},
		type: {
			type: String,
			enum: [
				'guide_assigned',
				'guide_accepted',
				'guide_declined',
				'trip_started',
				'trip_completed',
				'membership_expiring',
				'payment_successful',
				'booking_updated',
				'review_received',
			],
			required: true,
		},
		title: {
			type: String,
			required: true,
		},
		message: {
			type: String,
			required: true,
		},
		relatedEntity: {
			kind: { type: String },
			id: { type: String },
		},
		dedupeKey: {
			type: String,
			required: true,
			unique: true,
		},
		isRead: {
			type: Boolean,
			default: false,
		},
		readAt: {
			type: Date,
		},
	},
	{
		timestamps: true,
	}
);

NotificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

const NotificationDB = mongoose.model<INotification>('Notification', NotificationSchema);

export default NotificationDB;
