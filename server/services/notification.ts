import { NotificationDB } from '@mongo';
import { NotificationType } from '@mongo/types/notification';
import { Types } from 'mongoose';
import { NotFoundError, error as logError } from 'node-be-utilities';

const MONGO_DUPLICATE_KEY_ERROR_CODE = 11000;

interface CreateNotificationParams {
	recipient: Types.ObjectId | string;
	type: NotificationType;
	title: string;
	message: string;
	relatedEntity?: { kind: string; id: string };
	dedupeKey: string;
}

interface PageParams {
	page?: number;
	limit?: number;
}

class NotificationService {
	/**
	 * Idempotent create — relies entirely on the unique `dedupeKey` index so
	 * every call site (direct or the background watcher) can call this
	 * without a separate existence check/race window. Duplicate-key errors
	 * are swallowed by design, not logged as failures.
	 */
	async create(params: CreateNotificationParams) {
		try {
			return await NotificationDB.create({
				recipient: params.recipient,
				type: params.type,
				title: params.title,
				message: params.message,
				relatedEntity: params.relatedEntity,
				dedupeKey: params.dedupeKey,
			});
		} catch (err: any) {
			if (err?.code === MONGO_DUPLICATE_KEY_ERROR_CODE) {
				return null;
			}
			logError('Failed to create notification', err);
			return null;
		}
	}

	async getMyNotifications(
		userId: string,
		{ page = 1, limit = 20, unreadOnly = false }: PageParams & { unreadOnly?: boolean } = {}
	) {
		const query: Record<string, unknown> = { recipient: userId };
		if (unreadOnly) query.isRead = false;

		const skip = (page - 1) * limit;
		const [data, total] = await Promise.all([
			NotificationDB.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
			NotificationDB.countDocuments(query),
		]);

		return { data, total, page, totalPages: Math.ceil(total / limit) || 1 };
	}

	async getUnreadCount(userId: string) {
		const count = await NotificationDB.countDocuments({ recipient: userId, isRead: false });
		return { count };
	}

	async markRead(userId: string, notificationId: Types.ObjectId) {
		const notification = await NotificationDB.findOneAndUpdate(
			{ _id: notificationId, recipient: userId },
			{ isRead: true, readAt: new Date() },
			{ new: true }
		);
		if (!notification) {
			throw new NotFoundError('Notification not found');
		}
		return notification;
	}

	async markAllRead(userId: string) {
		const result = await NotificationDB.updateMany(
			{ recipient: userId, isRead: false },
			{ isRead: true, readAt: new Date() }
		);
		return { modifiedCount: result.modifiedCount };
	}

	async getAllForAdmin(filters: { type?: NotificationType; recipient?: string } = {}, { page = 1, limit = 20 }: PageParams = {}) {
		const query: Record<string, unknown> = {};
		if (filters.type) query.type = filters.type;
		if (filters.recipient) query.recipient = filters.recipient;

		const skip = (page - 1) * limit;
		const [data, total] = await Promise.all([
			NotificationDB.find(query)
				.populate('recipient', 'name email role')
				.sort({ createdAt: -1 })
				.skip(skip)
				.limit(limit)
				.lean(),
			NotificationDB.countDocuments(query),
		]);

		return { data, total, page, totalPages: Math.ceil(total / limit) || 1 };
	}
}

export default new NotificationService();
