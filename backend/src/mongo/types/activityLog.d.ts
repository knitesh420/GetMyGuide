import { Document, Types } from 'mongoose';

export type ActivityLogTargetType =
	| 'Booking'
	| 'Assignment'
	| 'Trip'
	| 'Notification'
	| 'Review'
	| 'Guide'
	| 'GuideLeave'
	| 'Transaction'
	| 'Invoice'
	| 'RefundRequest'
	| 'Earning'
	| 'Payout'
	| 'Location'
	| 'Account';

export default interface IActivityLog extends Document {
	_id: Types.ObjectId;
	actor?: Types.ObjectId;
	actorType: 'user' | 'system';
	action: string;
	targetType: ActivityLogTargetType;
	targetId: string;
	description: string;
	metadata?: Record<string, unknown>;
	createdAt: Date;
	updatedAt: Date;
}
