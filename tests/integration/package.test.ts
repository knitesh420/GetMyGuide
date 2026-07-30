import PackageDB from '@mongo/repo/Package';
import AuthService from '@services/auth';
import express from 'express';
import request from 'supertest';
import configServer from '../../src/server-config';
import { testSignupData, testUser } from '../helpers/fixtures';
import { clearDatabase, connectTestDB, disconnectTestDB } from '../setup/db.setup';

/**
 * Packages are localised: the text fields live under `translations.<locale>`
 * and English is mandatory on create. Everything numeric (price, group size,
 * duration) stays at the top level, and at least one image must be uploaded —
 * the controller pushes each file to Cloudinary before writing the document.
 *
 * Responses from this module are `{ success, data }` (and `{ success, count,
 * data }` for the listings) rather than the flattened Respond() envelope the
 * rest of the API uses.
 */
describe('Package API Integration Tests', () => {
	let app: express.Application;
	let adminToken: string;
	let userToken: string;

	const createImageBuffer = () =>
		Buffer.from(
			'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
			'base64'
		);

	/** A complete English translation — every field the validator insists on. */
	const englishTranslation = (overrides: Record<string, unknown> = {}) => ({
		title: 'Test Package',
		city: 'Mumbai',
		shortDescription: 'A short description',
		description: '<p>A detailed description of the package</p>',
		places: ['Taj Mahal', 'Red Fort'],
		inclusions: ['Guide', 'Transport'],
		exclusions: ['Meals'],
		highlights: ['Sunset view'],
		...overrides,
	});

	/** POST /package with the multipart shape the route expects. */
	const postPackage = (
		fields: {
			price?: string;
			numberOfPeople?: string;
			numberOfDays?: string;
			featured?: string;
			translations?: string;
		} = {},
		{ images = 1, token = adminToken }: { images?: number; token?: string } = {}
	) => {
		const body = {
			price: '5000',
			numberOfPeople: '2',
			numberOfDays: '3',
			featured: 'false',
			translations: JSON.stringify({ en: englishTranslation() }),
			...fields,
		};

		const req = request(app).post('/package').set('Authorization', `Bearer ${token}`);
		Object.entries(body).forEach(([key, value]) => req.field(key, value));
		for (let i = 0; i < images; i += 1) {
			req.attach('images', createImageBuffer(), `test-image-${i + 1}.jpg`);
		}
		return req;
	};

	/** Seed a package directly, bypassing the upload path. */
	const seedPackage = (overrides: Record<string, unknown> = {}) =>
		PackageDB.create({
			price: 5000,
			numberOfPeople: 2,
			numberOfDays: 3,
			images: [{ url: 'https://res.cloudinary.com/test/a.jpg', publicId: 'packages/a' }],
			translations: { en: englishTranslation() },
			status: 'active',
			featured: false,
			...overrides,
		});

	beforeAll(async () => {
		await connectTestDB();
		app = express();
		configServer(app as express.Express);
	});

	afterAll(async () => {
		await disconnectTestDB();
	});

	beforeEach(async () => {
		await clearDatabase();

		const adminData = { ...testSignupData, email: 'admin@example.com', role: 'admin' as const };
		const adminResult = await AuthService.signup(adminData);
		adminToken = adminResult.accessToken;

		const userResult = await AuthService.signup(testUser);
		userToken = userResult.accessToken;
	});

	describe('POST /package', () => {
		it('should successfully create a package with images (admin)', async () => {
			const response = await postPackage({}, { images: 2 });

			expect(response.status).toBe(201);
			expect(response.body.success).toBe(true);
			expect(response.body.data.price).toBe(5000);
			expect(response.body.data.numberOfPeople).toBe(2);
			expect(response.body.data.numberOfDays).toBe(3);
			expect(response.body.data.featured).toBe(false);
			expect(response.body.data.translations.en.title).toBe('Test Package');
			expect(response.body.data.translations.en.city).toBe('Mumbai');
			expect(response.body.data.translations.en.places).toEqual(['Taj Mahal', 'Red Fort']);
			expect(response.body.data.images).toHaveLength(2);
			expect(response.body.data.images[0].url).toEqual(expect.any(String));
			expect(response.body.data.images[0].publicId).toEqual(expect.any(String));
		});

		it('should default status to active', async () => {
			const response = await postPackage();

			expect(response.status).toBe(201);
			// A package an admin creates is on sale immediately; withdrawing it is
			// an explicit switch to 'inactive'.
			expect(response.body.data.status).toBe('active');
		});

		it('should create a featured package with extra locales', async () => {
			const response = await postPackage({
				featured: 'true',
				translations: JSON.stringify({
					en: englishTranslation(),
					fr: englishTranslation({ title: 'Forfait test', city: 'Bombay' }),
				}),
			});

			expect(response.status).toBe(201);
			expect(response.body.data.featured).toBe(true);
			expect(response.body.data.translations.fr.title).toBe('Forfait test');
		});

		it('should return 400 when no image is attached', async () => {
			const response = await postPackage({}, { images: 0 });

			expect(response.status).toBe(400);
		});

		it('should return 400 when the English translation is missing', async () => {
			const response = await postPackage({
				translations: JSON.stringify({ fr: englishTranslation() }),
			});

			expect(response.status).toBe(400);
		});

		it('should return 400 when an English field is blank', async () => {
			const response = await postPackage({
				translations: JSON.stringify({ en: englishTranslation({ title: '  ' }) }),
			});

			expect(response.status).toBe(400);
		});

		it('should return 400 for a negative price', async () => {
			const response = await postPackage({ price: '-1' });

			expect(response.status).toBe(400);
		});

		it('should return 400 for invalid translations JSON', async () => {
			const response = await postPackage({ translations: '{not json' });

			expect(response.status).toBe(400);
		});

		it('should return 403 when a non-admin user tries to create a package', async () => {
			// 403, not 401: the tourist is authenticated, just not an admin.
			const response = await postPackage({}, { token: userToken });

			expect(response.status).toBe(403);
		});

		it('should return 401 when unauthenticated', async () => {
			const response = await request(app)
				.post('/package')
				.field('price', '5000')
				.attach('images', createImageBuffer(), 'test-image.jpg');

			expect(response.status).toBe(401);
		});
	});

	describe('GET /package', () => {
		beforeEach(async () => {
			await seedPackage({ translations: { en: englishTranslation({ title: 'Active One' }) } });
			await seedPackage({
				featured: true,
				translations: { en: englishTranslation({ title: 'Featured One', city: 'Delhi' }) },
			});
			await seedPackage({
				status: 'inactive',
				translations: { en: englishTranslation({ title: 'Hidden One' }) },
			});
		});

		it('should return only active packages (public route)', async () => {
			const response = await request(app).get('/package');

			expect(response.status).toBe(200);
			expect(response.body.success).toBe(true);
			expect(response.body.count).toBe(2);
			expect(response.body.data).toHaveLength(2);
			expect(
				response.body.data.every((pkg: { status: string }) => pkg.status === 'active')
			).toBe(true);
		});

		it('should filter by featured status', async () => {
			const response = await request(app).get('/package?featured=true');

			expect(response.status).toBe(200);
			expect(response.body.data).toHaveLength(1);
			expect(response.body.data[0].translations.en.title).toBe('Featured One');
		});

		it('should honour a limit', async () => {
			const response = await request(app).get('/package?limit=1');

			expect(response.status).toBe(200);
			expect(response.body.data).toHaveLength(1);
		});

		it('should sort newest first', async () => {
			const response = await request(app).get('/package');

			const [first, second] = response.body.data;
			expect(new Date(first.createdAt).getTime()).toBeGreaterThanOrEqual(
				new Date(second.createdAt).getTime()
			);
		});
	});

	describe('GET /package/admin/all', () => {
		beforeEach(async () => {
			await seedPackage();
			await seedPackage({ status: 'inactive' });
		});

		it('should return inactive packages too (admin)', async () => {
			// The admin table has to keep showing a withdrawn package, otherwise
			// there is no way left to switch it back on.
			const response = await request(app)
				.get('/package/admin/all')
				.set('Authorization', `Bearer ${adminToken}`);

			expect(response.status).toBe(200);
			expect(response.body.count).toBe(2);
		});

		it('should return 403 for a non-admin user', async () => {
			const response = await request(app)
				.get('/package/admin/all')
				.set('Authorization', `Bearer ${userToken}`);

			expect(response.status).toBe(403);
		});

		it('should return 401 when unauthenticated', async () => {
			const response = await request(app).get('/package/admin/all');

			expect(response.status).toBe(401);
		});
	});

	describe('GET /package/:id', () => {
		it('should get an active package by id (public route)', async () => {
			const pkg = await seedPackage();

			const response = await request(app).get(`/package/${pkg._id}`);

			expect(response.status).toBe(200);
			expect(response.body.success).toBe(true);
			expect(response.body.data._id).toBe(pkg._id.toString());
			expect(response.body.data.translations.en.title).toBe('Test Package');
		});

		it('should return 404 for an inactive package (public)', async () => {
			// A withdrawn package must not stay readable to anyone who knows its id.
			const pkg = await seedPackage({ status: 'inactive' });

			const response = await request(app).get(`/package/${pkg._id}`);

			expect(response.status).toBe(404);
		});

		it('should return 400 for a malformed id', async () => {
			const response = await request(app).get('/package/not-an-id');

			expect(response.status).toBe(400);
		});

		it('should return 404 for a well-formed id that matches nothing', async () => {
			const response = await request(app).get('/package/507f1f77bcf86cd799439011');

			expect(response.status).toBe(404);
		});
	});

	describe('PATCH /package/:id', () => {
		it('should update package fields (admin)', async () => {
			const pkg = await seedPackage();

			const response = await request(app)
				.patch(`/package/${pkg._id}`)
				.set('Authorization', `Bearer ${adminToken}`)
				.field('price', '7500')
				.field('numberOfDays', '5')
				.field('featured', 'true');

			expect(response.status).toBe(200);
			expect(response.body.success).toBe(true);
			expect(response.body.data.price).toBe(7500);
			expect(response.body.data.numberOfDays).toBe(5);
			expect(response.body.data.featured).toBe(true);
		});

		it('should switch a package to inactive (admin)', async () => {
			// Status is changed through PATCH — there is no separate
			// /:id/update-status endpoint.
			const pkg = await seedPackage();

			const response = await request(app)
				.patch(`/package/${pkg._id}`)
				.set('Authorization', `Bearer ${adminToken}`)
				.field('status', 'inactive');

			expect(response.status).toBe(200);
			expect(response.body.data.status).toBe('inactive');

			// And it drops out of the public listing.
			const listing = await request(app).get('/package');
			expect(listing.body.count).toBe(0);
		});

		it('should return 400 for an invalid status', async () => {
			const pkg = await seedPackage();

			const response = await request(app)
				.patch(`/package/${pkg._id}`)
				.set('Authorization', `Bearer ${adminToken}`)
				.field('status', 'archived');

			expect(response.status).toBe(400);
		});

		it('should append newly uploaded images (admin)', async () => {
			const pkg = await seedPackage();

			const response = await request(app)
				.patch(`/package/${pkg._id}`)
				.set('Authorization', `Bearer ${adminToken}`)
				.attach('images', createImageBuffer(), 'new-image.jpg');

			expect(response.status).toBe(200);
			expect(response.body.data.images).toHaveLength(2);
		});

		it('should update a single locale without dropping the others', async () => {
			const pkg = await seedPackage({
				translations: {
					en: englishTranslation(),
					fr: englishTranslation({ title: 'Forfait' }),
				},
			});

			const response = await request(app)
				.patch(`/package/${pkg._id}`)
				.set('Authorization', `Bearer ${adminToken}`)
				.field(
					'translations',
					JSON.stringify({ en: englishTranslation({ title: 'Renamed' }) })
				);

			expect(response.status).toBe(200);
			expect(response.body.data.translations.en.title).toBe('Renamed');
			expect(response.body.data.translations.fr.title).toBe('Forfait');
		});

		it('should return 404 for a package that does not exist', async () => {
			const response = await request(app)
				.patch('/package/507f1f77bcf86cd799439011')
				.set('Authorization', `Bearer ${adminToken}`)
				.field('price', '100');

			expect(response.status).toBe(404);
		});

		it('should return 403 when a non-admin tries to update', async () => {
			const pkg = await seedPackage();

			const response = await request(app)
				.patch(`/package/${pkg._id}`)
				.set('Authorization', `Bearer ${userToken}`)
				.field('price', '100');

			expect(response.status).toBe(403);
		});
	});

	describe('DELETE /package/:id', () => {
		it('should delete a package (admin)', async () => {
			const pkg = await seedPackage();

			const response = await request(app)
				.delete(`/package/${pkg._id}`)
				.set('Authorization', `Bearer ${adminToken}`);

			expect(response.status).toBe(200);
			expect(response.body.success).toBe(true);
			expect(await PackageDB.findById(pkg._id)).toBeNull();
		});

		it('should return 400 for a malformed id', async () => {
			const response = await request(app)
				.delete('/package/not-an-id')
				.set('Authorization', `Bearer ${adminToken}`);

			expect(response.status).toBe(400);
		});

		it('should return 404 for a package that does not exist', async () => {
			const response = await request(app)
				.delete('/package/507f1f77bcf86cd799439011')
				.set('Authorization', `Bearer ${adminToken}`);

			expect(response.status).toBe(404);
		});

		it('should return 403 when a non-admin tries to delete', async () => {
			const pkg = await seedPackage();

			const response = await request(app)
				.delete(`/package/${pkg._id}`)
				.set('Authorization', `Bearer ${userToken}`);

			expect(response.status).toBe(403);
		});

		it('should return 401 when unauthenticated', async () => {
			const pkg = await seedPackage();

			const response = await request(app).delete(`/package/${pkg._id}`);

			expect(response.status).toBe(401);
		});
	});
});
