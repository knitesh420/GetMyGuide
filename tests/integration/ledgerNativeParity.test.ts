import { clearDatabase, connectTestDB, disconnectTestDB } from '../setup/db.setup';
import { expectParity, makeRequest } from '../helpers/parity';

/**
 * Native cashPayment / earning / invoice Route Handlers vs the Express adapter.
 *
 * These three are the money ledger: what a guide is owed, what has been paid,
 * and the documents that record it. The cases below weight towards the rules
 * that protect the audit trail and towards cross-tenant reads — one guide
 * seeing another's earnings would be the worst failure here.
 */

jest.mock('@provider/email', () => ({
	sendPasswordResetOtpEmail: jest.fn(),
	sendRegistrationOtpEmail: jest.fn(),
	sendWelcomeEmail: jest.fn(),
}));

describe('ledger modules — native vs Express parity', () => {
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

	// ---- cash payments -------------------------------------------------------

	it('GET /cash-payment — a guide is refused the admin collection', async () => {
		const { createAuthedUser } = await import('../helpers/auth');
		const { token } = await createAuthedUser('guide');

		const { GET } = await import('@/app/api/cash-payment/route');
		const result = await expectParity('/api/cash-payment', { token }, GET);

		expect(result.status).toBe(403);
	});

	it('GET /cash-payment/my — a guide reads their own records', async () => {
		const { createAuthedUser } = await import('../helpers/auth');
		const { token } = await createAuthedUser('guide');

		const { GET } = await import('@/app/api/cash-payment/my/route');
		const result = await expectParity('/api/cash-payment/my', { token }, GET);

		expect(result.status).toBe(200);
	});

	it('POST /cash-payment — a future payment date is refused', async () => {
		const { createAuthedUser } = await import('../helpers/auth');
		const { token } = await createAuthedUser('admin');

		const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

		const { POST } = await import('@/app/api/cash-payment/route');
		const result = await expectParity(
			'/api/cash-payment',
			{
				token,
				json: {
					guideId: '6a6c20eae45d663d657bb397',
					amount: 500,
					paymentDate: tomorrow,
					paidBy: 'tourist',
				},
			},
			POST
		);

		// Cash is recorded after the fact; a future date is a typo, not an intent.
		expect(result.status).toBe(400);
	});

	it('POST /cash-payment — a zero amount is refused', async () => {
		const { createAuthedUser } = await import('../helpers/auth');
		const { token } = await createAuthedUser('admin');

		const { POST } = await import('@/app/api/cash-payment/route');
		const result = await expectParity(
			'/api/cash-payment',
			{
				token,
				json: {
					guideId: '6a6c20eae45d663d657bb397',
					amount: 0,
					paymentDate: new Date().toISOString(),
					paidBy: 'tourist',
				},
			},
			POST
		);

		// Unlike a refund, a recorded cash payment of zero is meaningless.
		expect(result.status).toBe(400);
	});

	it('PATCH /cash-payment/:id — smuggling an audit field is a 400', async () => {
		const { createAuthedUser } = await import('../helpers/auth');
		const { token } = await createAuthedUser('admin');

		const { PATCH } = await import('@/app/api/cash-payment/[id]/route');

		const id = '6a6c20eae45d663d657bb397';
		const res = await PATCH(
			makeRequest(`/api/cash-payment/${id}`, {
				method: 'PATCH',
				token,
				json: { amount: 100, recordedBy: 'someone-else' },
			}),
			{ params: Promise.resolve({ id }) } as never
		);

		// .strict() — forging the recorder must fail loudly, not silently.
		expect(res.status).toBe(400);
	});

	it('PATCH /cash-payment/:id — an empty patch is refused', async () => {
		const { createAuthedUser } = await import('../helpers/auth');
		const { token } = await createAuthedUser('admin');

		const { PATCH } = await import('@/app/api/cash-payment/[id]/route');

		const id = '6a6c20eae45d663d657bb397';
		const res = await PATCH(
			makeRequest(`/api/cash-payment/${id}`, { method: 'PATCH', token, json: {} }),
			{ params: Promise.resolve({ id }) } as never
		);

		expect(res.status).toBe(400);
	});

	// ---- earnings & payouts --------------------------------------------------

	it('GET /earning — a guide is refused the full ledger', async () => {
		const { createAuthedUser } = await import('../helpers/auth');
		const { token } = await createAuthedUser('guide');

		const { GET } = await import('@/app/api/earning/route');
		const result = await expectParity('/api/earning', { token }, GET);

		expect(result.status).toBe(403);
	});

	it('GET /earning/my — a guideId in the query cannot widen the scope', async () => {
		const { createAuthedUser } = await import('../helpers/auth');
		const { token } = await createAuthedUser('guide');

		const { GET } = await import('@/app/api/earning/my/route');

		// The schema accepts guideId, but /my must ignore it and use the session.
		const result = await expectParity(
			'/api/earning/my?guideId=6a6c20eae45d663d657bb397',
			{ token },
			GET
		);

		expect(result.status).toBe(200);
	});

	it('GET /earning/my/summary — a tourist is refused', async () => {
		const { createAuthedUser } = await import('../helpers/auth');
		const { token } = await createAuthedUser('tourist');

		const { GET } = await import('@/app/api/earning/my/summary/route');
		const result = await expectParity('/api/earning/my/summary', { token }, GET);

		expect(result.status).toBe(403);
	});

	it('GET /earning/payout-queue — a guide is refused', async () => {
		const { createAuthedUser } = await import('../helpers/auth');
		const { token } = await createAuthedUser('guide');

		const { GET } = await import('@/app/api/earning/payout-queue/route');
		const result = await expectParity('/api/earning/payout-queue', { token }, GET);

		expect(result.status).toBe(403);
	});

	it('POST /earning/payouts — a payout without a transfer reference is refused', async () => {
		const { createAuthedUser } = await import('../helpers/auth');
		const { token } = await createAuthedUser('admin');

		const { POST } = await import('@/app/api/earning/payouts/route');
		const result = await expectParity(
			'/api/earning/payouts',
			{
				token,
				json: {
					guideId: '6a6c20eae45d663d657bb397',
					earningIds: ['6a6c20eae45d663d657bb398'],
					method: 'bank_transfer',
				},
			},
			POST
		);

		// This endpoint moves no money — the reference is the only thing tying the
		// ledger entry to the real transfer, so it cannot be optional.
		expect(result.status).toBe(400);
	});

	it('POST /earning/payouts — an empty earning selection is refused', async () => {
		const { createAuthedUser } = await import('../helpers/auth');
		const { token } = await createAuthedUser('admin');

		const { POST } = await import('@/app/api/earning/payouts/route');
		const result = await expectParity(
			'/api/earning/payouts',
			{
				token,
				json: {
					guideId: '6a6c20eae45d663d657bb397',
					earningIds: [],
					method: 'upi',
					reference: 'UTR123456',
				},
			},
			POST
		);

		expect(result.status).toBe(400);
	});

	// ---- invoices ------------------------------------------------------------

	it('GET /invoice — any authenticated role, scoped by the service', async () => {
		const { createAuthedUser } = await import('../helpers/auth');
		const { token } = await createAuthedUser('tourist');

		const { GET } = await import('@/app/api/invoice/route');
		const result = await expectParity('/api/invoice', { token }, GET);

		// No role gate: an admin sees everything, a tourist only their own.
		expect(result.status).toBe(200);
	});

	it('GET /invoice — unauthenticated', async () => {
		const { GET } = await import('@/app/api/invoice/route');
		const result = await expectParity('/api/invoice', {}, GET);

		expect(result.status).toBe(401);
	});

	it('GET /invoice/admin/export — a tourist is refused', async () => {
		const { createAuthedUser } = await import('../helpers/auth');
		const { token } = await createAuthedUser('tourist');

		const { GET } = await import('@/app/api/invoice/admin/export/route');
		const result = await expectParity('/api/invoice/admin/export', { token }, GET);

		expect(result.status).toBe(403);
	});

	it('GET /invoice/admin/export — an unknown format is refused', async () => {
		const { createAuthedUser } = await import('../helpers/auth');
		const { token } = await createAuthedUser('admin');

		const { GET } = await import('@/app/api/invoice/admin/export/route');
		const result = await expectParity(
			'/api/invoice/admin/export?format=pdf',
			{ token },
			GET
		);

		expect(result.status).toBe(400);
	});

	it('POST /invoice/:id/resend — a guide cannot resend an invoice', async () => {
		const { createAuthedUser } = await import('../helpers/auth');
		const { token } = await createAuthedUser('guide');

		const { POST } = await import('@/app/api/invoice/[id]/resend/route');

		const id = '6a6c20eae45d663d657bb397';
		const res = await POST(makeRequest(`/api/invoice/${id}/resend`, { token }), {
			params: Promise.resolve({ id }),
		} as never);

		expect(res.status).toBe(403);
	});
});
