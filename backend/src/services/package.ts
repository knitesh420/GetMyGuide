import { PackageDB } from '@mongo';
import IPackage, { IPackageTranslations } from '@mongo/types/package';
import { Types } from 'mongoose';
import { NotFoundError } from 'node-be-utilities';

interface PackageData {
	price?: number;
	baseCurrency?: string;
	numberOfPeople?: number;
	numberOfDays?: number;
	featured?: boolean;
	status?: 'inactive' | 'active';
	images: string[];
	translations?: IPackageTranslations;
	title?: string;
	city?: string;
	places?: string[];
	shortDescription?: string;
	description?: string;
	inclusions?: string[];
	exclusions?: string[];
}

interface UpdatePackageData {
	price?: number;
	baseCurrency?: string;
	numberOfPeople?: number;
	numberOfDays?: number;
	featured?: boolean;
	status?: 'inactive' | 'active';
	images?: string[];
	translations?: Partial<IPackageTranslations>;
	title?: string;
	city?: string;
	places?: string[];
	shortDescription?: string;
	description?: string;
	inclusions?: string[];
	exclusions?: string[];
}

interface TransformedPackage {
	_id: string;
	id: string;
	price?: number;
	baseCurrency?: string;
	numberOfPeople?: number;
	numberOfDays?: number;
	featured?: boolean;
	status?: 'inactive' | 'active';
	images: string[];
	translations: IPackageTranslations;
	title: string;
	city: string;
	places: string[];
	shortDescription?: string;
	description?: string;
	inclusions?: string[];
	exclusions?: string[];
	basePrice?: number;
	createdAt: Date;
	updatedAt: Date;
}

interface PackageTranslationFallback {
	title: string;
	city: string;
	places: string[];
	shortDescription?: string;
	description?: string;
	inclusions?: string[];
	exclusions?: string[];
}

function getTranslationFallback(pkg: IPackage): PackageTranslationFallback {
	const translation = pkg.translations?.en ?? {};
	return {
		title: translation.title || pkg.title || '',
		city: translation.city || pkg.city || '',
		places: translation.places?.length ? translation.places : pkg.places || [],
		shortDescription: translation.shortDescription || pkg.shortDescription,
		description: translation.description || pkg.description,
		inclusions: translation.inclusions?.length ? translation.inclusions : pkg.inclusions,
		exclusions: translation.exclusions?.length ? translation.exclusions : pkg.exclusions,
	};
}

function transformPackage(pkg: IPackage): TransformedPackage {
	const fallback = getTranslationFallback(pkg);
	const transformed: TransformedPackage = {
		_id: pkg._id.toString(),
		id: pkg._id.toString(),
		price: pkg.price,
		baseCurrency: pkg.baseCurrency || 'USD',
		numberOfPeople: pkg.numberOfPeople,
		numberOfDays: pkg.numberOfDays,
		featured: pkg.featured,
		status: pkg.status,
		images: pkg.images,
		translations: pkg.translations || {
			en: {},
			es: {},
			fr: {},
			ru: {},
			de: {},
		},
		title: fallback.title,
		city: fallback.city,
		places: fallback.places,
		shortDescription: fallback.shortDescription,
		description: fallback.description,
		inclusions: fallback.inclusions,
		exclusions: fallback.exclusions,
		basePrice: pkg.price,
		createdAt: pkg.createdAt,
		updatedAt: pkg.updatedAt,
	};

	if (transformed.price === undefined) delete (transformed as any).price;
	if (transformed.baseCurrency === undefined) delete (transformed as any).baseCurrency;
	if (transformed.numberOfPeople === undefined) delete (transformed as any).numberOfPeople;
	if (transformed.numberOfDays === undefined) delete (transformed as any).numberOfDays;
	if (transformed.shortDescription === undefined) delete (transformed as any).shortDescription;
	if (transformed.description === undefined) delete (transformed as any).description;
	if (!transformed.inclusions || transformed.inclusions.length === 0)
		delete (transformed as any).inclusions;
	if (!transformed.exclusions || transformed.exclusions.length === 0)
		delete (transformed as any).exclusions;
	if (transformed.featured === undefined) delete (transformed as any).featured;
	if (transformed.status === undefined) delete (transformed as any).status;

	return transformed;
}

interface GetPackagesFilters {
	status?: 'inactive' | 'active';
	featured?: boolean;
	city?: string;
	limit?: number;
}

function buildCityQuery(city: string) {
	return {
		$or: [
			{ city },
			{ 'translations.en.city': city },
			{ 'translations.es.city': city },
			{ 'translations.fr.city': city },
			{ 'translations.ru.city': city },
			{ 'translations.de.city': city },
		],
	};
}

class PackageService {
	async createPackage(data: PackageData): Promise<TransformedPackage> {
		const pkg = await PackageDB.create({
			...data,
			baseCurrency: data.baseCurrency || 'USD',
		});
		return transformPackage(pkg);
	}

	async getPackages(
		filters: GetPackagesFilters = {},
		isAdmin: boolean = false
	): Promise<TransformedPackage[]> {
		const query: any = {};

		if (!isAdmin) {
			query.status = 'active';
		} else if (filters.status) {
			query.status = filters.status;
		}

		if (filters.featured !== undefined) {
			query.featured = filters.featured;
		}

		if (filters.city) {
			Object.assign(query, buildCityQuery(filters.city));
		}

		const queryBuilder = PackageDB.find(query).sort({ createdAt: -1 });
		if (filters.limit !== undefined && Number.isInteger(filters.limit) && filters.limit > 0) {
			queryBuilder.limit(filters.limit);
		}

		const packages = await queryBuilder.lean();
		return packages.map((pkg) => transformPackage(pkg as IPackage));
	}

	async getPackageById(
		packageId: Types.ObjectId,
		isAdmin: boolean = false
	): Promise<TransformedPackage> {
		const pkg = await PackageDB.findById(packageId).lean();

		if (!pkg) {
			throw new NotFoundError('Package not found');
		}

		if (!isAdmin && pkg.status !== 'active') {
			throw new NotFoundError('Package not found');
		}

		return transformPackage(pkg as IPackage);
	}

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

	async deletePackage(packageId: Types.ObjectId): Promise<void> {
		const result = await PackageDB.findByIdAndDelete(packageId);

		if (!result) {
			throw new NotFoundError('Package not found');
		}
	}

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

	async getAvailableCities(): Promise<string[]> {
		const packages = await PackageDB.find({ status: 'active' }).select('city translations').lean();
		const cities = new Set<string>();

		for (const pkg of packages) {
			const city = pkg.translations?.en?.city || pkg.city;
			if (city) cities.add(city);
		}

		return Array.from(cities).sort();
	}
}

export default new PackageService();
