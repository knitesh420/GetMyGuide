import PackageDB from '@mongo/repo/Package';

import { expectParity, makeRequest, normalise } from '../helpers/parity';
import { clearDatabase, connectTestDB, disconnectTestDB } from '../setup/db.setup';

/**
 * Native package Route Handlers vs the Express adapter.
 *
 * The package module is the one that never adopted `Respond()`: it answers
 * `{ success, data }` and `{ success, count, data }`, and its malformed-id and
 * not-found replies are bare `{ success: false, message }` bodies. Reproducing
 * that — rather than tidying it into the envelope the rest of the API uses — is
 * most of what these tests pin.
 *
 * The other load-bearing detail is step ORDER. In Express, multer and the
 * validator were middleware while the id check lived in the controller behind
 * them, so an invalid body sent to a malformed id reports the validation
 * failure, not "Invalid ID".
 */

describe('package routes — native vs Express parity', () => {
	jest.setTimeout(120_000);

	beforeAll(async () => {
		process.env.DATABASE_URL = await connectTestDB();
	});

	afterAll(async () => {
		await disconnectTestDB();
	});

	beforeEach(async () => {
		await clearDatabase();
	});

	const imageBlob = () =>
		new Blob(
			[
				Buffer.from(
					'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
					'base64'
				),
			],
			{ type: 'image/png' }
		);

	const englishTranslation = (overrides: Record<string, unknown> = {}) => ({
		title: 'Test Package',
		city: 'Mumbai',
		shortDescription: 'A short description',
		description: '<p>A detailed description</p>',
		places: ['Taj Mahal', 'Red Fort'],
		inclusions: ['Guide', 'Transport'],
		exclusions: ['Meals'],
		highlights: ['Sunset view'],
		...overrides,
	});

	const seedPackage = (overrides: Record<string, unknown> = {}) =>
		PackageDB.create({
			price: 5000,
			numberOfPeople: 2,
			numberOfDays: 3,
			featured: false,
			status: 'active',
			translations: { en: englishTranslation() },
			images: [{ url: 'https://res.cloudinary.com/test/a.jpg', publicId: 'packages/a' }],
			...overrides,
		});

	const KNOWN_MISSING_ID = '6a6c20eae45d663d657bb397';

	describe('public listing', () => {
		it('GET /package — the envelope is { success, count, data }, not spread', async () => {
			await seedPackage();
			await seedPackage({ status: 'inactive' });

			const { GET } = await import('@/app/api/package/route');
			const result = await expectParity('/api/package', {}, GET);

			expect(result.status).toBe(200);

			const body = result.body as { success: boolean; count: number; data: unknown[] };
			expect(body.success).toBe(true);
			// The inactive package is filtered out of the public listing.
			expect(body.count).toBe(1);
			expect(Array.isArray(body.data)).toBe(true);
		});

		it('GET /package?featured=true&limit=1 — both parameters are honoured', async () => {
			await seedPackage({ featured: true });
			await seedPackage({ featured: true });
			await seedPackage({ featured: false });

			const { GET } = await import('@/app/api/package/route');
			const result = await expectParity('/api/package?featured=true&limit=1', {}, GET);

			expect(result.status).toBe(200);
			expect((result.body as { count: number }).count).toBe(1);
		});

		it('GET /package?limit=9999 — the limit is clamped, not trusted', async () => {
			await seedPackage();

			const { GET } = await import('@/app/api/package/route');
			const result = await expectParity('/api/package?limit=9999', {}, GET);

			expect(result.status).toBe(200);
		});
	});

	describe('single package read', () => {
		it('GET /package/:id — a malformed id is a bare 400, not the error envelope', async () => {
			const { GET } = await import('@/app/api/package/[id]/route');
			const result = await expectParity('/api/package/nope', {}, (request) =>
				GET(request, { params: Promise.resolve({ id: 'nope' }) } as never)
			);

			expect(result.status).toBe(400);
			// No `title`/`error` keys — this module answers outside the envelope.
			expect(result.body).toEqual({ success: false, message: 'Invalid ID' });
		});

		it('GET /package/:id — a well-formed unknown id is a 404', async () => {
			const { GET } = await import('@/app/api/package/[id]/route');
			const result = await expectParity(`/api/package/${KNOWN_MISSING_ID}`, {}, (request) =>
				GET(request, { params: Promise.resolve({ id: KNOWN_MISSING_ID }) } as never)
			);

			expect(result.status).toBe(404);
			expect(result.body).toEqual({ success: false, message: 'Package not found' });
		});

		it('GET /package/:id — an inactive package is a 404 to the public', async () => {
			const pkg = await seedPackage({ status: 'inactive' });
			const id = pkg._id.toString();

			const { GET } = await import('@/app/api/package/[id]/route');
			const result = await expectParity(`/api/package/${id}`, {}, (request) =>
				GET(request, { params: Promise.resolve({ id }) } as never)
			);

			expect(result.status).toBe(404);
		});

		it('GET /package/:id — an active package is returned', async () => {
			const pkg = await seedPackage();
			const id = pkg._id.toString();

			const { GET } = await import('@/app/api/package/[id]/route');
			const result = await expectParity(`/api/package/${id}`, {}, (request) =>
				GET(request, { params: Promise.resolve({ id }) } as never)
			);

			expect(result.status).toBe(200);
			expect((result.body as { data: { price: number } }).data.price).toBe(5000);
		});
	});

	describe('admin listing', () => {
		it('GET /package/admin/all — unauthenticated', async () => {
			const { GET } = await import('@/app/api/package/admin/all/route');
			const result = await expectParity('/api/package/admin/all', {}, GET);

			expect(result.status).toBe(401);
		});

		it('GET /package/admin/all — a tourist is refused', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const { token } = await createAuthedUser('tourist');

			const { GET } = await import('@/app/api/package/admin/all/route');
			const result = await expectParity('/api/package/admin/all', { token }, GET);

			expect(result.status).toBe(403);
		});

		it('GET /package/admin/all — an admin sees inactive packages too', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const { token } = await createAuthedUser('admin');
			await seedPackage();
			await seedPackage({ status: 'inactive' });

			const { GET } = await import('@/app/api/package/admin/all/route');
			const result = await expectParity('/api/package/admin/all', { token }, GET);

			expect(result.status).toBe(200);
			expect((result.body as { count: number }).count).toBe(2);
		});
	});

	describe('create', () => {
		it('POST /package — unauthenticated', async () => {
			const { POST } = await import('@/app/api/package/route');
			const result = await expectParity('/api/package', { json: { price: '1' } }, POST);

			expect(result.status).toBe(401);
		});

		it('POST /package — a tourist is refused', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const { token } = await createAuthedUser('tourist');

			const { POST } = await import('@/app/api/package/route');
			const result = await expectParity('/api/package', { token, json: { price: '1' } }, POST);

			expect(result.status).toBe(403);
		});

		it('POST /package — validation is reported before the missing image', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const { token } = await createAuthedUser('admin');

			// No images AND no price. Express ran the validator (middleware) before
			// the controller's image check, so `price` is what comes back.
			const { POST } = await import('@/app/api/package/route');
			const result = await expectParity('/api/package', { token, json: {} }, POST);

			expect(result.status).toBe(400);
			expect((result.body as { message: string }).message).toContain('price');
		});

		it('POST /package — a valid body with no image is refused', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const { token } = await createAuthedUser('admin');

			const { POST } = await import('@/app/api/package/route');
			const result = await expectParity(
				'/api/package',
				{
					token,
					json: {
						price: '5000',
						numberOfPeople: '2',
						numberOfDays: '3',
						translations: { en: englishTranslation() },
					},
				},
				POST
			);

			expect(result.status).toBe(400);
			expect(result.body).toEqual({
				success: false,
				message: 'Package images are required',
			});
		});

		it('POST /package — malformed translations JSON is reported as such', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const { token } = await createAuthedUser('admin');

			const form = new FormData();
			form.append('price', '5000');
			form.append('numberOfPeople', '2');
			form.append('numberOfDays', '3');
			form.append('translations', '{bad json');
			form.append('images', imageBlob(), 'a.png');

			const { POST } = await import('@/app/api/package/route');
			const result = await expectParity('/api/package', { token, method: 'POST', body: form }, POST);

			expect(result.status).toBe(400);
			expect((result.body as { message: string }).message).toContain('Invalid translations JSON');
		});

		it('POST /package — multipart create uploads every image', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const { token } = await createAuthedUser('admin');

			const form = new FormData();
			form.append('price', '5000');
			form.append('numberOfPeople', '2');
			form.append('numberOfDays', '3');
			form.append('featured', 'true');
			form.append('translations', JSON.stringify({ en: englishTranslation() }));
			form.append('images', imageBlob(), 'a.png');
			form.append('images', imageBlob(), 'b.png');

			const { POST } = await import('@/app/api/package/route');
			const response = await POST(
				makeRequest('/api/package', { token, method: 'POST', body: form })
			);
			const result = await normalise(response);

			expect(result.status).toBe(201);

			const pkg = (result.body as { data: Record<string, unknown> }).data;
			expect(pkg.featured).toBe(true);
			expect(pkg.price).toBe(5000);
			// Both files reached Cloudinary and their URLs — not filenames — persist.
			expect((pkg.images as unknown[]).length).toBe(2);
			expect((pkg.images as { url: string }[])[0].url).toContain('res.cloudinary.com');
			// The list fields survive the multipart JSON round-trip.
			const translations = pkg.translations as { en: { places: string[] } };
			expect(translations.en.places).toEqual(['Taj Mahal', 'Red Fort']);
		});
	});

	describe('update and delete', () => {
		it('PATCH /package/:id — a tourist is refused', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const { token } = await createAuthedUser('tourist');

			const { PATCH } = await import('@/app/api/package/[id]/route');
			const result = await expectParity(
				`/api/package/${KNOWN_MISSING_ID}`,
				{ token, method: 'PATCH', json: { price: '10' } },
				(request) => PATCH(request, { params: Promise.resolve({ id: KNOWN_MISSING_ID }) } as never)
			);

			expect(result.status).toBe(403);
		});

		it('PATCH /package/:id — an invalid body beats a malformed id', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const { token } = await createAuthedUser('admin');

			const { PATCH } = await import('@/app/api/package/[id]/route');
			const result = await expectParity(
				'/api/package/nope',
				{ token, method: 'PATCH', json: { price: '-1' } },
				(request) => PATCH(request, { params: Promise.resolve({ id: 'nope' }) } as never)
			);

			expect(result.status).toBe(400);
			expect((result.body as { message: string }).message).toContain('price must be >= 0');
		});

		it('PATCH /package/:id — a malformed id with a valid body is "Invalid ID"', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const { token } = await createAuthedUser('admin');

			const { PATCH } = await import('@/app/api/package/[id]/route');
			const result = await expectParity(
				'/api/package/nope',
				{ token, method: 'PATCH', json: { price: '10' } },
				(request) => PATCH(request, { params: Promise.resolve({ id: 'nope' }) } as never)
			);

			expect(result.status).toBe(400);
			expect(result.body).toEqual({ success: false, message: 'Invalid ID' });
		});

		it('PATCH /package/:id — new images append to the existing ones', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const { token } = await createAuthedUser('admin');
			const pkg = await seedPackage();
			const id = pkg._id.toString();

			const form = new FormData();
			form.append('price', '7000');
			form.append('images', imageBlob(), 'c.png');

			const { PATCH } = await import('@/app/api/package/[id]/route');
			const response = await PATCH(
				makeRequest(`/api/package/${id}`, { token, method: 'PATCH', body: form }),
				{ params: Promise.resolve({ id }) } as never
			);
			const result = await normalise(response);

			expect(result.status).toBe(200);

			const updated = (result.body as { data: Record<string, unknown> }).data;
			expect(updated.price).toBe(7000);
			// One seeded plus one uploaded — appended, not replaced.
			expect((updated.images as unknown[]).length).toBe(2);
		});

		it('DELETE /package/:id — unknown id is a 404', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const { token } = await createAuthedUser('admin');

			const { DELETE } = await import('@/app/api/package/[id]/route');
			const result = await expectParity(
				`/api/package/${KNOWN_MISSING_ID}`,
				{ token, method: 'DELETE' },
				(request) => DELETE(request, { params: Promise.resolve({ id: KNOWN_MISSING_ID }) } as never)
			);

			expect(result.status).toBe(404);
		});

		it('DELETE /package/:id — the document goes before its Cloudinary assets', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const { token } = await createAuthedUser('admin');
			const pkg = await seedPackage();
			const id = pkg._id.toString();

			const cloudinary = (await import('@config/cloudinary')).default;
			// A destroy failure must not turn a successful delete into a 500: the
			// document is already gone, so the worst case is an orphaned asset.
			(cloudinary.uploader.destroy as jest.Mock).mockRejectedValueOnce(new Error('cloudinary down'));

			const { DELETE } = await import('@/app/api/package/[id]/route');
			const response = await DELETE(
				makeRequest(`/api/package/${id}`, { token, method: 'DELETE' }),
				{ params: Promise.resolve({ id }) } as never
			);
			const result = await normalise(response);

			expect(result.status).toBe(200);
			expect(result.body).toEqual({
				success: true,
				message: 'Package deleted successfully',
			});
			expect(await PackageDB.findById(id)).toBeNull();
		});
	});
});
