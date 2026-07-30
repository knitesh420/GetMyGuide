import { ActivityLogDB } from '@mongo';
import { ActivityLogTargetType } from '@mongo/types/activityLog';
import { Types } from 'mongoose';
import { error as logError } from 'node-be-utilities';

interface LogEntry {
	actor?: Types.ObjectId | string;
	actorType?: 'user' | 'system';
	action: string;
	targetType: ActivityLogTargetType;
	targetId: string;
	description: string;
	metadata?: Record<string, unknown>;
}

interface GetAllFilters {
	action?: string;
	actorType?: 'user' | 'system';
	targetType?: ActivityLogTargetType;
	from?: string;
	to?: string;
}

interface PageParams {
	page?: number;
	limit?: number;
}

class ActivityLogService {
	/**
	 * Records an audit entry. Never throws — a logging failure must never
	 * break the caller's Assignment/Trip/Review write.
	 */
	async log(entry: LogEntry): Promise<void> {
		try {
			await ActivityLogDB.create({
				actor: entry.actor,
				actorType: entry.actorType ?? 'user',
				action: entry.action,
				targetType: entry.targetType,
				targetId: entry.targetId,
				description: entry.description,
				metadata: entry.metadata,
			});
		} catch (err) {
			logError('Failed to write activity log entry', err);
		}
	}

	async getForTarget(targetType: ActivityLogTargetType, targetId: string, { page = 1, limit = 20 }: PageParams = {}) {
		const skip = (page - 1) * limit;
		const [data, total] = await Promise.all([
			ActivityLogDB.find({ targetType, targetId }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
			ActivityLogDB.countDocuments({ targetType, targetId }),
		]);

		return { data, total, page, totalPages: Math.ceil(total / limit) || 1 };
	}

	async getAll(filters: GetAllFilters = {}, { page = 1, limit = 20 }: PageParams = {}) {
		const query: Record<string, unknown> = {};
		if (filters.action) query.action = filters.action;
		if (filters.actorType) query.actorType = filters.actorType;
		if (filters.targetType) query.targetType = filters.targetType;
		if (filters.from || filters.to) {
			query.createdAt = {
				...(filters.from ? { $gte: new Date(filters.from) } : {}),
				...(filters.to ? { $lte: new Date(filters.to) } : {}),
			};
		}

		const skip = (page - 1) * limit;
		const [data, total] = await Promise.all([
			ActivityLogDB.find(query)
				.populate('actor', 'name email role')
				.sort({ createdAt: -1 })
				.skip(skip)
				.limit(limit)
				.lean(),
			ActivityLogDB.countDocuments(query),
		]);

		return { data, total, page, totalPages: Math.ceil(total / limit) || 1 };
	}
}

export default new ActivityLogService();
