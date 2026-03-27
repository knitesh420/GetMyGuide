import AuthService from '@services/auth';
import express from 'express';
import fs from 'fs';
import path from 'path';
import request from 'supertest';
import configServer from '../../src/server-config';
import { testSignupData, testUser } from '../helpers/fixtures';
import { clearDatabase, connectTestDB, disconnectTestDB } from '../setup/db.setup';

describe('Package API Integration Tests', () => {
	let app: express.Application;
	let adminToken: string;
	let userToken: string;
	const testUploadDir = path.join(__dirname, '../../static/misc');
	const testPackagesDir = path.join(__dirname, '../../static/packages');

	// Create test image buffer
	const createImageBuffer = () => {
		return Buffer.from(
			'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
			'base64'
		);
	};

	beforeAll(async () => {
		await connectTestDB();
		app = express();
		configServer(app as express.Express);

		// Ensure test upload directories exist
		if (!fs.existsSync(testUploadDir)) {
			fs.mkdirSync(testUploadDir, { recursive: true });
		}
		if (!fs.existsSync(testPackagesDir)) {
			fs.mkdirSync(testPackagesDir, { recursive: true });
		}

		// Create admin user
		const adminData = { ...testSignupData, email: 'admin@example.com', role: 'admin' as const };
		const adminResult = await AuthService.signup(adminData);
		adminToken = adminResult.token;

		// Create regular user
		const userResult = await AuthService.signup(testUser);
		userToken = userResult.token;
	});

	afterAll(async () => {
		await disconnectTestDB();
		// Clean up test files
		[testUploadDir, testPackagesDir].forEach((dir) => {
			if (fs.existsSync(dir)) {
				const files = fs.readdirSync(dir);
				files.forEach((file) => {
					try {
						fs.unlinkSync(path.join(dir, file));
					} catch {
						// Ignore errors during cleanup
					}
				});
			}
		});
	});

	beforeEach(async () => {
		await clearDatabase();

		// Recreate admin and user after clearing database
		const adminData = { ...testSignupData, email: 'admin@example.com', role: 'admin' as const };
		const adminResult = await AuthService.signup(adminData);
		adminToken = adminResult.token;

		const userResult = await AuthService.signup(testUser);
		userToken = userResult.token;
	});

	describe('POST /package', () => {
		it('should successfully create a package with images (admin)', async () => {
			const imageBuffer1 = createImageBuffer();
			const imageBuffer2 = createImageBuffer();

			const response = await request(app)
				.post('/package')
				.set('Authorization', `Bearer ${adminToken}`)
				.field('title', 'Test Package')
				.field('city', 'Mumbai')
				.field('places', JSON.stringify(['Taj Mahal', 'Red Fort']))
				.field('price', '5000')
				.field('featured', 'false')
				.attach('images', imageBuffer1, 'test-image-1.jpg')
				.attach('images', imageBuffer2, 'test-image-2.jpg');

			expect(response.status).toBe(201);
			expect(response.body.success).toBe(true);
			expect(response.body).toBeDefined();
			expect(response.body.title).toBe('Test Package');
			expect(response.body.city).toBe('Mumbai');
			expect(response.body.places).toEqual(['Taj Mahal', 'Red Fort']);
			expect(response.body.price).toBe(5000);
			expect(response.body.featured).toBe(false);
			expect(response.body.status).toBe('inactive');
			expect(response.body.images).toBeInstanceOf(Array);
			expect(response.body.images.length).toBe(2);
			expect(response.body).toHaveProperty('id');
			expect(response.body).not.toHaveProperty('_id');
		});

		it('should create package with all optional fields', async () => {
			const imageBuffer = createImageBuffer();

			const response = await request(app)
				.post('/package')
				.set('Authorization', `Bearer ${adminToken}`)
				.field('title', 'Premium Package')
				.field('city', 'Delhi')
				.field('places', JSON.stringify(['India Gate']))
				.field('price', '10000')
				.field('shortDescription', 'A premium tour')
				.field('description', 'Detailed description')
				.field('inclusions', JSON.stringify(['Breakfast', 'Lunch']))
				.field('exclusions', JSON.stringify(['Dinner']))
				.field('featured', 'true')
				.attach('images', imageBuffer, 'test-image.jpg');

			expect(response.status).toBe(201);
			expect(response.body.shortDescription).toBe('A premium tour');
			expect(response.body.description).toBe('Detailed description');
			expect(response.body.inclusions).toEqual(['Breakfast', 'Lunch']);
			expect(response.body.exclusions).toEqual(['Dinner']);
			expect(response.body.featured).toBe(true);
		});

		it('should return 401 when user is not authenticated', async () => {
			const imageBuffer = createImageBuffer();

			const response = await request(app)
				.post('/package')
				.field('title', 'Test Package')
				.field('city', 'Mumbai')
				.field('places', JSON.stringify(['Place 1']))
				.field('price', '5000')
				.attach('images', imageBuffer, 'test-image.jpg');

			expect(response.status).toBe(401);
		});

		it('should return 401 when non-admin user tries to create package', async () => {
			const imageBuffer = createImageBuffer();

			const response = await request(app)
				.post('/package')
				.set('Authorization', `Bearer ${userToken}`)
				.field('title', 'Test Package')
				.field('city', 'Mumbai')
				.field('places', JSON.stringify(['Place 1']))
				.field('price', '5000')
				.attach('images', imageBuffer, 'test-image.jpg');

			expect(response.status).toBe(401);
		});

		it('should return 400 when images are missing', async () => {
			const response = await request(app)
				.post('/package')
				.set('Authorization', `Bearer ${adminToken}`)
				.field('title', 'Test Package')
				.field('city', 'Mumbai')
				.field('places', JSON.stringify(['Place 1']))
				.field('price', '5000');

			expect(response.status).toBe(400);
		});

		it('should return 400 when required fields are missing', async () => {
			const imageBuffer = createImageBuffer();

			const response = await request(app)
				.post('/package')
				.set('Authorization', `Bearer ${adminToken}`)
				.field('title', 'Test Package')
				.attach('images', imageBuffer, 'test-image.jpg');

			expect(response.status).toBe(400);
		});
	});

	describe('GET /package', () => {
		let packageId1: string;

		beforeEach(async () => {
			const imageBuffer = createImageBuffer();

			// Create active package
			const response1 = await request(app)
				.post('/package')
				.set('Authorization', `Bearer ${adminToken}`)
				.field('title', 'Active Package')
				.field('city', 'Mumbai')
				.field('places', JSON.stringify(['Place 1']))
				.field('price', '5000')
				.attach('images', imageBuffer, 'test-image-1.jpg');

			packageId1 = response1.body.id;

			// Update status to active
			await request(app)
				.post(`/package/${packageId1}/update-status`)
				.set('Authorization', `Bearer ${adminToken}`)
				.send({ status: 'active' });

			// Create inactive package
			await request(app)
				.post('/package')
				.set('Authorization', `Bearer ${adminToken}`)
				.field('title', 'Inactive Package')
				.field('city', 'Delhi')
				.field('places', JSON.stringify(['Place 2']))
				.field('price', '6000')
				.attach('images', imageBuffer, 'test-image-2.jpg');
		});

		it('should get only active packages for public users', async () => {
			const response = await request(app).get('/package');

			expect(response.status).toBe(200);
			expect(response.body.success).toBe(true);
			expect(response.body.packages).toBeInstanceOf(Array);
			expect(response.body.packages.length).toBe(1);
			expect(response.body.packages[0].status).toBe('active');
			expect(response.body.packages[0]).toHaveProperty('id');
			expect(response.body.packages[0]).not.toHaveProperty('_id');
		});

		it('should get all packages for admin users', async () => {
			const response = await request(app)
				.get('/package')
				.set('Authorization', `Bearer ${adminToken}`);

			expect(response.status).toBe(200);
			expect(response.body.packages.length).toBeGreaterThanOrEqual(2);
		});

		it('should filter by featured status', async () => {
			// Make package featured
			await request(app)
				.patch(`/package/${packageId1}`)
				.set('Authorization', `Bearer ${adminToken}`)
				.send({ featured: true });

			const response = await request(app).get('/package?featured=true');

			expect(response.status).toBe(200);
			response.body.packages.forEach((pkg: any) => {
				expect(pkg.featured).toBe(true);
				expect(pkg.status).toBe('active');
			});
		});

		it('should filter by city', async () => {
			const response = await request(app).get('/package?city=Mumbai');

			expect(response.status).toBe(200);
			response.body.packages.forEach((pkg: any) => {
				expect(pkg.city).toBe('Mumbai');
				expect(pkg.status).toBe('active');
			});
		});

		it('should combine featured and city filters', async () => {
			await request(app)
				.patch(`/package/${packageId1}`)
				.set('Authorization', `Bearer ${adminToken}`)
				.send({ featured: true });

			const response = await request(app).get('/package?featured=true&city=Mumbai');

			expect(response.status).toBe(200);
			response.body.packages.forEach((pkg: any) => {
				expect(pkg.featured).toBe(true);
				expect(pkg.city).toBe('Mumbai');
				expect(pkg.status).toBe('active');
			});
		});
	});

	describe('GET /package/:id', () => {
		let activePackageId: string;
		let inactivePackageId: string;

		beforeEach(async () => {
			const imageBuffer = createImageBuffer();

			// Create active package
			const response1 = await request(app)
				.post('/package')
				.set('Authorization', `Bearer ${adminToken}`)
				.field('title', 'Active Package')
				.field('city', 'Mumbai')
				.field('places', JSON.stringify(['Place 1']))
				.field('price', '5000')
				.attach('images', imageBuffer, 'test-image-1.jpg');

			activePackageId = response1.body.id;

			await request(app)
				.post(`/package/${activePackageId}/update-status`)
				.set('Authorization', `Bearer ${adminToken}`)
				.send({ status: 'active' });

			// Create inactive package
			const response2 = await request(app)
				.post('/package')
				.set('Authorization', `Bearer ${adminToken}`)
				.field('title', 'Inactive Package')
				.field('city', 'Delhi')
				.field('places', JSON.stringify(['Place 2']))
				.field('price', '6000')
				.attach('images', imageBuffer, 'test-image-2.jpg');

			inactivePackageId = response2.body.id;
		});

		it('should get active package by id (public route)', async () => {
			const response = await request(app).get(`/package/${activePackageId}`);

			expect(response.status).toBe(200);
			expect(response.body.success).toBe(true);
			expect(response.body.id).toBe(activePackageId);
			expect(response.body.title).toBe('Active Package');
			expect(response.body.status).toBe('active');
			expect(response.body).toHaveProperty('id');
			expect(response.body).not.toHaveProperty('_id');
		});

		it('should return 404 for inactive package (public)', async () => {
			const response = await request(app).get(`/package/${inactivePackageId}`);

			expect(response.status).toBe(404);
		});

		it('should get inactive package by id (admin)', async () => {
			const response = await request(app)
				.get(`/package/${inactivePackageId}`)
				.set('Authorization', `Bearer ${adminToken}`);

			expect(response.status).toBe(200);
			expect(response.body.id).toBe(inactivePackageId);
			expect(response.body.status).toBe('inactive');
		});

		it('should return 400 for invalid package id format', async () => {
			const response = await request(app).get('/package/invalid-id');

			expect(response.status).toBe(400);
		});

		it('should return 404 for non-existent package id', async () => {
			const fakeId = '507f1f77bcf86cd799439011';
			const response = await request(app).get(`/package/${fakeId}`);

			expect(response.status).toBe(404);
		});
	});

	describe('PATCH /package/:id', () => {
		let packageId: string;

		beforeEach(async () => {
			const imageBuffer = createImageBuffer();

			const response = await request(app)
				.post('/package')
				.set('Authorization', `Bearer ${adminToken}`)
				.field('title', 'Original Title')
				.field('city', 'Mumbai')
				.field('places', JSON.stringify(['Place 1']))
				.field('price', '5000')
				.attach('images', imageBuffer, 'test-image.jpg');

			packageId = response.body.id;
		});

		it('should update package fields (admin)', async () => {
			const response = await request(app)
				.patch(`/package/${packageId}`)
				.set('Authorization', `Bearer ${adminToken}`)
				.send({
					title: 'Updated Title',
					price: 6000,
					featured: true,
				});

			expect(response.status).toBe(200);
			expect(response.body.title).toBe('Updated Title');
			expect(response.body.price).toBe(6000);
			expect(response.body.featured).toBe(true);
		});

		it('should update package with new images (admin)', async () => {
			const newImageBuffer = createImageBuffer();

			const response = await request(app)
				.patch(`/package/${packageId}`)
				.set('Authorization', `Bearer ${adminToken}`)
				.field('title', 'Updated with Images')
				.attach('images', newImageBuffer, 'new-image.jpg');

			expect(response.status).toBe(200);
			expect(response.body.images).toBeInstanceOf(Array);
			expect(response.body.images.length).toBe(1);
		});

		it('should return 401 when non-admin tries to update', async () => {
			const response = await request(app)
				.patch(`/package/${packageId}`)
				.set('Authorization', `Bearer ${userToken}`)
				.send({ title: 'Updated Title' });

			expect(response.status).toBe(401);
		});

		it('should return 404 for non-existent package', async () => {
			const fakeId = '507f1f77bcf86cd799439011';
			const response = await request(app)
				.patch(`/package/${fakeId}`)
				.set('Authorization', `Bearer ${adminToken}`)
				.send({ title: 'Updated Title' });

			expect(response.status).toBe(404);
		});
	});

	describe('DELETE /package/:id', () => {
		let packageId: string;

		beforeEach(async () => {
			const imageBuffer = createImageBuffer();

			const response = await request(app)
				.post('/package')
				.set('Authorization', `Bearer ${adminToken}`)
				.field('title', 'Package to Delete')
				.field('city', 'Mumbai')
				.field('places', JSON.stringify(['Place 1']))
				.field('price', '5000')
				.attach('images', imageBuffer, 'test-image.jpg');

			packageId = response.body.id;
		});

		it('should delete package (admin)', async () => {
			const response = await request(app)
				.delete(`/package/${packageId}`)
				.set('Authorization', `Bearer ${adminToken}`);

			expect(response.status).toBe(200);
			expect(response.body.message).toBe('Package deleted successfully');

			// Verify package is deleted
			const getResponse = await request(app)
				.get(`/package/${packageId}`)
				.set('Authorization', `Bearer ${adminToken}`);

			expect(getResponse.status).toBe(404);
		});

		it('should return 401 when non-admin tries to delete', async () => {
			const response = await request(app)
				.delete(`/package/${packageId}`)
				.set('Authorization', `Bearer ${userToken}`);

			expect(response.status).toBe(401);
		});

		it('should return 404 for non-existent package', async () => {
			const fakeId = '507f1f77bcf86cd799439011';
			const response = await request(app)
				.delete(`/package/${fakeId}`)
				.set('Authorization', `Bearer ${adminToken}`);

			expect(response.status).toBe(404);
		});
	});

	describe('POST /package/:id/update-status', () => {
		let packageId: string;

		beforeEach(async () => {
			const imageBuffer = createImageBuffer();

			const response = await request(app)
				.post('/package')
				.set('Authorization', `Bearer ${adminToken}`)
				.field('title', 'Status Test Package')
				.field('city', 'Mumbai')
				.field('places', JSON.stringify(['Place 1']))
				.field('price', '5000')
				.attach('images', imageBuffer, 'test-image.jpg');

			packageId = response.body.id;
		});

		it('should update package status to active (admin)', async () => {
			const response = await request(app)
				.post(`/package/${packageId}/update-status`)
				.set('Authorization', `Bearer ${adminToken}`)
				.send({ status: 'active' });

			expect(response.status).toBe(200);
			expect(response.body.status).toBe('active');
		});

		it('should update package status to inactive (admin)', async () => {
			// First set to active
			await request(app)
				.post(`/package/${packageId}/update-status`)
				.set('Authorization', `Bearer ${adminToken}`)
				.send({ status: 'active' });

			// Then set to inactive
			const response = await request(app)
				.post(`/package/${packageId}/update-status`)
				.set('Authorization', `Bearer ${adminToken}`)
				.send({ status: 'inactive' });

			expect(response.status).toBe(200);
			expect(response.body.status).toBe('inactive');
		});

		it('should return 401 when non-admin tries to update status', async () => {
			const response = await request(app)
				.post(`/package/${packageId}/update-status`)
				.set('Authorization', `Bearer ${userToken}`)
				.send({ status: 'active' });

			expect(response.status).toBe(401);
		});

		it('should return 400 for invalid status', async () => {
			const response = await request(app)
				.post(`/package/${packageId}/update-status`)
				.set('Authorization', `Bearer ${adminToken}`)
				.send({ status: 'invalid' });

			expect(response.status).toBe(400);
		});
	});

	describe('GET /package/available-cities', () => {
		beforeEach(async () => {
			const imageBuffer = createImageBuffer();

			// Create active packages in different cities
			const response1 = await request(app)
				.post('/package')
				.set('Authorization', `Bearer ${adminToken}`)
				.field('title', 'Mumbai Package')
				.field('city', 'Mumbai')
				.field('places', JSON.stringify(['Place 1']))
				.field('price', '5000')
				.attach('images', imageBuffer, 'test-image-1.jpg');

			await request(app)
				.post(`/package/${response1.body.id}/update-status`)
				.set('Authorization', `Bearer ${adminToken}`)
				.send({ status: 'active' });

			const response2 = await request(app)
				.post('/package')
				.set('Authorization', `Bearer ${adminToken}`)
				.field('title', 'Delhi Package')
				.field('city', 'Delhi')
				.field('places', JSON.stringify(['Place 2']))
				.field('price', '6000')
				.attach('images', imageBuffer, 'test-image-2.jpg');

			await request(app)
				.post(`/package/${response2.body.id}/update-status`)
				.set('Authorization', `Bearer ${adminToken}`)
				.send({ status: 'active' });

			// Create inactive package (should not be included)
			await request(app)
				.post('/package')
				.set('Authorization', `Bearer ${adminToken}`)
				.field('title', 'Inactive Package')
				.field('city', 'Bangalore')
				.field('places', JSON.stringify(['Place 3']))
				.field('price', '7000')
				.attach('images', imageBuffer, 'test-image-3.jpg');
		});

		it('should return available cities from active packages (public route)', async () => {
			const response = await request(app).get('/package/available-cities');

			expect(response.status).toBe(200);
			expect(response.body.success).toBe(true);
			expect(response.body.cities).toBeInstanceOf(Array);
			expect(response.body.cities.length).toBe(2);
			expect(response.body.cities).toContain('Mumbai');
			expect(response.body.cities).toContain('Delhi');
			expect(response.body.cities).not.toContain('Bangalore');
		});

		it('should return cities in sorted order', async () => {
			const response = await request(app).get('/package/available-cities');

			expect(response.status).toBe(200);
			expect(response.body.cities[0]).toBe('Delhi');
			expect(response.body.cities[1]).toBe('Mumbai');
		});
	});
});
