import { AccountDB } from '@mongo';
import { NotFoundError } from 'node-be-utilities';
import { Types } from 'mongoose';

interface TouristProfile {
	_id: string;
	name: string;
	email: string;
	phone: string;
	role: string;
	isActive: boolean;
	status: string;
	createdAt: Date;
	updatedAt: Date;
}

class UserService {
	/**
	 * Get all tourists (non-guide, non-admin accounts)
	 */
	async getAllTourists(
		query?: string,
		limit: number = 10,
		page: number = 1
	): Promise<{
		tourists: TouristProfile[];
		pagination: {
			page: number;
			limit: number;
			total: number;
			totalPages: number;
		};
	}> {
		const filter: any = { role: 'tourist' };

		if (query) {
			filter.$or = [
				{ name: { $regex: query, $options: 'i' } },
				{ email: { $regex: query, $options: 'i' } },
				{ phone: { $regex: query, $options: 'i' } },
			];
		}

		const total = await AccountDB.countDocuments(filter);
		const skip = (page - 1) * limit;

		const tourists = await AccountDB.find(filter)
			.select('_id name email phone role isActive status createdAt updatedAt')
			.sort({ createdAt: -1 })
			.skip(skip)
			.limit(limit)
			.lean();

		return {
			tourists: tourists.map((doc: any) => ({
				_id: doc._id.toString(),
				name: doc.name,
				email: doc.email,
				phone: doc.phone,
				role: doc.role,
				isActive: doc.isActive,
				status: doc.status,
				createdAt: doc.createdAt,
				updatedAt: doc.updatedAt,
			})),
			pagination: {
				page,
				limit,
				total,
				totalPages: Math.ceil(total / limit),
			},
		};
	}

	/**
	 * Deactivate (soft delete) a tourist account by ID
	 */
	async deactivateTourist(touristId: Types.ObjectId): Promise<{ message: string }> {
		const tourist = await AccountDB.findOneAndUpdate(
			{ _id: touristId, role: 'tourist' },
			{ isActive: false },
			{ new: true }
		);

		if (!tourist) {
			throw new NotFoundError('Tourist not found');
		}

		return {
			message: 'Tourist account deactivated successfully',
		};
	}

	/**
	 * Reactivate a previously deactivated tourist account by ID.
	 * Inverse of deactivateTourist — restores account access.
	 */
	async activateTourist(touristId: Types.ObjectId): Promise<{ message: string }> {
		const tourist = await AccountDB.findOneAndUpdate(
			{ _id: touristId, role: 'tourist' },
			{ isActive: true },
			{ new: true }
		);

		if (!tourist) {
			throw new NotFoundError('Tourist not found');
		}

		return {
			message: 'Tourist account activated successfully',
		};
	}
}

export default new UserService();
