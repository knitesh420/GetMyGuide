import { Document, Types } from 'mongoose';

export type NotificationType =
	| 'guide_assigned'
	| 'guide_accepted'
	| 'guide_declined'
	| 'trip_started'
	| 'trip_completed'
	| 'membership_expiring'
	| 'payment_successful'
	| 'booking_updated'
	| 'review_received';

export default interface INotification extends Document {
	_id: Types.ObjectId;
	recipient: Types.ObjectId;
	type: NotificationType;
	title: string;
	message: string;
	relatedEntity?: {
		kind: string;
		id: string;
	};
	dedupeKey: string;
	isRead: boolean;
	readAt?: Date;
	createdAt: Date;
	updatedAt: Date;
}
