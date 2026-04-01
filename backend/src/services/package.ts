import { PackageDB } from '@mongo';
import IPackage from '@mongo/types/package';
import { Types } from 'mongoose';
import { NotFoundError } from 'node-be-utilities';

interface PackageData {
	title: string;
	city: string;
	places: string[];
	images: string[];
	shortDescription?: string;
	description?: string;
	price?: number;
	numberOfPeople?: number;
	numberOfDays?: number;
	inclusions?: string[];
	exclusions?: string[];
	featured?: boolean;
	status?: 'inactive' | 'active';
}

interface UpdatePackageData {
	title?: string;
	city?: string;
	places?: string[];
	images?: string[];
	shortDescription?: string;
	description?: string;
	price?: number;
	numberOfPeople?: number;
	numberOfDays?: number;
	inclusions?: string[];
	exclusions?: string[];
	featured?: boolean;
}

interface TransformedPackage {
	id: string;
	title: string;
	city: string;
	places: string[];
	images: string[];
	shortDescription?: string;
	description?: string;
	price?: number;
	numberOfPeople?: number;
	numberOfDays?: number;
	inclusions?: string[];
	exclusions?: string[];
	featured?: boolean;
	status?: 'inactive' | 'active';
	createdAt: Date;
	updatedAt: Date;
}

/**
 * Transform a package document to API format
 * Converts _id to id
 */
function transformPackage(pkg: IPackage): TransformedPackage {
	const transformed: TransformedPackage = {
		id: pkg._id.toString(),
		title: pkg.title,
		city: pkg.city,
		places: pkg.places,
		images: pkg.images,
		shortDescription: pkg.shortDescription,
		description: pkg.description,
		price: pkg.price,
		numberOfPeople: pkg.numberOfPeople,
		numberOfDays: pkg.numberOfDays,
		inclusions: pkg.inclusions,
		exclusions: pkg.exclusions,
		featured: pkg.featured,
		status: pkg.status,
		createdAt: pkg.createdAt,
		updatedAt: pkg.updatedAt,
	};

	// Remove undefined optional fields
	if (transformed.price === undefined) delete (transformed as any).price;
	if (transformed.numberOfPeople === undefined) delete (transformed as any).numberOfPeople;
	if (transformed.numberOfDays === undefined) delete (transformed as any).numberOfDays;
	if (transformed.shortDescription === undefined) delete (transformed as any).shortDescription;
	if (transformed.description === undefined) delete (transformed as any).description;
	if (transformed.inclusions === undefined) delete (transformed as any).inclusions;
	if (transformed.exclusions === undefined) delete (transformed as any).exclusions;
	if (transformed.featured === undefined) delete (transformed as any).featured;
	if (transformed.status === undefined) delete (transformed as any).status;

	return transformed;
}

interface GetPackagesFilters {
	status?: 'inactive' | 'active';
	featured?: boolean;
	city?: string;
}

class PackageService {
	/**
	 * Create a new package
	 */
	async createPackage(data: PackageData): Promise<TransformedPackage> {
		const pkg = await PackageDB.create(data);
		return transformPackage(pkg);
	}

	/**
	 * Get packages with optional filters
	 * @param filters - Optional filters for status, featured, and city
	 * @param isAdmin - If true, returns all packages regardless of status filter
	 */
	async getPackages(
		filters: GetPackagesFilters = {},
		isAdmin: boolean = false
	): Promise<TransformedPackage[]> {
		const query: any = {};

		// If not admin, only show active packages
		if (!isAdmin) {
			query.status = 'active';
		} else if (filters.status) {
			query.status = filters.status;
		}

		if (filters.featured !== undefined) {
			query.featured = filters.featured;
		}

		if (filters.city) {
			query.city = filters.city;
		}

		const packages = await PackageDB.find(query).sort({ createdAt: -1 }).lean();

		return packages.map((pkg) => transformPackage(pkg as IPackage));
	}

	/**
	 * Get a package by ID
	 * @param packageId - Package ID
	 * @param isAdmin - If true, returns package regardless of status
	 */
	async getPackageById(
		packageId: Types.ObjectId,
		isAdmin: boolean = false
	): Promise<TransformedPackage> {
		const pkg = await PackageDB.findById(packageId).lean();

		if (!pkg) {
			throw new NotFoundError('Package not found');
		}

		// If not admin, only return if active
		if (!isAdmin && pkg.status !== 'active') {
			throw new NotFoundError('Package not found');
		}

		return transformPackage(pkg as IPackage);
	}

	/**
	 * Update a package
	 */
	async updatePackage(
		packageId: Types.ObjectId,
		data: UpdatePackageData
	): Promise<TransformedPackage> {
		const pkg = await PackageDB.findByIdAndUpdate(packageId, data, {
			new: true,
			runValidators: true,
		}).lean();

		if (!pkg) {
			throw new NotFoundError('Package not found');
		}

		return transformPackage(pkg as IPackage);
	}

	/**
	 * Delete a package
	 */
	async deletePackage(packageId: Types.ObjectId): Promise<void> {
		const result = await PackageDB.findByIdAndDelete(packageId);

		if (!result) {
			throw new NotFoundError('Package not found');
		}
	}

	/**
	 * Update package status
	 */
	async updatePackageStatus(
		packageId: Types.ObjectId,
		status: 'inactive' | 'active'
	): Promise<TransformedPackage> {
		const pkg = await PackageDB.findByIdAndUpdate(
			packageId,
			{ status },
			{ new: true, runValidators: true }
		).lean();

		if (!pkg) {
			throw new NotFoundError('Package not found');
		}

		return transformPackage(pkg as IPackage);
	}

	/**
	 * Get available cities from active packages
	 */
	async getAvailableCities(): Promise<string[]> {
		const packages = await PackageDB.find({ status: 'active' }).select('city').lean();
		const cities = [...new Set(packages.map((pkg) => pkg.city))];
		return cities.sort();
	}
}

export default new PackageService();
