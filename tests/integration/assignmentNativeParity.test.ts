import { clearDatabase, connectTestDB, disconnectTestDB } from '../setup/db.setup';
import { expectParity, makeRequest, normalise } from '../helpers/parity';

/**
 * Native assignment Route Handlers vs the Express adapter.
 *
 * The rules worth pinning here are the two `.refine()` guards — an override and
 * a decline each REQUIRE a written reason — and the role split, where admins
 * allocate and guides respond. Both are audit-trail properties: losing them
 * would allow unexplained reassignments that look fine until someone asks why a
 * booking moved.
 */

jest.mock('@provider/email', () => ({
	sendPasswordResetOtpEmail: jest.fn(),
	sendRegistrationOtpEmail: jest.fn(),
	sendWelcomeEmail: jest.fn(),
}));

describe('assignment routes — native vs Express parity', () => {
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

	it('GET /assignment — unauthenticated', async () => {
		const { GET } = await import('@/app/api/assignment/route');
		const result = await expectParity('/api/assignment', {}, GET);
		expect(result.status).toBe(401);
	});

	it('GET /assignment — a guide is refused the admin list', async () => {
		const { createAuthedUser } = await import('../helpers/auth');
		const { token } = await createAuthedUser('guide');

		const { GET } = await import('@/app/api/assignment/route');
		const result = await expectParity('/api/assignment', { token }, GET);

		expect(result.status).toBe(403);
	});

	it('GET /assignment/guides — a guide is refused', async () => {
		const { createAuthedUser } = await import('../helpers/auth');
		const { token } = await createAuthedUser('guide');

		const { GET } = await import('@/app/api/assignment/guides/route');
		const result = await expectParity('/api/assignment/guides', { token }, GET);

		expect(result.status).toBe(403);
	});

	it('GET /assignment/my — a tourist is refused', async () => {
		const { createAuthedUser } = await import('../helpers/auth');
		const { token } = await createAuthedUser('tourist');

		const { GET } = await import('@/app/api/assignment/my/route');
		const result = await expectParity('/api/assignment/my', { token }, GET);

		expect(result.status).toBe(403);
	});

	it('GET /assignment/my — a guide gets their own queue', async () => {
		const { createAuthedUser } = await import('../helpers/auth');
		const { token } = await createAuthedUser('guide');

		const { GET } = await import('@/app/api/assignment/my/route');
		const result = await expectParity('/api/assignment/my', { token }, GET);

		expect(result.status).toBe(200);
	});

	it('POST /assignment — override without a reason is refused', async () => {
		const { createAuthedUser } = await import('../helpers/auth');
		const { token } = await createAuthedUser('admin');

		const { POST } = await import('@/app/api/assignment/route');
		const result = await expectParity(
			'/api/assignment',
			{
				token,
				json: { bookingId: 'b1', guideId: 'g1', override: true },
			},
			POST
		);

		// An availability conflict may only be overridden with a written reason.
		expect(result.status).toBe(400);
	});

	it('POST /assignment — missing ids are refused', async () => {
		const { createAuthedUser } = await import('../helpers/auth');
		const { token } = await createAuthedUser('admin');

		const { POST } = await import('@/app/api/assignment/route');
		const result = await expectParity('/api/assignment', { token, json: {} }, POST);

		expect(result.status).toBe(400);
	});

	it('PATCH /assignment/:id/respond — decline without a reason is refused', async () => {
		const { createAuthedUser } = await import('../helpers/auth');
		const { token } = await createAuthedUser('guide');

		const { PATCH } = await import('@/app/api/assignment/[id]/respond/route');

		const id = '6a6c20eae45d663d657bb397';
		const res = await PATCH(
			makeRequest(`/api/assignment/${id}/respond`, {
				method: 'PATCH',
				token,
				json: { action: 'decline' },
			}),
			{ params: Promise.resolve({ id }) } as never
		);

		expect(res.status).toBe(400);
	});

	it('PATCH /assignment/:id/respond — an unknown action is refused', async () => {
		const { createAuthedUser } = await import('../helpers/auth');
		const { token } = await createAuthedUser('guide');

		const { PATCH } = await import('@/app/api/assignment/[id]/respond/route');

		const id = '6a6c20eae45d663d657bb397';
		const res = await PATCH(
			makeRequest(`/api/assignment/${id}/respond`, {
				method: 'PATCH',
				token,
				json: { action: 'maybe' },
			}),
			{ params: Promise.resolve({ id }) } as never
		);

		expect(res.status).toBe(400);
	});

	it('POST /assignment/:id/reassign — a guide cannot reassign', async () => {
		const { createAuthedUser } = await import('../helpers/auth');
		const { token } = await createAuthedUser('guide');

		const { POST } = await import('@/app/api/assignment/[id]/reassign/route');

		const id = '6a6c20eae45d663d657bb397';
		const res = await POST(
			makeRequest(`/api/assignment/${id}/reassign`, {
				token,
				json: { newGuideId: 'g2' },
			}),
			{ params: Promise.resolve({ id }) } as never
		);

		expect(res.status).toBe(403);
	});

	it('GET /assignment/:id — an invalid id is a 400', async () => {
		const { createAuthedUser } = await import('../helpers/auth');
		const { token } = await createAuthedUser('guide');

		const { GET } = await import('@/app/api/assignment/[id]/route');

		const res = await GET(makeRequest('/api/assignment/nope', { token }), {
			params: Promise.resolve({ id: 'nope' }),
		} as never);
		const result = await normalise(res);

		expect(result.status).toBe(400);
	});
});
