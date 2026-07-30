import mongoose from 'mongoose';
import INotification, { NotificationType } from '../types/notification';

/**
 * The one list of notification kinds.
 *
 * Derived from the union rather than hand-written, for the same reason
 * ActivityLog's target list is: NotificationService.create() must not throw into
 * the operation that triggered it, so an enum that has fallen behind the type
 * drops notifications in silence. Add a member to `NotificationType` without
 * listing it here and this file stops compiling instead.
 */
const NOTIFICATION_TYPES: Record<NotificationType, true> = {
	guide_assigned: true,
	guide_accepted: true,
	guide_declined: true,
	trip_started: true,
	trip_completed: true,
	membership_expiring: true,
	payment_successful: true,
	booking_updated: true,
	review_received: true,
	guide_approved: true,
	guide_rejected: true,
	booking_cancelled: true,
	refund_requested: true,
	refund_processed: true,
	refund_rejected: true,
	balance_due: true,
	earning_credited: true,
	payout_paid: true,
	cash_payment_recorded: true,
	membership_refunded: true,
	new_message: true,
};

const NotificationSchema = new mongoose.Schema<INotification>(
	{
		recipient: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Account',
			required: true,
		},
		type: {
			type: String,
			enum: Object.keys(NOTIFICATION_TYPES) as NotificationType[],
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
