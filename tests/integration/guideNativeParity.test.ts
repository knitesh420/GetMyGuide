import { clearDatabase, connectTestDB, disconnectTestDB } from '../setup/db.setup';
import { expectParity, makeRequest, normalise } from '../helpers/parity';

/**
 * Native guide Route Handlers vs the Express adapter.
 *
 * Guide is the largest module (32 endpoints) and the one with the most ways to
 * get authorisation subtly wrong: public routes, guide-only routes, admin-only
 * routes, and private KYC documents that must never become publicly
 * addressable. The cases below concentrate on those boundaries rather than on
 * happy-path payloads, because a boundary that silently widens is the failure
 * that matters here.
 */

jest.mock('@provider/email', () => ({
	sendPasswordResetOtpEmail: jest.fn(),
	sendRegistrationOtpEmail: jest.fn(),
	sendWelcomeEmail: jest.fn(),
}));

describe('guide routes — native vs Express parity', () => {
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

	// ---- Public routes -------------------------------------------------------

	it('GET /guide/all — public, no session required', async () => {
		const { GET } = await import('@/app/api/guide/all/route');
		const result = await expectParity('/api/guide/all', {}, GET);
		expect(result.status).toBe(200);
	});

	it('GET /guide/all-guides — alias returns the same payload', async () => {
		const { GET: viaAll } = await import('@/app/api/guide/all/route');
		const { GET: viaAlias } = await import('@/app/api/guide/all-guides/route');

		const a = await normalise(await viaAll(makeRequest('/api/guide/all', {})));
		const b = await normalise(await viaAlias(makeRequest('/api/guide/all-guides', {})));

		expect(b).toEqual(a);
	});

	it('GET /guide/:id — invalid id is a 400, not a 500', async () => {
		const { GET } = await import('@/app/api/guide/[id]/route');

		const native = await normalise(
			await GET(makeRequest('/api/guide/not-an-object-id', {}), {
				params: Promise.resolve({ id: 'not-an-object-id' }),
			} as never)
		);

		expect(native.status).toBe(400);
	});

	// ---- Guide-only routes ---------------------------------------------------

	it('GET /guide/profile — unauthenticated', async () => {
		const { GET } = await import('@/app/api/guide/profile/route');
		const result = await expectParity('/api/guide/profile', {}, GET);
		expect(result.status).toBe(401);
	});

	it('PUT /guide/pricing — a tourist is refused', async () => {
		const { createAuthedUser } = await import('../helpers/auth');
		const { token } = await createAuthedUser('tourist');

		const { PUT } = await import('@/app/api/guide/pricing/route');
		const result = await expectParity(
			'/api/guide/pricing',
			{ method: 'PUT', token, json: { halfDay: 10, fullDay: 20 } },
			PUT
		);

		expect(result.status).toBe(403);
	});

	it('PUT /guide/pricing — a zero full-day rate is rejected', async () => {
		const { createAuthedUser } = await import('../helpers/auth');
		const { token } = await createAuthedUser('guide');

		const { PUT } = await import('@/app/api/guide/pricing/route');
		const result = await expectParity(
			'/api/guide/pricing',
			{ method: 'PUT', token, json: { halfDay: 0, fullDay: 0 } },
			PUT
		);

		// Direct bookings are priced off fullDay, so zero would mean free trips.
		expect(result.status).toBe(400);
	});

	it('PUT /guide/bank-details — neither account nor UPI is rejected', async () => {
		const { createAuthedUser } = await import('../helpers/auth');
		const { token } = await createAuthedUser('guide');

		const { PUT } = await import('@/app/api/guide/bank-details/route');
		const result = await expectParity(
			'/api/guide/bank-details',
			{ method: 'PUT', token, json: { accountHolderName: 'Someone' } },
			PUT
		);

		// A payout has to be sendable somewhere.
		expect(result.status).toBe(400);
	});

	it('PATCH /guide/profile — unknown keys are rejected, not ignored', async () => {
		const { createAuthedUser } = await import('../helpers/auth');
		const { token } = await createAuthedUser('guide');

		const { PATCH } = await import('@/app/api/guide/profile/route');
		const result = await expectParity(
			'/api/guide/profile',
			{ method: 'PATCH', token, json: { city: 'Jaipur', registrationCompleted: true } },
			PATCH
		);

		// .strict() — a client smuggling in a privileged field must get a 400
		// rather than believing the edit went through.
		expect(result.status).toBe(400);
	});

	it('PUT /guide/availability — non-array is rejected', async () => {
		const { createAuthedUser } = await import('../helpers/auth');
		const { token } = await createAuthedUser('guide');

		const { PUT } = await import('@/app/api/guide/availability/route');
		const result = await expectParity(
			'/api/guide/availability',
			{ method: 'PUT', token, json: { unavailableDates: 'nope' } },
			PUT
		);

		expect(result.status).toBe(400);
	});

	// ---- Admin-only routes ---------------------------------------------------

	it('GET /guide/admin/all — a guide is refused', async () => {
		const { createAuthedUser } = await import('../helpers/auth');
		const { token } = await createAuthedUser('guide');

		const { GET } = await import('@/app/api/guide/admin/all/route');
		const result = await expectParity('/api/guide/admin/all', { token }, GET);

		expect(result.status).toBe(403);
	});

	it('GET /guide/admin/pending-approvals — a guide is refused', async () => {
		const { createAuthedUser } = await import('../helpers/auth');
		const { token } = await createAuthedUser('guide');

		const { GET } = await import('@/app/api/guide/admin/pending-approvals/route');
		const result = await expectParity('/api/guide/admin/pending-approvals', { token }, GET);

		expect(result.status).toBe(403);
	});

	it('GET /guide/contact-inquiries — a guide is refused', async () => {
		const { createAuthedUser } = await import('../helpers/auth');
		const { token } = await createAuthedUser('guide');

		const { GET } = await import('@/app/api/guide/contact-inquiries/route');
		const result = await expectParity('/api/guide/contact-inquiries', { token }, GET);

		expect(result.status).toBe(403);
	});

	// ---- Private KYC documents ----------------------------------------------

	it("GET /guide/profile/documents/:type/view — a tourist cannot read a guide's document", async () => {
		const { createAuthedUser } = await import('../helpers/auth');
		const { token } = await createAuthedUser('tourist');

		const { GET } = await import('@/app/api/guide/profile/documents/[type]/view/route');

		const res = await GET(makeRequest('/api/guide/profile/documents/aadhaar/view', { token }), {
			params: Promise.resolve({ type: 'aadhaar' }),
		} as never);

		expect(res.status).toBe(403);
	});

	it('GET /guide/profile/documents/:type/view — an unknown document type is a 400', async () => {
		const { createAuthedUser } = await import('../helpers/auth');
		const { token } = await createAuthedUser('guide');

		const { GET } = await import('@/app/api/guide/profile/documents/[type]/view/route');

		const res = await GET(makeRequest('/api/guide/profile/documents/passport/view', { token }), {
			params: Promise.resolve({ type: 'passport' }),
		} as never);

		expect(res.status).toBe(400);
	});

	// ---- Public contact inquiry ----------------------------------------------

	it('POST /guide/contact-inquiry — validation failure', async () => {
		const { POST } = await import('@/app/api/guide/contact-inquiry/route');
		const result = await expectParity(
			'/api/guide/contact-inquiry',
			{ json: { fullName: 'A', message: 'too short' } },
			POST
		);

		expect(result.status).toBe(400);
	});

	it('POST /guide/contact-inquiry — rate limited on IP alone', async () => {
		const { POST } = await import('@/app/api/guide/contact-inquiry/route');

		const valid = {
			fullName: 'Some One',
			phoneNumber: '9999999999',
			email: 'someone@example.com',
			nationality: 'Indian',
			category: 'other' as const,
			subject: 'Hello',
			message: 'This message is definitely long enough.',
		};

		let last = 0;
		// Limit is 10/hour. The 11th must be refused. Rotating the body must not
		// grant a fresh bucket — the key is the IP only.
		for (let i = 0; i < 11; i += 1) {
			const res = await POST(
				makeRequest('/api/guide/contact-inquiry', {
					json: { ...valid, subject: `Hello ${i}` },
				})
			);
			last = res.status;
		}

		expect(last).toBe(429);
	});
});
