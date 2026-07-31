import { clearDatabase, connectTestDB, disconnectTestDB } from '../setup/db.setup';
import { expectParity, makeRequest, normalise } from '../helpers/parity';

/**
 * Native tourist Route Handlers vs the Express adapter.
 * See tests/helpers/parity.ts for why these are differential rather than
 * expectation-based.
 */

jest.mock('@provider/email', () => ({
	sendPasswordResetOtpEmail: jest.fn(),
	sendRegistrationOtpEmail: jest.fn(),
	sendWelcomeEmail: jest.fn(),
}));

describe('tourist routes — native vs Express parity', () => {
	beforeAll(async () => {
		process.env.DATABASE_URL = await connectTestDB();
	});

	afterAll(async () => {
		await disconnectTestDB();
	});

	beforeEach(async () => {
		await clearDatabase();
	});

	it('profile — unauthenticated', async () => {
		const { GET } = await import('@/app/api/tourist/profile/route');
		const result = await expectParity('/api/tourist/profile', {}, GET);
		expect(result.status).toBe(401);
	});

	it('profile — a guide is refused (exact-role, not hierarchical)', async () => {
		const { createAuthedUser } = await import('../helpers/auth');
		const { token } = await createAuthedUser('guide');

		const { GET } = await import('@/app/api/tourist/profile/route');
		const result = await expectParity('/api/tourist/profile', { token }, GET);

		// A guide outranks a tourist numerically; VerifyRole must still refuse.
		expect(result.status).toBe(403);
	});

	// NOTE: token-authed cases deliberately do NOT reset the database between the
	// two halves. Re-seeding mints a new account _id, which invalidates the
	// bearer token and makes the second half fail with "Account not available"
	// — an artefact of the harness, not a real difference. Generated ids are
	// handled by maskVolatile() instead.

	it('profile — a tourist can read their own profile', async () => {
		const { createAuthedUser } = await import('../helpers/auth');
		const { token } = await createAuthedUser('tourist', {
			email: 'tp@example.com',
			name: 'Tourist P',
			phone: '+15550000010',
		});

		const { GET } = await import('@/app/api/tourist/profile/route');
		const result = await expectParity('/api/tourist/profile', { token }, GET);

		expect(result.status).toBe(200);
	});

	it('profile PUT — validation failure', async () => {
		const { createAuthedUser } = await import('../helpers/auth');
		const { token } = await createAuthedUser('tourist', {
			email: 'tv@example.com',
			name: 'Tourist V',
			phone: '+15550000011',
		});

		const { PUT } = await import('@/app/api/tourist/profile/route');
		const result = await expectParity(
			'/api/tourist/profile',
			{ method: 'PUT', token, json: { nationality: '' } },
			PUT
		);

		expect(result.status).toBe(400);
	});

	it('dashboard — unauthenticated', async () => {
		const { GET } = await import('@/app/api/tourist/dashboard/route');
		const result = await expectParity('/api/tourist/dashboard', {}, GET);
		expect(result.status).toBe(401);
	});

	it('admin/all — a tourist is refused', async () => {
		const { createAuthedUser } = await import('../helpers/auth');
		const { token } = await createAuthedUser('tourist');

		const { GET } = await import('@/app/api/tourist/admin/all/route');
		const result = await expectParity('/api/tourist/admin/all', { token }, GET);

		expect(result.status).toBe(403);
	});

	it('admin/all — an admin gets an array under data, not a spread object', async () => {
		const { createAuthedUser } = await import('../helpers/auth');
		const { token } = await createAuthedUser('admin');

		const { GET } = await import('@/app/api/tourist/admin/all/route');
		const res = await GET(makeRequest('/api/tourist/admin/all', { token }));
		const result = await normalise(res);

		expect(result.status).toBe(200);
		// Respond() spreads its payload, so a bare array would arrive as
		// {0:…,1:…}. The controller wraps it under `data` to prevent that.
		expect(Array.isArray((result.body as { data?: unknown }).data)).toBe(true);
	});
});
