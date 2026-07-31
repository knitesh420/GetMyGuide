import { LocationDB } from '@mongo';

import { expectParity, makeRequest, normalise } from '../helpers/parity';
import { clearDatabase, connectTestDB, disconnectTestDB } from '../setup/db.setup';

/**
 * Native location Route Handlers vs the Express adapter.
 *
 * Two things here are new to Phase 3 and get the most attention:
 *
 * 1. **Multipart.** This is the first module peeled across where the request
 *    body may arrive as multipart OR JSON — Express accepted both because
 *    `express.json()` and multer each populate `req.body` and the validator
 *    never knew which had run. Both shapes are exercised below.
 * 2. **The slug read.** `GET /locations/:id` has no id validator, on purpose:
 *    every public location URL on the site is a slug, and validating would 400
 *    all of them.
 */

describe('location routes — native vs Express parity', () => {
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

	/** A 1x1 PNG — enough to prove bytes reach the uploader. */
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

	const seedLocations = async () => {
		await LocationDB.create({
			name: 'Jaipur City Palace',
			slug: 'jaipur-city-palace',
			city: 'Jaipur',
			country: 'India',
			isActive: true,
			isPopular: true,
		});
		// Withdrawn from sale: must be invisible on the public listing and visible
		// on the admin one.
		await LocationDB.create({
			name: 'Closed Fort',
			slug: 'closed-fort',
			city: 'Jaipur',
			country: 'India',
			isActive: false,
			isPopular: false,
		});
	};

	describe('public reads', () => {
		it('GET /locations — the listing is a SPREAD array, not { data: [...] }', async () => {
			await seedLocations();

			const { GET } = await import('@/app/api/locations/route');
			const result = await expectParity('/api/locations', {}, GET);

			expect(result.status).toBe(200);

			// Respond() spreads its payload, so an array serialises index-keyed. This
			// is what lib/service/api.ts unwrap() decodes; a "cleaner" envelope would
			// resolve every field to undefined instead of throwing.
			const body = result.body as Record<string, unknown>;
			expect(body).toHaveProperty('0');
			expect(body).not.toHaveProperty('data');
			expect(body.success).toBe(true);

			// Only the active one; the withdrawn location is filtered out.
			expect(body).not.toHaveProperty('1');
			expect((body['0'] as { name: string }).name).toBe('Jaipur City Palace');
		});

		it('GET /locations?city=&popular= — filters agree', async () => {
			await seedLocations();

			const { GET } = await import('@/app/api/locations/route');
			const result = await expectParity('/api/locations?city=Jaipur&popular=true', {}, GET);

			expect(result.status).toBe(200);
		});

		it('GET /locations/:slug — resolves by slug, with no id validation', async () => {
			await seedLocations();

			const { GET } = await import('@/app/api/locations/[id]/route');
			const result = await expectParity(
				'/api/locations/jaipur-city-palace',
				{},
				(request) => GET(request, { params: Promise.resolve({ id: 'jaipur-city-palace' }) } as never)
			);

			expect(result.status).toBe(200);
			expect((result.body as { slug: string }).slug).toBe('jaipur-city-palace');
		});

		it('GET /locations/:slug — an unknown slug is a 404, not a 400', async () => {
			const { GET } = await import('@/app/api/locations/[id]/route');
			const result = await expectParity('/api/locations/no-such-place', {}, (request) =>
				GET(request, { params: Promise.resolve({ id: 'no-such-place' }) } as never)
			);

			expect(result.status).toBe(404);
		});
	});

	describe('admin listing', () => {
		it('GET /locations/admin/all — unauthenticated', async () => {
			const { GET } = await import('@/app/api/locations/admin/all/route');
			const result = await expectParity('/api/locations/admin/all', {}, GET);

			expect(result.status).toBe(401);
		});

		it('GET /locations/admin/all — a tourist is refused', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const { token } = await createAuthedUser('tourist');

			const { GET } = await import('@/app/api/locations/admin/all/route');
			const result = await expectParity('/api/locations/admin/all', { token }, GET);

			expect(result.status).toBe(403);
		});

		it('GET /locations/admin/all — an admin sees inactive locations too', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const { token } = await createAuthedUser('admin');
			await seedLocations();

			const { GET } = await import('@/app/api/locations/admin/all/route');
			const result = await expectParity('/api/locations/admin/all', { token }, GET);

			expect(result.status).toBe(200);
			expect(result.body).toHaveProperty('1');
		});
	});

	describe('create', () => {
		it('POST /locations — unauthenticated, before the body is read', async () => {
			const { POST } = await import('@/app/api/locations/route');
			const result = await expectParity(
				'/api/locations',
				{ json: { name: 'Somewhere', city: 'Delhi' } },
				POST
			);

			expect(result.status).toBe(401);
		});

		it('POST /locations — a tourist is refused', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const { token } = await createAuthedUser('tourist');

			const { POST } = await import('@/app/api/locations/route');
			const result = await expectParity(
				'/api/locations',
				{ token, json: { name: 'Somewhere', city: 'Delhi' } },
				POST
			);

			expect(result.status).toBe(403);
		});

		it('POST /locations — JSON body, validation message is identical', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const { token } = await createAuthedUser('admin');

			const { POST } = await import('@/app/api/locations/route');
			const result = await expectParity('/api/locations', { token, json: { city: 'Delhi' } }, POST);

			expect(result.status).toBe(400);
		});

		it('POST /locations — multipart body, validation message is identical', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const { token } = await createAuthedUser('admin');

			const form = new FormData();
			form.append('name', 'X'); // below the 2-character minimum
			form.append('city', 'Delhi');

			const { POST } = await import('@/app/api/locations/route');
			const result = await expectParity(
				'/api/locations',
				{ token, method: 'POST', body: form },
				POST
			);

			expect(result.status).toBe(400);
		});

		it('POST /locations — "false" in a multipart field stays false', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const { token } = await createAuthedUser('admin');

			const form = new FormData();
			form.append('name', 'Amber Fort');
			form.append('city', 'Jaipur');
			form.append('isActive', 'false');
			form.append('isPopular', 'true');
			form.append('image', imageBlob(), 'fort.png');

			const { POST } = await import('@/app/api/locations/route');
			const response = await POST(
				makeRequest('/api/locations', { token, method: 'POST', body: form })
			);
			const result = await normalise(response);

			expect(result.status).toBe(201);

			// z.coerce.boolean() would read the STRING "false" as true. The schema
			// parses the flag by hand precisely to avoid publishing a location the
			// admin deliberately created switched off.
			const body = result.body as { isActive: boolean; isPopular: boolean; image: string };
			expect(body.isActive).toBe(false);
			expect(body.isPopular).toBe(true);

			// The file went to Cloudinary and the URL — not a filename — was stored.
			expect(body.image).toContain('res.cloudinary.com');
			expect(body.image).toContain('locations');
		});

		it('POST /locations — a duplicate slug is a 409', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const { token } = await createAuthedUser('admin');
			await seedLocations();

			const { POST } = await import('@/app/api/locations/route');
			const response = await POST(
				makeRequest('/api/locations', {
					token,
					json: { name: 'Jaipur City Palace', city: 'Jaipur' },
				})
			);

			expect(response.status).toBe(409);
		});
	});

	describe('update and delete', () => {
		it('PATCH /locations/:id — a malformed id is a 400', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const { token } = await createAuthedUser('admin');

			const { PATCH } = await import('@/app/api/locations/[id]/route');
			const result = await expectParity(
				'/api/locations/nope',
				{ token, method: 'PATCH', json: { city: 'Delhi' } },
				(request) => PATCH(request, { params: Promise.resolve({ id: 'nope' }) } as never)
			);

			expect(result.status).toBe(400);
		});

		it('PUT /locations/:id — the admin panel alias behaves as PATCH', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const { token } = await createAuthedUser('admin');
			await seedLocations();

			const location = await LocationDB.findOne({ slug: 'jaipur-city-palace' });
			const id = location!._id.toString();

			const { PUT } = await import('@/app/api/locations/[id]/route');
			const response = await PUT(
				makeRequest(`/api/locations/${id}`, {
					token,
					method: 'PUT',
					json: { name: 'Jaipur Palace' },
				}),
				{ params: Promise.resolve({ id }) } as never
			);
			const result = await normalise(response);

			expect(result.status).toBe(200);
			// Renaming re-derives the slug, so the public URL follows the name.
			expect((result.body as { slug: string }).slug).toBe('jaipur-palace');
		});

		it('PATCH /locations/:id — a tourist is refused', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const { token } = await createAuthedUser('tourist');

			const id = '6a6c20eae45d663d657bb397';
			const { PATCH } = await import('@/app/api/locations/[id]/route');
			const result = await expectParity(
				`/api/locations/${id}`,
				{ token, method: 'PATCH', json: { city: 'Delhi' } },
				(request) => PATCH(request, { params: Promise.resolve({ id }) } as never)
			);

			expect(result.status).toBe(403);
		});

		it('DELETE /locations/:id — unknown id is a 404', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const { token } = await createAuthedUser('admin');

			const id = '6a6c20eae45d663d657bb397';
			const { DELETE } = await import('@/app/api/locations/[id]/route');
			const result = await expectParity(
				`/api/locations/${id}`,
				{ token, method: 'DELETE' },
				(request) => DELETE(request, { params: Promise.resolve({ id }) } as never)
			);

			expect(result.status).toBe(404);
		});

		it('DELETE /locations/:id — soft delete, so the row survives', async () => {
			const { createAuthedUser } = await import('../helpers/auth');
			const { token } = await createAuthedUser('admin');
			await seedLocations();

			const location = await LocationDB.findOne({ slug: 'jaipur-city-palace' });
			const id = location!._id.toString();

			const { DELETE } = await import('@/app/api/locations/[id]/route');
			const response = await DELETE(
				makeRequest(`/api/locations/${id}`, { token, method: 'DELETE' }),
				{ params: Promise.resolve({ id }) } as never
			);

			expect(response.status).toBe(200);

			const after = await LocationDB.findById(id);
			expect(after).not.toBeNull();
			expect(after!.deletedAt).not.toBeNull();
			expect(after!.isActive).toBe(false);
		});
	});

	describe('the /location alias', () => {
		it('serves the same handlers as /locations', async () => {
			const singular = await import('@/app/api/location/route');
			const plural = await import('@/app/api/locations/route');

			expect(singular.GET).toBe(plural.GET);
			expect(singular.POST).toBe(plural.POST);
		});
	});
});
