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

	/**
	 * The calling account. Deliberately narrow: name/contact/role/status only.
	 * Never the password hash or tokenVersion, both of which live on the same
	 * document and would leak straight into a client store if returned.
	 */
	async getMe(userId: string) {
		const account = await AccountDB.findById(userId)
			.select('name email phone countryCode role isActive status emailVerified createdAt')
			.lean();

		if (!account) {
			throw new NotFoundError('Account not found');
		}

		return account;
	}

	/** Admin: every account, filterable by role. */
	async getAllAccounts(
		filters: { role?: 'tourist' | 'guide' | 'admin'; search?: string } = {},
		limit: number = 20,
		page: number = 1
	) {
		const query: Record<string, unknown> = {};
		if (filters.role) query.role = filters.role;

		if (filters.search) {
			// Escape the search term before it becomes a regex — an unescaped '('
			// or '*' from a query string is a 500 at best and a ReDoS at worst.
			const escaped = filters.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
			query.$or = [
				{ name: { $regex: escaped, $options: 'i' } },
				{ email: { $regex: escaped, $options: 'i' } },
				{ phone: { $regex: escaped, $options: 'i' } },
			];
		}

		const skip = (page - 1) * limit;
		const [accounts, total] = await Promise.all([
			AccountDB.find(query)
				.select('name email phone role isActive status createdAt')
				.sort({ createdAt: -1 })
				.skip(skip)
				.limit(limit)
				.lean(),
			AccountDB.countDocuments(query),
		]);

		return {
			data: accounts,
			pagination: {
				page,
				limit,
				total,
				totalPages: Math.ceil(total / limit) || 1,
			},
		};
	}

	async getAccountsByRole(role: 'tourist' | 'guide' | 'admin', limit: number = 20, page: number = 1) {
		return this.getAllAccounts({ role }, limit, page);
	}
}

export default new UserService();