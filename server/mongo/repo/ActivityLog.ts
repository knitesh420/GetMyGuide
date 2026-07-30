import mongoose from 'mongoose';
import IActivityLog, { ActivityLogTargetType } from '../types/activityLog';

/**
 * The one list of things an audit entry can point at.
 *
 * This schema's enum used to be written out by hand and had drifted behind
 * `ActivityLogTargetType`: it still only allowed the original seven targets, so
 * every `RefundRequest`, `Invoice`, `Payout`, `Earning` and `Location` entry
 * failed validation on save. ActivityLogService.log() swallows its own errors by
 * design — a broken audit write must not fail the refund it is describing — so
 * the entries were dropped in silence and never reached the activity log.
 *
 * Keying off a Record<union, true> makes the two impossible to separate again:
 * add a member to the union without listing it here and this file stops
 * compiling.
 */
const TARGET_TYPES: Record<ActivityLogTargetType, true> = {
	Booking: true,
	Assignment: true,
	Trip: true,
	Notification: true,
	Review: true,
	Guide: true,
	GuideLeave: true,
	Transaction: true,
	Invoice: true,
	RefundRequest: true,
	Earning: true,
	Payout: true,
	CashPayment: true,
	Location: true,
	Account: true,
};

export const ACTIVITY_LOG_TARGET_TYPES = Object.keys(TARGET_TYPES) as ActivityLogTargetType[];

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
			enum: ACTIVITY_LOG_TARGET_TYPES,
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
