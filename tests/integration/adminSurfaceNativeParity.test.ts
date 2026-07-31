import { clearDatabase, connectTestDB, disconnectTestDB } from '../setup/db.setup';
import { expectParity, makeRequest, normalise } from '../helpers/parity';

/**
 * Native dashboard / report / lead Route Handlers vs the Express adapter.
 */

jest.mock('@provider/email', () => ({
	sendPasswordResetOtpEmail: jest.fn(),
	sendRegistrationOtpEmail: jest.fn(),
	sendWelcomeEmail: jest.fn(),
}));

describe('admin surface — native vs Express parity', () => {
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

	// ---- dashboard -----------------------------------------------------------

	it('GET /dashboard/stats — unauthenticated', async () => {
		const { GET } = await import('@/app/api/dashboard/stats/route');
		const result = await expectParity('/api/dashboard/stats', {}, GET);
		expect(result.status).toBe(401);
	});

	it('GET /dashboard/stats — any authenticated role is allowed', async () => {
		const { createAuthedUser } = await import('../helpers/auth');
		const { token } = await createAuthedUser('tourist');

		const { GET } = await import('@/app/api/dashboard/stats/route');
		const result = await expectParity('/api/dashboard/stats', { token }, GET);

		// No role gate on this route — the shape is chosen server-side instead.
		expect(result.status).toBe(200);
	});

	// ---- report --------------------------------------------------------------

	it('GET /report/overview — a guide is refused', async () => {
		const { createAuthedUser } = await import('../helpers/auth');
		const { token } = await createAuthedUser('guide');

		const { GET } = await import('@/app/api/report/overview/route');
		const result = await expectParity('/api/report/overview', { token }, GET);

		expect(result.status).toBe(403);
	});

	it('GET /report/bookings-trend — an invalid range is a 400', async () => {
		const { createAuthedUser } = await import('../helpers/auth');
		const { token } = await createAuthedUser('admin');

		const { GET } = await import('@/app/api/report/bookings-trend/route');
		const result = await expectParity(
			'/api/report/bookings-trend?range=all-time',
			{ token },
			GET
		);

		expect(result.status).toBe(400);
	});

	it('GET /report/bookings-trend — range defaults when omitted', async () => {
		const { createAuthedUser } = await import('../helpers/auth');
		const { token } = await createAuthedUser('admin');

		const { GET } = await import('@/app/api/report/bookings-trend/route');
		const result = await expectParity('/api/report/bookings-trend', { token }, GET);

		// The schema defaults to 30d; a missing range must not reach the service
		// as undefined.
		expect(result.status).toBe(200);
	});

	it('GET /report/guide-performance — limit above the cap is a 400', async () => {
		const { createAuthedUser } = await import('../helpers/auth');
		const { token } = await createAuthedUser('admin');

		const { GET } = await import('@/app/api/report/guide-performance/route');
		const result = await expectParity(
			'/api/report/guide-performance?limit=5000',
			{ token },
			GET
		);

		expect(result.status).toBe(400);
	});

	it('GET /report/activity-log — paginated for an admin', async () => {
		const { createAuthedUser } = await import('../helpers/auth');
		const { token } = await createAuthedUser('admin');

		const { GET } = await import('@/app/api/report/activity-log/route');
		const result = await expectParity('/api/report/activity-log', { token }, GET);

		expect(result.status).toBe(200);
	});

	// ---- lead ----------------------------------------------------------------

	it('POST /lead/contact — validation reports only the first issue', async () => {
		const { POST } = await import('@/app/api/lead/contact/route');
		const result = await expectParity(
			'/api/lead/contact',
			{ json: { fullName: 'A', email: 'nope' } },
			POST
		);

		expect(result.status).toBe(400);

		// This module is the odd one out: a single message with no 'field: '
		// prefix, because it reports issues[0].message rather than joining.
		const message = (result.body as { message?: string }).message ?? '';
		expect(message).not.toContain(', ');
		expect(message).not.toMatch(/^\w+:/);
	});

	it('GET /lead/contact — a tourist is refused', async () => {
		const { createAuthedUser } = await import('../helpers/auth');
		const { token } = await createAuthedUser('tourist');

		const { GET } = await import('@/app/api/lead/contact/route');
		const result = await expectParity('/api/lead/contact', { token }, GET);

		expect(result.status).toBe(403);
	});

	it('GET /lead/contact/:id — missing inquiry returns a 404 with success:true', async () => {
		const { createAuthedUser } = await import('../helpers/auth');
		const { token } = await createAuthedUser('admin');

		const { GET } = await import('@/app/api/lead/contact/[id]/route');

		const missingId = '6a6c20eae45d663d657bb397';
		const res = await GET(makeRequest(`/api/lead/contact/${missingId}`, { token }), {
			params: Promise.resolve({ id: missingId }),
		} as never);
		const result = await normalise(res);

		expect(result.status).toBe(404);
		// The controller used Respond() rather than throwing, so the body is the
		// success envelope with a message — inconsistent, but it is the contract.
		expect((result.body as { success?: boolean }).success).toBe(true);
	});

	it('PATCH /lead/contact/:id/status — an unknown status is refused', async () => {
		const { createAuthedUser } = await import('../helpers/auth');
		const { token } = await createAuthedUser('admin');

		const { PATCH } = await import('@/app/api/lead/contact/[id]/status/route');

		const id = '6a6c20eae45d663d657bb397';
		const res = await PATCH(
			makeRequest(`/api/lead/contact/${id}/status`, {
				method: 'PATCH',
				token,
				json: { status: 'archived' },
			}),
			{ params: Promise.resolve({ id }) } as never
		);

		expect(res.status).toBe(400);
	});

	it('POST /lead/contact — rate limited on IP alone', async () => {
		const { POST } = await import('@/app/api/lead/contact/route');

		const valid = {
			fullName: 'Some One',
			email: 'someone@example.com',
			phoneNumber: '9999999999',
			nationality: 'Indian',
			category: 'other' as const,
			subject: 'Hello there',
			message: 'This message is definitely long enough.',
		};

		let last = 0;
		for (let i = 0; i < 11; i += 1) {
			// Rotate the email: it must NOT grant a fresh bucket.
			const res = await POST(
				makeRequest('/api/lead/contact', {
					json: { ...valid, email: `someone${i}@example.com` },
				})
			);
			last = res.status;
		}

		expect(last).toBe(429);
	});
});
