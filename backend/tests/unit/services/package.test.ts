import { PackageDB } from '@mongo';
import PackageService from '@services/package';
import { Types } from 'mongoose';
import { NotFoundError } from 'node-be-utilities';
import { clearDatabase, connectTestDB, disconnectTestDB } from '../../setup/db.setup';

describe('PackageService', () => {
	beforeAll(async () => {
		await connectTestDB();
	});

	afterAll(async () => {
		await disconnectTestDB();
	});

	beforeEach(async () => {
		await clearDatabase();
	});

	describe('createPackage', () => {
		it('should create a package and transform _id to id', async () => {
			const packageData = {
				title: 'Test Package',
				city: 'Mumbai',
				places: ['Taj Mahal', 'Red Fort'],
				images: ['image1.jpg', 'image2.jpg'],
				price: 5000,
				featured: false,
				status: 'inactive' as const,
			};

			const result = await PackageService.createPackage(packageData);

			expect(result).toHaveProperty('id');
			expect(result).not.toHaveProperty('_id');
			expect(result.title).toBe(packageData.title);
			expect(result.city).toBe(packageData.city);
			expect(result.places).toEqual(packageData.places);
			expect(result.images).toEqual(packageData.images);
			expect(result.price).toBe(packageData.price);
			expect(result.featured).toBe(false);
			expect(result.status).toBe('inactive');
			expect(typeof result.id).toBe('string');
		});

		it('should create a package with all optional fields', async () => {
			const packageData = {
				title: 'Premium Package',
				city: 'Delhi',
				places: ['India Gate', 'Lotus Temple'],
				images: ['premium1.jpg'],
				shortDescription: 'A premium tour package',
				description: 'Detailed description of the premium package',
				price: 10000,
				inclusions: ['Breakfast', 'Lunch', 'Transport'],
				exclusions: ['Dinner', 'Tips'],
				featured: true,
				status: 'active' as const,
			};

			const result = await PackageService.createPackage(packageData);

			expect(result.title).toBe(packageData.title);
			expect(result.shortDescription).toBe(packageData.shortDescription);
			expect(result.description).toBe(packageData.description);
			expect(result.inclusions).toEqual(packageData.inclusions);
			expect(result.exclusions).toEqual(packageData.exclusions);
			expect(result.featured).toBe(true);
			expect(result.status).toBe('active');
		});

		it('should default status to inactive when not provided', async () => {
			const packageData = {
				title: 'Test Package',
				city: 'Mumbai',
				places: ['Place 1'],
				images: ['image1.jpg'],
				price: 5000,
			};

			const result = await PackageService.createPackage(packageData);

			expect(result.status).toBe('inactive');
		});
	});

	describe('getPackages', () => {
		beforeEach(async () => {
			// Create test packages
			await PackageDB.create({
				title: 'Active Package 1',
				city: 'Mumbai',
				places: ['Place 1'],
				images: ['img1.jpg'],
				price: 5000,
				status: 'active',
				featured: true,
			});

			await PackageDB.create({
				title: 'Active Package 2',
				city: 'Delhi',
				places: ['Place 2'],
				images: ['img2.jpg'],
				price: 6000,
				status: 'active',
				featured: false,
			});

			await PackageDB.create({
				title: 'Inactive Package',
				city: 'Mumbai',
				places: ['Place 3'],
				images: ['img3.jpg'],
				price: 7000,
				status: 'inactive',
				featured: false,
			});
		});

		it('should return only active packages for public users', async () => {
			const results = await PackageService.getPackages({}, false);

			expect(results).toHaveLength(2);
			results.forEach((pkg) => {
				expect(pkg.status).toBe('active');
				expect(pkg).toHaveProperty('id');
				expect(pkg).not.toHaveProperty('_id');
			});
		});

		it('should return all packages for admin users', async () => {
			const results = await PackageService.getPackages({}, true);

			expect(results.length).toBeGreaterThanOrEqual(3);
		});

		it('should filter by featured status', async () => {
			const results = await PackageService.getPackages({ featured: true }, false);

			expect(results).toHaveLength(1);
			expect(results[0].featured).toBe(true);
			expect(results[0].status).toBe('active');
		});

		it('should filter by city', async () => {
			const results = await PackageService.getPackages({ city: 'Mumbai' }, false);

			expect(results.length).toBeGreaterThanOrEqual(1);
			results.forEach((pkg) => {
				expect(pkg.city).toBe('Mumbai');
				expect(pkg.status).toBe('active');
			});
		});

		it('should filter by status for admin', async () => {
			const results = await PackageService.getPackages({ status: 'inactive' }, true);

			expect(results.length).toBeGreaterThanOrEqual(1);
			results.forEach((pkg) => {
				expect(pkg.status).toBe('inactive');
			});
		});

		it('should combine multiple filters', async () => {
			const results = await PackageService.getPackages({ city: 'Mumbai', featured: true }, false);

			results.forEach((pkg) => {
				expect(pkg.city).toBe('Mumbai');
				expect(pkg.featured).toBe(true);
				expect(pkg.status).toBe('active');
			});
		});

		it('should return packages sorted by createdAt descending', async () => {
			const results = await PackageService.getPackages({}, false);

			if (results.length > 1) {
				const firstDate = new Date(results[0].createdAt);
				const secondDate = new Date(results[1].createdAt);
				expect(firstDate.getTime()).toBeGreaterThanOrEqual(secondDate.getTime());
			}
		});

		it('should return empty array when no packages match filters', async () => {
			const results = await PackageService.getPackages({ city: 'NonExistentCity' }, false);

			expect(results).toEqual([]);
		});
	});

	describe('getPackageById', () => {
		it('should return a package by id with transformed _id to id', async () => {
			const pkg = await PackageDB.create({
				title: 'Test Package',
				city: 'Mumbai',
				places: ['Place 1'],
				images: ['img1.jpg'],
				price: 5000,
				status: 'active',
			});

			const result = await PackageService.getPackageById(pkg._id, false);

			expect(result).toHaveProperty('id');
			expect(result).not.toHaveProperty('_id');
			expect(result.id).toBe(pkg._id.toString());
			expect(result.title).toBe('Test Package');
		});

		it('should throw NotFoundError when package does not exist', async () => {
			const fakeId = new Types.ObjectId();

			await expect(PackageService.getPackageById(fakeId, false)).rejects.toThrow(NotFoundError);
		});

		it('should throw NotFoundError for inactive package when not admin', async () => {
			const pkg = await PackageDB.create({
				title: 'Inactive Package',
				city: 'Mumbai',
				places: ['Place 1'],
				images: ['img1.jpg'],
				price: 5000,
				status: 'inactive',
			});

			await expect(PackageService.getPackageById(pkg._id, false)).rejects.toThrow(NotFoundError);
		});

		it('should return inactive package when admin', async () => {
			const pkg = await PackageDB.create({
				title: 'Inactive Package',
				city: 'Mumbai',
				places: ['Place 1'],
				images: ['img1.jpg'],
				price: 5000,
				status: 'inactive',
			});

			const result = await PackageService.getPackageById(pkg._id, true);

			expect(result.id).toBe(pkg._id.toString());
			expect(result.status).toBe('inactive');
		});
	});

	describe('updatePackage', () => {
		it('should update package fields', async () => {
			const pkg = await PackageDB.create({
				title: 'Original Title',
				city: 'Mumbai',
				places: ['Place 1'],
				images: ['img1.jpg'],
				price: 5000,
			});

			const updateData = {
				title: 'Updated Title',
				price: 6000,
				featured: true,
			};

			const result = await PackageService.updatePackage(pkg._id, updateData);

			expect(result.title).toBe('Updated Title');
			expect(result.price).toBe(6000);
			expect(result.featured).toBe(true);
			expect(result.city).toBe('Mumbai'); // Unchanged field
		});

		it('should update places array', async () => {
			const pkg = await PackageDB.create({
				title: 'Test Package',
				city: 'Mumbai',
				places: ['Place 1'],
				images: ['img1.jpg'],
				price: 5000,
			});

			const updateData = {
				places: ['Place 1', 'Place 2', 'Place 3'],
			};

			const result = await PackageService.updatePackage(pkg._id, updateData);

			expect(result.places).toEqual(['Place 1', 'Place 2', 'Place 3']);
		});

		it('should throw NotFoundError when package does not exist', async () => {
			const fakeId = new Types.ObjectId();

			await expect(PackageService.updatePackage(fakeId, { title: 'New Title' })).rejects.toThrow(
				NotFoundError
			);
		});
	});

	describe('deletePackage', () => {
		it('should delete a package', async () => {
			const pkg = await PackageDB.create({
				title: 'Test Package',
				city: 'Mumbai',
				places: ['Place 1'],
				images: ['img1.jpg'],
				price: 5000,
			});

			await PackageService.deletePackage(pkg._id);

			const deleted = await PackageDB.findById(pkg._id);
			expect(deleted).toBeNull();
		});

		it('should throw NotFoundError when package does not exist', async () => {
			const fakeId = new Types.ObjectId();

			await expect(PackageService.deletePackage(fakeId)).rejects.toThrow(NotFoundError);
		});
	});

	describe('updatePackageStatus', () => {
		it('should update package status to active', async () => {
			const pkg = await PackageDB.create({
				title: 'Test Package',
				city: 'Mumbai',
				places: ['Place 1'],
				images: ['img1.jpg'],
				price: 5000,
				status: 'inactive',
			});

			const result = await PackageService.updatePackageStatus(pkg._id, 'active');

			expect(result.status).toBe('active');
		});

		it('should update package status to inactive', async () => {
			const pkg = await PackageDB.create({
				title: 'Test Package',
				city: 'Mumbai',
				places: ['Place 1'],
				images: ['img1.jpg'],
				price: 5000,
				status: 'active',
			});

			const result = await PackageService.updatePackageStatus(pkg._id, 'inactive');

			expect(result.status).toBe('inactive');
		});

		it('should throw NotFoundError when package does not exist', async () => {
			const fakeId = new Types.ObjectId();

			await expect(PackageService.updatePackageStatus(fakeId, 'active')).rejects.toThrow(
				NotFoundError
			);
		});
	});

	describe('getAvailableCities', () => {
		beforeEach(async () => {
			// Create packages with different cities
			await PackageDB.create({
				title: 'Package 1',
				city: 'Mumbai',
				places: ['Place 1'],
				images: ['img1.jpg'],
				price: 5000,
				status: 'active',
			});

			await PackageDB.create({
				title: 'Package 2',
				city: 'Delhi',
				places: ['Place 2'],
				images: ['img2.jpg'],
				price: 6000,
				status: 'active',
			});

			await PackageDB.create({
				title: 'Package 3',
				city: 'Mumbai',
				places: ['Place 3'],
				images: ['img3.jpg'],
				price: 7000,
				status: 'active',
			});

			await PackageDB.create({
				title: 'Package 4',
				city: 'Bangalore',
				places: ['Place 4'],
				images: ['img4.jpg'],
				price: 8000,
				status: 'inactive', // Should not be included
			});
		});

		it('should return unique cities from active packages only', async () => {
			const cities = await PackageService.getAvailableCities();

			expect(cities).toContain('Mumbai');
			expect(cities).toContain('Delhi');
			expect(cities).not.toContain('Bangalore');
			expect(cities.length).toBe(2);
		});

		it('should return cities in sorted order', async () => {
			const cities = await PackageService.getAvailableCities();

			expect(cities[0]).toBe('Delhi');
			expect(cities[1]).toBe('Mumbai');
		});

		it('should return empty array when no active packages exist', async () => {
			await clearDatabase();

			const cities = await PackageService.getAvailableCities();

			expect(cities).toEqual([]);
		});
	});
});
