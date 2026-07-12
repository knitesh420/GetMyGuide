import { LocationDB } from '@mongo';
import ILocation from '@mongo/types/location';
import { Types } from 'mongoose';
import { ConflictError, NotFoundError } from 'node-be-utilities';
import ActivityLogService from './activityLog';

const MONGO_DUPLICATE_KEY_ERROR_CODE = 11000;

interface LocationInput {
	name: string;
	city: string;
	state?: string;
	country?: string;
	description?: string;
	image?: string;
	isActive?: boolean;
	isPopular?: boolean;
}

/** "Jaipur City Palace" -> "jaipur-city-palace" */
function slugify(value: string): string {
	return value
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9\s-]/g, '')
		.replace(/\s+/g, '-')
		.replace(/-+/g, '-');
}

class LocationService {
	/** Public listing. Inactive locations are invisible to everyone but admins. */
	async getAll(filters: { city?: string; popular?: boolean; search?: string } = {}) {
		const query: Record<string, unknown> = { isActive: true, deletedAt: null };

		if (filters.city) query.city = filters.city;
		if (filters.popular) query.isPopular = true;
		if (filters.search) {
			const escaped = filters.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
			query.$or = [
				{ name: { $regex: escaped, $options: 'i' } },
				{ city: { $regex: escaped, $options: 'i' } },
			];
		}

		return LocationDB.find(query).sort({ isPopular: -1, name: 1 }).lean();
	}

	async getAllForAdmin() {
		return LocationDB.find({ deletedAt: null }).sort({ createdAt: -1 }).lean();
	}

	/**
	 * Public pages address a location by slug, but the admin table has its id.
	 * Accept either rather than making the caller know which it holds.
	 */
	async getById(idOrSlug: string): Promise<ILocation> {
		const query = Types.ObjectId.isValid(idOrSlug)
			? { _id: idOrSlug, deletedAt: null }
			: { slug: idOrSlug.toLowerCase(), deletedAt: null };

		const location = await LocationDB.findOne(query).lean();
		if (!location) {
			throw new NotFoundError('Location not found');
		}

		return location as ILocation;
	}

	async create(data: LocationInput, adminUserId: string) {
		const slug = slugify(data.name);

		try {
			const location = await LocationDB.create({ ...data, slug });

			await ActivityLogService.log({
				actor: adminUserId,
				action: 'location.created',
				targetType: 'Location',
				targetId: location._id.toString(),
				description: `Created location ${location.name} (${location.city})`,
			});

			return location;
		} catch (err: unknown) {
			if ((err as { code?: number })?.code === MONGO_DUPLICATE_KEY_ERROR_CODE) {
				throw new ConflictError(`A location with the slug '${slug}' already exists`);
			}
			throw err;
		}
	}

	async update(locationId: string, data: Partial<LocationInput>, adminUserId: string) {
		const update: Record<string, unknown> = { ...data };
		// Renaming re-derives the slug, so the public URL follows the name.
		if (data.name) update.slug = slugify(data.name);

		const location = await LocationDB.findOneAndUpdate(
			{ _id: locationId, deletedAt: null },
			{ $set: update },
			{ new: true }
		);
		if (!location) {
			throw new NotFoundError('Location not found');
		}

		await ActivityLogService.log({
			actor: adminUserId,
			action: 'location.updated',
			targetType: 'Location',
			targetId: location._id.toString(),
			description: `Updated location ${location.name}`,
		});

		return location;
	}

	/** Soft delete — packages and bookings may still reference this location by name. */
	async remove(locationId: string, adminUserId: string) {
		const location = await LocationDB.findOneAndUpdate(
			{ _id: locationId, deletedAt: null },
			{ $set: { deletedAt: new Date(), isActive: false } },
			{ new: true }
		);
		if (!location) {
			throw new NotFoundError('Location not found');
		}

		await ActivityLogService.log({
			actor: adminUserId,
			action: 'location.deleted',
			targetType: 'Location',
			targetId: location._id.toString(),
			description: `Deleted location ${location.name}`,
		});

		return { message: 'Location deleted' };
	}
}

export default new LocationService();
